package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"net/http"
	"strings"

	"bookings-api/clients"
	"bookings-api/controllers"
	"bookings-api/middleware"
	"bookings-api/repositories"
	"bookings-api/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/go-sql-driver/mysql"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Conectar a MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://root:root@mongodb:27017/bookings_db?authSource=admin"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(context.Background())

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}
	log.Println("Connected to MongoDB")

	db := client.Database("bookings_db")
	collection := db.Collection("bookings")

	// Conectar a MySQL (finance_db)
	mysqlDSN := os.Getenv("MYSQL_DSN")
	if mysqlDSN == "" {
		mysqlDSN = "root:root@tcp(mysql:3306)/finance_db?parseTime=true"
	}

	mysqlDB, err := sql.Open("mysql", mysqlDSN)
	if err != nil {
		log.Fatal("Failed to open MySQL connection:", err)
	}
	defer mysqlDB.Close()

	if err := mysqlDB.PingContext(ctx); err != nil {
		log.Fatal("Failed to ping MySQL:", err)
	}
	log.Println("Connected to MySQL (finance_db)")

	// Inicializar cliente RabbitMQ
	rmqClient, err := clients.NewRabbitMQClient()
	if err != nil {
		log.Fatal("Failed to connect to RabbitMQ:", err)
	}
	defer rmqClient.Close()
	log.Println("Connected to RabbitMQ")

	// Inicializar cliente Mercado Pago (opcional — si no hay credenciales, los pagos online no estarán disponibles)
	var mpClient services.MPClient
	if mpConcrete, err := clients.NewMercadoPagoClient(); err != nil {
		log.Printf("Warning: MP client not initialized: %v (online payments will be unavailable)", err)
	} else {
		mpClient = mpConcrete
		log.Println("Mercado Pago client initialized")
	}

	// Inicializar capas
	bookingRepo := repositories.NewBookingRepository(collection)
	financeRepo := repositories.NewFinanceRepository(mysqlDB)
	statsRepo := repositories.NewStatsRepository(collection)
	usersClient := repositories.NewUsersClient()
	apartmentsClient := repositories.NewApartmentsClient()
	webhookSecret := os.Getenv("MP_WEBHOOK_SECRET")
	bookingService := services.NewBookingService(bookingRepo, usersClient, apartmentsClient, rmqClient, financeRepo, mpClient)
	configService := services.NewConfigService(financeRepo)
	bookingController := controllers.NewBookingController(bookingService, webhookSecret)
	configController := controllers.NewConfigController(configService, financeRepo, statsRepo)

	// Scheduler diario: marca reservas vencidas como "concluida" cada medianoche UTC
	go runDailyScheduler(bookingService)
	// Scheduler cada 5 minutos: cancela reservas "pendiente_pago" sin pagar tras 30 min
	go runPendingPaymentScheduler(bookingService)

	// Configurar router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	jwtSecret := os.Getenv("JWT_SECRET")

	// Rutas
	api := router.Group("/api/v1")
	{
		// ── Rutas PÚBLICAS (sin autenticación) ──────────────────────────────
		api.POST("/bookings", bookingController.CreateBooking)           // reserva pública
		api.GET("/bookings/:id", bookingController.GetBookingByID)       // consulta estado reserva
		api.GET("/bookings/by-contact", bookingController.GetBookingByContact)
		api.POST("/bookings/availability-batch", bookingController.CheckAvailabilityBatch)
		api.POST("/bookings/:id/cancel-guest", bookingController.CancelBookingByGuest)
		api.POST("/bookings/:id/checkout", bookingController.CreateCheckout)
		api.POST("/bookings/:id/verify-payment", bookingController.VerifyPayment)
		api.POST("/payments/webhook", bookingController.HandlePaymentWebhook)
		api.POST("/payments/confirm", bookingController.ConfirmPaymentFromBrowser)

		frontendBase := strings.TrimRight(os.Getenv("FRONTEND_BASE_URL"), "/")
		if frontendBase == "" {
			frontendBase = "http://localhost:3000"
		}
		api.GET("/payments/return", func(c *gin.Context) {
			target := frontendBase + "/reserva/pago/resultado?" + c.Request.URL.RawQuery
			c.Redirect(http.StatusFound, target)
		})

		// ── Rutas ADMIN (requieren JWT válido con user_type == "admin") ─────
		admin := api.Group("/", middleware.AdminRequired(jwtSecret))
		{
			admin.GET("/bookings", bookingController.GetAllBookings)
			admin.GET("/bookings/user/:user_id", bookingController.GetBookingsByUserID)
			admin.PATCH("/bookings/:id", bookingController.UpdateBooking)
			admin.PATCH("/bookings/:id/complete", bookingController.CompleteBooking)
			admin.PATCH("/bookings/:id/cancel", bookingController.CancelBooking)
			admin.PATCH("/bookings/:id/paid", bookingController.MarkAsPaid)
			admin.DELETE("/bookings/:id", bookingController.DeleteBooking)
			admin.POST("/bookings/mark-expired-as-completed", bookingController.MarkExpiredBookingsAsCompleted)

			admin.GET("/config/dollar-rate", configController.GetDollarRate)
			admin.PUT("/config/dollar-rate", configController.SetDollarRate)
			admin.GET("/config/dollar-rate/history", configController.GetDollarRateHistory)

			admin.GET("/stats/finance", configController.GetFinanceStats)
			admin.GET("/stats/payments", configController.GetAllPayments)
			admin.GET("/stats/market-rates", configController.GetMarketRates)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	// Graceful shutdown
	go func() {
		log.Printf("Bookings API starting on port %s", port)
		if err := router.Run(":" + port); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
}

// runPendingPaymentScheduler cancela cada 5 minutos las reservas "pendiente_pago" sin pagar tras 30 min.
func runPendingPaymentScheduler(svc services.BookingService) {
	for {
		time.Sleep(5 * time.Minute)
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		count, err := svc.CancelExpiredPendingBookings(ctx)
		cancel()
		if err != nil {
			log.Printf("[scheduler] error cancelling pending bookings: %v", err)
		} else if count > 0 {
			log.Printf("[scheduler] cancelled %d expired pending bookings", count)
		}
	}
}

// runDailyScheduler corre MarkExpiredBookingsAsCompleted cada medianoche UTC.
func runDailyScheduler(svc services.BookingService) {
	for {
		now := time.Now().UTC()
		next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 5, 0, 0, time.UTC)
		time.Sleep(time.Until(next))

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		count, err := svc.MarkExpiredBookingsAsCompleted(ctx)
		cancel()
		if err != nil {
			log.Printf("[scheduler] error marking expired bookings: %v", err)
		} else {
			log.Printf("[scheduler] marked %d expired bookings as completed", count)
		}
	}
}
