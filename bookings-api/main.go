package main

import (
	"context"
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

	// Verificar conexión
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}
	log.Println("Connected to MongoDB")

	// Obtener colección
	db := client.Database("bookings_db")
	collection := db.Collection("bookings")

	// Inicializar cliente RabbitMQ
	rmqClient, err := clients.NewRabbitMQClient()
	if err != nil {
		log.Fatal("Failed to connect to RabbitMQ:", err)
	}
	defer rmqClient.Close()
	log.Println("Connected to RabbitMQ")

	// Inicializar capas
	bookingRepo := repositories.NewBookingRepository(collection)
	usersClient := repositories.NewUsersClient()
	apartmentsClient := repositories.NewApartmentsClient()
	bookingService := services.NewBookingService(bookingRepo, usersClient, apartmentsClient, rmqClient)
	bookingController := controllers.NewBookingController(bookingService)

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
		api.GET("/bookings/:id", bookingController.GetBookingByID)
		api.GET("/bookings/user/:user_id", bookingController.GetBookingsByUserID)
		api.PATCH("/bookings/:id", bookingController.UpdateBooking)
		api.DELETE("/bookings/:id", bookingController.DeleteBooking)
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

	// Esperar señal de terminación
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
}

