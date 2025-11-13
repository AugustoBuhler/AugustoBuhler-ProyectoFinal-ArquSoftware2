package consumers

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"search-api/repositories"

	"github.com/streadway/amqp"
)

type RabbitMQConsumer interface {
	Start() error
	Stop() error
}

type rabbitMQConsumer struct {
	conn            *amqp.Connection
	channel         *amqp.Channel
	apartmentsClient repositories.ApartmentsClient
	solrRepo        repositories.SolrRepository
}

func NewRabbitMQConsumer(
	apartmentsClient repositories.ApartmentsClient,
	solrRepo repositories.SolrRepository,
) (RabbitMQConsumer, error) {
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

	// Declarar exchange
	exchangeName := "apartments.events"
	err = ch.ExchangeDeclare(
		exchangeName,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	// Declarar cola
	queueName := "search-api-apartments-events"
	_, err = ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	// Bind cola al exchange
	err = ch.QueueBind(
		queueName,
		"apartments.events",
		exchangeName,
		false,
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to bind queue: %w", err)
	}

	return &rabbitMQConsumer{
		conn:             conn,
		channel:          ch,
		apartmentsClient: apartmentsClient,
		solrRepo:         solrRepo,
	}, nil
}

func (c *rabbitMQConsumer) Start() error {
	msgs, err := c.channel.Consume(
		"search-api-apartments-events",
		"",    // consumer
		false, // auto-ack (manual ack)
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	log.Println("RabbitMQ consumer started, waiting for messages...")

	go func() {
		for msg := range msgs {
			c.handleMessage(msg)
		}
	}()

	return nil
}

func (c *rabbitMQConsumer) handleMessage(msg amqp.Delivery) {
	var event map[string]interface{}
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("Error unmarshaling event: %v", err)
		msg.Nack(false, false)
		return
	}

	action, _ := event["action"].(string)
	apartmentID, ok := event["id"].(float64)
	if !ok {
		log.Printf("Invalid apartment ID in event")
		msg.Nack(false, false)
		return
	}

	id := int64(apartmentID)

	log.Printf("Received event: action=%s, apartment_id=%d", action, id)

	switch action {
	case "created", "updated":
		// Obtener datos completos del apartamento desde apartments-api
		apt, err := c.apartmentsClient.GetApartmentByID(id)
		if err != nil {
			log.Printf("Error fetching apartment %d: %v", id, err)
			msg.Nack(false, true) // Reintentar
			return
		}

		// Indexar/actualizar en Solr
		if err := c.solrRepo.IndexApartment(apt); err != nil {
			log.Printf("Error indexing apartment %d: %v", id, err)
			msg.Nack(false, true) // Reintentar
			return
		}

		log.Printf("Successfully indexed apartment %d", id)

	case "deleted":
		// Eliminar de Solr
		if err := c.solrRepo.DeleteApartment(id); err != nil {
			log.Printf("Error deleting apartment %d from Solr: %v", id, err)
			msg.Nack(false, true) // Reintentar
			return
		}

		log.Printf("Successfully deleted apartment %d from index", id)
	}

	msg.Ack(false)
}

func (c *rabbitMQConsumer) Stop() error {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

