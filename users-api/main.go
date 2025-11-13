package main

import (
	"log"
	"os"

	"users-api/controllers"
	"users-api/repositories"
	"users-api/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Conectar a MySQL
	dsn := os.Getenv("DB_USER") + ":" + os.Getenv("DB_PASSWORD") + 
		"@tcp(" + os.Getenv("DB_HOST") + ":" + os.Getenv("DB_PORT") + ")/" + 
		os.Getenv("DB_NAME") + "?charset=utf8mb4&parseTime=True&loc=Local"

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate
	db.AutoMigrate(&repositories.User{})

	// Inicializar capas
	userRepo := repositories.NewUserRepository(db)
	userService := services.NewUserService(userRepo, os.Getenv("JWT_SECRET"))
	userController := controllers.NewUserController(userService)

	// Configurar router
	router := gin.Default()
	
	// Middleware CORS (para desarrollo)
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
		api.POST("/users", userController.CreateUser)
		api.POST("/users/login", userController.Login)
		api.GET("/users/:id", userController.GetUserByID)
		api.GET("/internal/users/:id", userController.GetUserByIDInternal)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Users API starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

