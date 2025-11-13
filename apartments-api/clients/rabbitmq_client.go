package clients

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/streadway/amqp"
)

type RabbitMQClient interface {
	PublishApartmentEvent(action string, apartmentID int64) error
	Close() error
}

type rabbitMQClient struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewRabbitMQClient() (RabbitMQClient, error) {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://admin:admin@rabbitmq:5672/"
	}

	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declarar exchange de tipo topic
	exchangeName := "apartments.events"
	err = ch.ExchangeDeclare(
		exchangeName, // name
		"topic",      // type
		true,         // durable
		false,        // auto-deleted
		false,        // internal
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	log.Printf("Connected to RabbitMQ and declared exchange: %s", exchangeName)

	return &rabbitMQClient{
		conn:    conn,
		channel: ch,
	}, nil
}

func (c *rabbitMQClient) PublishApartmentEvent(action string, apartmentID int64) error {
	event := map[string]interface{}{
		"action":      action,
		"id":          apartmentID,
		"timestamp":   fmt.Sprintf("%d", apartmentID), // Simplificado, en producción usar time.Now()
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	err = c.channel.Publish(
		"apartments.events", // exchange
		"apartments.events", // routing key
		false,               // mandatory
		false,               // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})

	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	log.Printf("Published event: action=%s, apartment_id=%d", action, apartmentID)
	return nil
}

func (c *rabbitMQClient) Close() error {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

