package controllers

import (
	"net/http"
	"strconv"

	"bookings-api/domain"
	"bookings-api/services"

	"github.com/gin-gonic/gin"
)

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

	// Obtener información del usuario desde JWT (si está presente)
	// Por ahora, si viene user_id en el request, es un admin creando para un usuario
	// Si no viene user_id, es una reserva pública (sin login)
	isAdmin := false
	var adminUserID *int64
	// TODO: Extraer de JWT si está disponible
	// Por ahora, si viene user_id en el request, asumimos que es admin
	if req.UserID != nil {
		isAdmin = true
		adminUserID = req.UserID
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

	ctx.JSON(http.StatusCreated, booking)
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

	ctx.JSON(http.StatusOK, booking)
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

	ctx.JSON(http.StatusOK, gin.H{
		"data":  bookings,
		"total": len(bookings),
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

	ctx.JSON(http.StatusOK, booking)
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

