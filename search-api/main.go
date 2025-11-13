package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"search-api/consumers"
	"search-api/controllers"
	"search-api/repositories"
	"search-api/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Inicializar repositorios y cachés
	solrRepo := repositories.NewSolrRepository()
	localCache := repositories.NewLocalCache()
	memcachedCache := repositories.NewMemcachedCache()
	apartmentsClient := repositories.NewApartmentsClient()

	// Inicializar servicio
	searchService := services.NewSearchService(solrRepo, localCache, memcachedCache, apartmentsClient)
	searchController := controllers.NewSearchController(searchService)

	// Inicializar consumidor RabbitMQ
	rmqConsumer, err := consumers.NewRabbitMQConsumer(apartmentsClient, solrRepo)
	if err != nil {
		log.Fatal("Failed to create RabbitMQ consumer:", err)
	}
	defer rmqConsumer.Stop()

	// Iniciar consumidor en background
	if err := rmqConsumer.Start(); err != nil {
		log.Fatal("Failed to start RabbitMQ consumer:", err)
	}
	log.Println("RabbitMQ consumer started")

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
		api.GET("/search", searchController.Search)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	// Graceful shutdown
	go func() {
		log.Printf("Search API starting on port %s", port)
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

