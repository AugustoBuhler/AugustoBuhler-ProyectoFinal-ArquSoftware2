package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"apartments-api/clients"
	"apartments-api/controllers"
	"apartments-api/repositories"
	"apartments-api/services"

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
		mongoURI = "mongodb://root:root@mongodb:27017/apartments_db?authSource=admin"
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
	db := client.Database("apartments_db")
	collection := db.Collection("apartments")

	// Inicializar cliente RabbitMQ
	rmqClient, err := clients.NewRabbitMQClient()
	if err != nil {
		log.Fatal("Failed to connect to RabbitMQ:", err)
	}
	defer rmqClient.Close()
	log.Println("Connected to RabbitMQ")

	// Inicializar capas
	aptRepo := repositories.NewApartmentRepository(collection)
	usersClient := repositories.NewUsersClient()
	aptService := services.NewApartmentService(aptRepo, usersClient, rmqClient)
	aptController := controllers.NewApartmentController(aptService)

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
		api.POST("/apartments", aptController.CreateApartment)
		api.GET("/apartments/:id", aptController.GetApartmentByID)
		api.GET("/apartments", aptController.GetAllApartments)
		api.PATCH("/apartments/:id", aptController.UpdateApartment)
		api.DELETE("/apartments/:id", aptController.DeleteApartment)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	// Graceful shutdown
	go func() {
		log.Printf("Apartments API starting on port %s", port)
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

