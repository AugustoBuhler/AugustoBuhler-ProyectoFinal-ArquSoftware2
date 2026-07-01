package consumers

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"notifications-api/clients"

	"github.com/streadway/amqp"
)

const maxRetries = 3

// retryTracker lleva la cuenta de intentos por mensaje (clave = hash del body)
// El hash es estable entre reencolas aunque el delivery tag cambie.
var retryTracker sync.Map

func retryKey(body []byte) string {
	h := md5.Sum(body)
	return fmt.Sprintf("%x", h)
}

func getRetryCount(body []byte) int {
	key := retryKey(body)
	if v, ok := retryTracker.Load(key); ok {
		return v.(int)
	}
	return 0
}

func incrementRetry(body []byte) int {
	key := retryKey(body)
	count := getRetryCount(body) + 1
	retryTracker.Store(key, count)
	return count
}

func clearRetry(body []byte) {
	retryTracker.Delete(retryKey(body))
}

// isPermanentError detecta errores 4xx de Resend que no tienen sentido reintentar.
// Ejemplos: email inválido (422), restricción de dominio en free tier (403).
func isPermanentError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Resend API error 4")
}

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

	// Obtener booking (con retry si bookings-api falla temporalmente)
	booking, err := c.bookingsClient.GetBookingByID(bookingID)
	if err != nil {
		retries := incrementRetry(msg.Body)
		if retries <= maxRetries {
			log.Printf("[notifications] error fetching booking %d (intento %d/%d): %v — reencolar", bookingID, retries, maxRetries, err)
			time.Sleep(time.Duration(retries*5) * time.Second) // backoff: 5s, 10s, 15s
			msg.Nack(false, true)
		} else {
			log.Printf("[notifications] booking %d: se agotaron los %d reintentos al fetchear — descartando", bookingID, maxRetries)
			clearRetry(msg.Body)
			msg.Ack(false)
		}
		return
	}

	// Enviar email según el tipo de evento
	var sendErr error
	switch action {
	case "created", "payment_confirmed":
		sendErr = c.emailClient.SendConfirmation(booking)
		if sendErr == nil {
			log.Printf("[notifications] email enviado para booking %d a %s (action=%s)", bookingID, booking.GuestEmail, action)
		}
	case "guest_cancelled":
		sendErr = c.emailClient.SendCancellationToAdmin(booking)
		if sendErr == nil {
			log.Printf("[notifications] email de cancelación enviado al admin para booking %d", bookingID)
		}
	default:
		msg.Ack(false)
		return
	}

	if sendErr != nil {
		if isPermanentError(sendErr) {
			// Error 4xx de Resend: no tiene sentido reintentar (email inválido, restricción de plan, etc.)
			log.Printf("[notifications] error permanente en booking %d: %v — descartando sin reintentar", bookingID, sendErr)
			clearRetry(msg.Body)
			msg.Ack(false)
			return
		}

		// Error transitorio (red, Resend caído): reintentar con backoff
		retries := incrementRetry(msg.Body)
		if retries <= maxRetries {
			log.Printf("[notifications] error enviando email para booking %d (intento %d/%d): %v — reencolar en %ds",
				bookingID, retries, maxRetries, sendErr, retries*10)
			time.Sleep(time.Duration(retries*10) * time.Second) // backoff: 10s, 20s, 30s
			msg.Nack(false, true)
		} else {
			log.Printf("[notifications] booking %d: se agotaron los %d reintentos de email — descartando", bookingID, maxRetries)
			clearRetry(msg.Body)
			msg.Ack(false)
		}
		return
	}

	clearRetry(msg.Body)
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
