package controllers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"bookings-api/domain"
	"bookings-api/repositories"
	"bookings-api/services"

	"github.com/gin-gonic/gin"
)

// ── Cache en memoria para cotizaciones de mercado (TTL 5 minutos) ─────────────
type marketRateEntry struct {
	Casa               string  `json:"casa"`
	Nombre             string  `json:"nombre"`
	Compra             float64 `json:"compra"`
	Venta              float64 `json:"venta"`
	FechaActualizacion string  `json:"fechaActualizacion"`
}

var (
	marketCache     []marketRateEntry
	marketCacheTime time.Time
	marketCacheMu   sync.RWMutex
	marketCacheTTL  = 5 * time.Minute
)

type ConfigController struct {
	configService services.ConfigService
	financeRepo   repositories.FinanceRepository
	statsRepo     repositories.StatsRepository
}

func NewConfigController(configService services.ConfigService, financeRepo repositories.FinanceRepository, statsRepo repositories.StatsRepository) *ConfigController {
	return &ConfigController{configService: configService, financeRepo: financeRepo, statsRepo: statsRepo}
}

func (c *ConfigController) GetDollarRate(ctx *gin.Context) {
	rate, updatedAt, err := c.configService.GetDollarRate(ctx.Request.Context())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, domain.DollarRateResponse{Rate: rate, UpdatedAt: updatedAt})
}

func (c *ConfigController) SetDollarRate(ctx *gin.Context) {
	var req domain.SetDollarRateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "rate must be a positive number"})
		return
	}
	if err := c.configService.SetDollarRate(ctx.Request.Context(), req.Rate); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	rate, updatedAt, _ := c.configService.GetDollarRate(ctx.Request.Context())
	ctx.JSON(http.StatusOK, domain.DollarRateResponse{Rate: rate, UpdatedAt: updatedAt})
}

func (c *ConfigController) GetDollarRateHistory(ctx *gin.Context) {
	history, err := c.configService.GetDollarRateHistory(ctx.Request.Context())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if history == nil {
		history = []repositories.DollarRateRecord{}
	}
	ctx.JSON(http.StatusOK, gin.H{"data": history})
}

func (c *ConfigController) GetAllPayments(ctx *gin.Context) {
	payments, err := c.statsRepo.GetAllPaidBookings(ctx.Request.Context())
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if payments == nil {
		payments = []repositories.PaymentRecord{}
	}
	ctx.JSON(http.StatusOK, gin.H{"data": payments})
}

func (c *ConfigController) GetFinanceStats(ctx *gin.Context) {
	period := ctx.DefaultQuery("period", "monthly")
	if period != "weekly" && period != "monthly" && period != "annual" {
		period = "monthly"
	}

	stats, err := c.statsRepo.GetFinanceStats(ctx.Request.Context(), period)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rate, _, _ := c.configService.GetDollarRate(ctx.Request.Context())
	stats.DollarRate = rate

	ctx.JSON(http.StatusOK, stats)
}

// GetMarketRates obtiene las cotizaciones del dólar en tiempo real desde dolarapi.com.
// Cachea el resultado 5 minutos para no saturar la API externa.
func (c *ConfigController) GetMarketRates(ctx *gin.Context) {
	marketCacheMu.RLock()
	if marketCache != nil && time.Since(marketCacheTime) < marketCacheTTL {
		data := marketCache
		marketCacheMu.RUnlock()
		ctx.JSON(http.StatusOK, gin.H{"data": data})
		return
	}
	marketCacheMu.RUnlock()

	resp, err := http.Get("https://dolarapi.com/v1/dolares")
	if err != nil {
		ctx.JSON(http.StatusServiceUnavailable, gin.H{"error": "no se pudo obtener cotizaciones del mercado"})
		return
	}
	defer resp.Body.Close()

	var rates []marketRateEntry
	if err := json.NewDecoder(resp.Body).Decode(&rates); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "error al parsear cotizaciones"})
		return
	}

	marketCacheMu.Lock()
	marketCache = rates
	marketCacheTime = time.Now()
	marketCacheMu.Unlock()

	ctx.JSON(http.StatusOK, gin.H{"data": rates})
}
