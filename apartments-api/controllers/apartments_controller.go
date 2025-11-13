package controllers

import (
	"net/http"
	"strconv"

	"apartments-api/domain"
	"apartments-api/services"

	"github.com/gin-gonic/gin"
)

type ApartmentController struct {
	aptService services.ApartmentService
}

func NewApartmentController(aptService services.ApartmentService) *ApartmentController {
	return &ApartmentController{
		aptService: aptService,
	}
}

func (c *ApartmentController) CreateApartment(ctx *gin.Context) {
	var req domain.CreateApartmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apartment, err := c.aptService.CreateApartment(ctx.Request.Context(), req)
	if err != nil {
		if err.Error() == "owner not found" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "owner not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, apartment)
}

func (c *ApartmentController) GetApartmentByID(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid apartment id"})
		return
	}

	apartment, err := c.aptService.GetApartmentByID(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "apartment not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "apartment not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, apartment)
}

func (c *ApartmentController) GetAllApartments(ctx *gin.Context) {
	// Filtros
	filters := make(map[string]interface{})
	
	if city := ctx.Query("city"); city != "" {
		filters["city"] = city
	}
	if available := ctx.Query("available"); available != "" {
		avail, _ := strconv.ParseBool(available)
		filters["available"] = avail
	}
	if maxGuests := ctx.Query("max_guests"); maxGuests != "" {
		guests, _ := strconv.Atoi(maxGuests)
		filters["max_guests"] = guests
	}

	// Paginación
	page := 1
	size := 10
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

	apartments, total, err := c.aptService.GetAllApartments(ctx.Request.Context(), filters, page, size)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data":       apartments,
		"total":      total,
		"page":       page,
		"size":       size,
	})
}

func (c *ApartmentController) UpdateApartment(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid apartment id"})
		return
	}

	var req domain.UpdateApartmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apartment, err := c.aptService.UpdateApartment(ctx.Request.Context(), id, req)
	if err != nil {
		if err.Error() == "apartment not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "apartment not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, apartment)
}

func (c *ApartmentController) DeleteApartment(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid apartment id"})
		return
	}

	err = c.aptService.DeleteApartment(ctx.Request.Context(), id)
	if err != nil {
		if err.Error() == "apartment not found" {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "apartment not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "apartment deleted successfully"})
}

