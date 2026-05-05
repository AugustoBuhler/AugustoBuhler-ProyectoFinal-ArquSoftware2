package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bookings-api/clients"
	"bookings-api/controllers"
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

	// Inicializar capas
	bookingRepo := repositories.NewBookingRepository(collection)
	financeRepo := repositories.NewFinanceRepository(mysqlDB)
	statsRepo := repositories.NewStatsRepository(collection)
	usersClient := repositories.NewUsersClient()
	apartmentsClient := repositories.NewApartmentsClient()
	bookingService := services.NewBookingService(bookingRepo, usersClient, apartmentsClient, rmqClient, financeRepo)
	configService := services.NewConfigService(financeRepo)
	bookingController := controllers.NewBookingController(bookingService)
	configController := controllers.NewConfigController(configService, financeRepo, statsRepo)

	// Scheduler diario: marca reservas vencidas como "concluida" cada medianoche UTC
	go runDailyScheduler(bookingService)

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

	// Rutas
	api := router.Group("/api/v1")
	{
		api.POST("/bookings", bookingController.CreateBooking)
		api.GET("/bookings", bookingController.GetAllBookings)
		api.GET("/bookings/:id", bookingController.GetBookingByID)
		api.GET("/bookings/user/:user_id", bookingController.GetBookingsByUserID)
		api.PATCH("/bookings/:id", bookingController.UpdateBooking)
		api.PATCH("/bookings/:id/complete", bookingController.CompleteBooking)
		api.PATCH("/bookings/:id/cancel", bookingController.CancelBooking)
		api.POST("/bookings/mark-expired-as-completed", bookingController.MarkExpiredBookingsAsCompleted)
		api.PATCH("/bookings/:id/paid", bookingController.MarkAsPaid)
		api.DELETE("/bookings/:id", bookingController.DeleteBooking)

		// Tipo de cambio del dólar
		api.GET("/config/dollar-rate", configController.GetDollarRate)
		api.PUT("/config/dollar-rate", configController.SetDollarRate)
		api.GET("/config/dollar-rate/history", configController.GetDollarRateHistory)

		// Pagos y estadísticas financieras
		api.GET("/stats/finance", configController.GetFinanceStats)
		api.GET("/stats/payments", configController.GetAllPayments)
		api.GET("/stats/market-rates", configController.GetMarketRates)
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
