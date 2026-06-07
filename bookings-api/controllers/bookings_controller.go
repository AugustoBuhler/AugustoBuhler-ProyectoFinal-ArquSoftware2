package controllers

import (
	"log"
	"net/http"
	"strconv"

	"bookings-api/domain"
	"bookings-api/services"

	"github.com/gin-gonic/gin"
)

type markAsPaidRequest struct {
	DollarRate float64 `json:"dollar_rate" binding:"required,gt=0"`
}

type BookingController struct {
	bookingService services.BookingService
}

func NewBookingController(bookingService services.BookingService) *BookingController {
	return &BookingController{
		bookingService: bookingService,
	}
}

func (c *BookingController) CreateBooking(ctx *gin.Context) {
	var req domain.CreateBookingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// isAdmin se determina por el JWT validado en el middleware AdminRequired.
	// Si el contexto tiene admin_user_id, la request viene de un admin autenticado.
	isAdmin := false
	var adminUserID *int64
	if id, exists := ctx.Get("admin_user_id"); exists {
		isAdmin = true
		v := id.(int64)
		adminUserID = &v
	}

	booking, err := c.bookingService.CreateBooking(ctx.Request.Context(), req, isAdmin, adminUserID)
	if err != nil {
		if err.Error() == "apartment is not available for the requested date range" ||
			err.Error() == "apartment is not available" ||
			err.Error() == "user not found" ||
			err.Error() == "apartment not found" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, booking.ToBookingResponse())
}

func (c *BookingController) GetBookingByID(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	booking, err := c.bookingService.GetBookingByID(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, booking.ToBookingResponse())
}

func (c *BookingController) GetBookingsByUserID(ctx *gin.Context) {
	userIDParam := ctx.Param("user_id")
	userID, err := strconv.ParseInt(userIDParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	bookings, err := c.bookingService.GetBookingsByUserID(ctx.Request.Context(), userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convertir bookings a BookingResponse con fechas formateadas
	bookingResponses := make([]*domain.BookingResponse, len(bookings))
	for i, b := range bookings {
		bookingResponses[i] = b.ToBookingResponse()
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data":  bookingResponses,
		"total": len(bookingResponses),
	})
}

// GetAllBookings retorna todas las reservas (para admin)
func (c *BookingController) GetAllBookings(ctx *gin.Context) {
	// Filtros opcionales
	filters := make(map[string]interface{})
	
	if apartmentID := ctx.Query("apartment_id"); apartmentID != "" {
		id, err := strconv.ParseInt(apartmentID, 10, 64)
		if err == nil {
			filters["apartment_id"] = id
		}
	}
	if status := ctx.Query("status"); status != "" {
		filters["status"] = status
	}
	if userID := ctx.Query("user_id"); userID != "" {
		id, err := strconv.ParseInt(userID, 10, 64)
		if err == nil {
			filters["user_id"] = id
		}
	}

	// Paginación
	page := 1
	size := 100
	if p := ctx.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if s := ctx.Query("size"); s != "" {
		if parsed, err := strconv.Atoi(s); err == nil && parsed > 0 && parsed <= 100 {
			size = parsed
		}
	}

	bookings, total, err := c.bookingService.GetAllBookings(ctx.Request.Context(), filters, page, size)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convertir bookings a BookingResponse con fechas formateadas
	bookingResponses := make([]*domain.BookingResponse, len(bookings))
	for i, b := range bookings {
		bookingResponses[i] = b.ToBookingResponse()
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data":       bookingResponses,
		"total":      total,
		"page":       page,
		"size":       size,
		"total_pages": (int(total) + size - 1) / size,
	})
}

func (c *BookingController) UpdateBooking(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	var req domain.UpdateBookingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	booking, err := c.bookingService.UpdateBooking(ctx.Request.Context(), id, req)
	if err != nil {
		if err.Error() == "booking not found" ||
			err.Error() == "apartment is not available for the requested date range" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, booking.ToBookingResponse())
}

func (c *BookingController) DeleteBooking(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	err = c.bookingService.DeleteBooking(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "booking deleted successfully"})
}

// CompleteBooking marca una reserva como concluida si su fecha de check-out ya pasó
func (c *BookingController) CompleteBooking(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	booking, err := c.bookingService.CompleteBooking(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		// Errores de validación (no está confirmada, fecha no pasó)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, booking.ToBookingResponse())
}

// CancelBooking marca una reserva como cancelada (solo para admin)
func (c *BookingController) CancelBooking(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	booking, err := c.bookingService.CancelBooking(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "booking not found"})
			return
		}
		// Errores de validación (ya cancelada, ya concluida)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, booking.ToBookingResponse())
}

// MarkAsPaid marca una reserva como "pagado" usando el tipo de cambio configurado
func (c *BookingController) MarkAsPaid(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	var req markAsPaidRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "dollar_rate is required and must be positive"})
		return
	}

	booking, err := c.bookingService.MarkAsPaid(ctx.Request.Context(), id, req.DollarRate)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, booking.ToBookingResponse())
}

// CreateCheckout genera una preferencia de pago en Mercado Pago para la seña de la reserva
func (c *BookingController) CreateCheckout(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	checkout, err := c.bookingService.CreateCheckout(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "booking not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, checkout)
}

// HandlePaymentWebhook procesa las notificaciones de pago de Mercado Pago
func (c *BookingController) HandlePaymentWebhook(ctx *gin.Context) {
	// MP puede enviar el id como query param (IPN legacy) o como JSON body (webhooks)
	if topic := ctx.Query("topic"); topic == "payment" {
		paymentID := ctx.Query("id")
		if paymentID != "" {
			if err := c.bookingService.ConfirmPaymentFromWebhook(ctx.Request.Context(), paymentID); err != nil {
				log.Printf("[webhook] error processing payment %s: %v", paymentID, err)
			}
		}
		ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
		return
	}

	var notification map[string]interface{}
	if err := ctx.ShouldBindJSON(&notification); err != nil {
		ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
		return
	}

	notifType, _ := notification["type"].(string)
	if notifType != "payment" {
		ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
		return
	}

	data, _ := notification["data"].(map[string]interface{})
	if data == nil {
		ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
		return
	}

	var paymentID string
	switch v := data["id"].(type) {
	case string:
		paymentID = v
	case float64:
		paymentID = strconv.FormatInt(int64(v), 10)
	}

	if paymentID != "" {
		if err := c.bookingService.ConfirmPaymentFromWebhook(ctx.Request.Context(), paymentID); err != nil {
			log.Printf("[webhook] error processing payment %s: %v", paymentID, err)
		}
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
}

// VerifyPayment consulta MP directamente para confirmar si hay un pago aprobado para la reserva.
// El frontend lo llama cuando el usuario pagó pero la pestaña de MP no redirigió automáticamente.
func (c *BookingController) VerifyPayment(ctx *gin.Context) {
	id, err := strconv.ParseInt(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid booking id"})
		return
	}

	if err := c.bookingService.VerifyPayment(ctx.Request.Context(), id); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "payment confirmed"})
}

// MarkExpiredBookingsAsCompleted marca automáticamente todas las reservas vencidas como concluidas
func (c *BookingController) MarkExpiredBookingsAsCompleted(ctx *gin.Context) {
	completedCount, err := c.bookingService.MarkExpiredBookingsAsCompleted(ctx.Request.Context())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":         "expired bookings marked as completed",
		"completed_count": completedCount,
	})
}

