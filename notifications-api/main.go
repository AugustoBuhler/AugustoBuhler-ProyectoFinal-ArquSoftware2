package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"notifications-api/clients"
	"notifications-api/consumers"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	bookingsClient := clients.NewBookingsClient()
	emailClient := clients.NewEmailClient()

	consumer, err := consumers.NewBookingConsumer(bookingsClient, emailClient)
	if err != nil {
		log.Fatal("Failed to create RabbitMQ consumer:", err)
	}
	defer consumer.Stop()

	if err := consumer.Start(); err != nil {
		log.Fatal("Failed to start RabbitMQ consumer:", err)
	}

	log.Println("Notifications service started — waiting for booking events...")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down notifications service...")
}
