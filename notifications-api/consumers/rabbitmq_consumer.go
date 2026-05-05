package consumers

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"notifications-api/clients"

	"github.com/streadway/amqp"
)

type BookingConsumer interface {
	Start() error
	Stop() error
}

type bookingConsumer struct {
	conn           *amqp.Connection
	channel        *amqp.Channel
	bookingsClient clients.BookingsClient
	emailClient    clients.EmailClient
}

func NewBookingConsumer(bookingsClient clients.BookingsClient, emailClient clients.EmailClient) (BookingConsumer, error) {
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

	if err := ch.ExchangeDeclare(
		"bookings.events",
		"topic",
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	if _, err := ch.QueueDeclare(
		"notifications-api-bookings-events",
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	if err := ch.QueueBind(
		"notifications-api-bookings-events",
		"bookings.events",
		"bookings.events",
		false,
		nil,
	); err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to bind queue: %w", err)
	}

	return &bookingConsumer{
		conn:           conn,
		channel:        ch,
		bookingsClient: bookingsClient,
		emailClient:    emailClient,
	}, nil
}

func (c *bookingConsumer) Start() error {
	msgs, err := c.channel.Consume(
		"notifications-api-bookings-events",
		"",
		false, // manual ack
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	go func() {
		for msg := range msgs {
			c.handleMessage(msg)
		}
	}()

	return nil
}

func (c *bookingConsumer) handleMessage(msg amqp.Delivery) {
	var event map[string]interface{}
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("[notifications] error parsing event: %v", err)
		msg.Nack(false, false)
		return
	}

	action, _ := event["action"].(string)
	bookingIDFloat, ok := event["id"].(float64)
	if !ok {
		log.Printf("[notifications] invalid booking ID in event")
		msg.Nack(false, false)
		return
	}
	bookingID := int64(bookingIDFloat)

	log.Printf("[notifications] received event: action=%s, booking_id=%d", action, bookingID)

	if action != "created" {
		msg.Ack(false)
		return
	}

	booking, err := c.bookingsClient.GetBookingByID(bookingID)
	if err != nil {
		log.Printf("[notifications] error fetching booking %d: %v — retrying", bookingID, err)
		msg.Nack(false, true)
		return
	}

	if err := c.emailClient.SendConfirmation(booking); err != nil {
		log.Printf("[notifications] error sending email for booking %d: %v", bookingID, err)
		// No reintentamos el email para evitar duplicados — solo logueamos
	} else {
		log.Printf("[notifications] confirmation email sent for booking %d to %s", bookingID, booking.GuestEmail)
	}

	msg.Ack(false)
}

func (c *bookingConsumer) Stop() error {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
