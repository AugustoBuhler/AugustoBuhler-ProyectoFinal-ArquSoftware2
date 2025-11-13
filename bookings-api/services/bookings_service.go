package services

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"bookings-api/domain"
	"bookings-api/repositories"
)

type BookingService interface {
	CreateBooking(ctx context.Context, req domain.CreateBookingRequest, isAdmin bool, adminUserID *int64) (*domain.Booking, error)
	GetBookingByID(ctx context.Context, id int64) (*domain.Booking, error)
	GetBookingsByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error)
	UpdateBooking(ctx context.Context, id int64, req domain.UpdateBookingRequest) (*domain.Booking, error)
	DeleteBooking(ctx context.Context, id int64) error
}

type bookingService struct {
	bookingRepo    repositories.BookingRepository
	usersClient    repositories.UsersClient
	apartmentsClient repositories.ApartmentsClient
	rmqClient      RabbitMQClient
}

type RabbitMQClient interface {
	PublishBookingEvent(action string, bookingID int64) error
}

func NewBookingService(
	bookingRepo repositories.BookingRepository,
	usersClient repositories.UsersClient,
	apartmentsClient repositories.ApartmentsClient,
	rmqClient RabbitMQClient,
) BookingService {
	return &bookingService{
		bookingRepo:      bookingRepo,
		usersClient:      usersClient,
		apartmentsClient: apartmentsClient,
		rmqClient:        rmqClient,
	}
}

// CreateBooking implementa cálculo concurrente usando goroutines, channels y WaitGroup
func (s *bookingService) CreateBooking(ctx context.Context, req domain.CreateBookingRequest, isAdmin bool, adminUserID *int64) (*domain.Booking, error) {
	// Parsear fechas
	checkIn, err := time.Parse("2006-01-02", req.CheckIn)
	if err != nil {
		return nil, fmt.Errorf("invalid check_in date format: %w", err)
	}

	checkOut, err := time.Parse("2006-01-02", req.CheckOut)
	if err != nil {
		return nil, fmt.Errorf("invalid check_out date format: %w", err)
	}

	if checkOut.Before(checkIn) || checkOut.Equal(checkIn) {
		return nil, errors.New("check_out must be after check_in")
	}

	// CÁLCULO CONCURRENTE usando goroutines, channels y WaitGroup
	var wg sync.WaitGroup
	errChan := make(chan error, 2)
	resultChan := make(chan interface{}, 2)

	var apartment *repositories.ApartmentInfo

	// Goroutine 1: Validar y obtener información del apartamento
	wg.Add(1)
	go func() {
		defer wg.Done()
		apt, err := s.apartmentsClient.GetApartmentByID(req.ApartmentID)
		if err != nil {
			errChan <- fmt.Errorf("apartment validation failed: %w", err)
			return
		}
		if !apt.Available {
			errChan <- errors.New("apartment is not available")
			return
		}
		if apt.MaxGuests < req.Guests {
			errChan <- fmt.Errorf("apartment max capacity (%d) is less than requested guests (%d)", apt.MaxGuests, req.Guests)
			return
		}
		resultChan <- apt
	}()

	// Goroutine 2: Validar usuario (si se proporciona user_id)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if req.UserID != nil {
			exists, err := s.usersClient.GetUserByID(*req.UserID)
			if err != nil {
				errChan <- fmt.Errorf("user validation failed: %w", err)
				return
			}
			if !exists {
				errChan <- errors.New("user not found")
				return
			}
			resultChan <- exists
		} else {
			// Si no hay user_id, es una reserva pública (válida)
			resultChan <- true
		}
	}()

	// Esperar a que todas las goroutines terminen
	wg.Wait()
	close(errChan)
	close(resultChan)

	// Verificar errores
	for err := range errChan {
		if err != nil {
			return nil, err
		}
	}

	// Procesar resultados de las goroutines
	for result := range resultChan {
		switch v := result.(type) {
		case *repositories.ApartmentInfo:
			apartment = v
		case bool:
			// userValid - ya validado en la goroutine
			_ = v
		}
	}

	if apartment == nil {
		return nil, errors.New("failed to get apartment information")
	}

	// Calcular precio total (usando información del apartamento obtenido concurrentemente)
	days := int(checkOut.Sub(checkIn).Hours() / 24)
	if days < 1 {
		days = 1
	}
	totalPrice := float64(days) * apartment.PricePerNight

	// Validar disponibilidad atómica (antes de crear la reserva)
	available, err := s.bookingRepo.CheckAvailability(ctx, req.ApartmentID, checkIn, checkOut, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to check availability: %w", err)
	}
	if !available {
		return nil, errors.New("apartment is not available for the requested date range")
	}

	// Validar datos del huésped
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid guest information: %w", err)
	}

	// Asignar DNI como ID del huésped
	guestInfo := req.GuestInfo
	guestInfo.ID = req.GuestInfo.DNI

	// Crear la reserva
	booking := &domain.Booking{
		ApartmentID:    req.ApartmentID,
		UserID:         req.UserID,
		GuestInfo:      guestInfo,
		CheckIn:        checkIn,
		CheckOut:       checkOut,
		Guests:         req.Guests,
		TotalPrice:     totalPrice,
		PaymentMethod:  req.PaymentMethod,
		Status:         "confirmed",
		CreatedByAdmin: isAdmin,
		AdminUserID:    adminUserID,
	}

	err = s.bookingRepo.Create(ctx, booking)
	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishBookingEvent("created", booking.ID); err != nil {
		// Log error pero no fallar la creación
	}

	return booking, nil
}

func (s *bookingService) GetBookingByID(ctx context.Context, id int64) (*domain.Booking, error) {
	return s.bookingRepo.GetByID(ctx, id)
}

func (s *bookingService) GetBookingsByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error) {
	return s.bookingRepo.GetByUserID(ctx, userID)
}

func (s *bookingService) UpdateBooking(ctx context.Context, id int64, req domain.UpdateBookingRequest) (*domain.Booking, error) {
	// Obtener reserva existente
	booking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	checkIn := booking.CheckIn
	checkOut := booking.CheckOut

	// Actualizar campos si se proporcionan
	if req.CheckIn != nil {
		parsed, err := time.Parse("2006-01-02", *req.CheckIn)
		if err != nil {
			return nil, fmt.Errorf("invalid check_in date format: %w", err)
		}
		checkIn = parsed
	}

	if req.CheckOut != nil {
		parsed, err := time.Parse("2006-01-02", *req.CheckOut)
		if err != nil {
			return nil, fmt.Errorf("invalid check_out date format: %w", err)
		}
		checkOut = parsed
	}

	if req.Guests != nil {
		booking.Guests = *req.Guests
	}

	if req.Status != nil {
		booking.Status = *req.Status
	}

	if req.PaymentMethod != nil {
		booking.PaymentMethod = *req.PaymentMethod
	}

	// Si cambian las fechas, validar disponibilidad
	if req.CheckIn != nil || req.CheckOut != nil {
		available, err := s.bookingRepo.CheckAvailability(ctx, booking.ApartmentID, checkIn, checkOut, &booking.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to check availability: %w", err)
		}
		if !available {
			return nil, errors.New("apartment is not available for the requested date range")
		}
		booking.CheckIn = checkIn
		booking.CheckOut = checkOut

		// Recalcular precio si cambian las fechas
		apartment, err := s.apartmentsClient.GetApartmentByID(booking.ApartmentID)
		if err == nil {
			days := int(checkOut.Sub(checkIn).Hours() / 24)
			if days < 1 {
				days = 1
			}
			booking.TotalPrice = float64(days) * apartment.PricePerNight
		}
	}

	err = s.bookingRepo.Update(ctx, id, booking)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishBookingEvent("updated", booking.ID); err != nil {
		// Log error pero no fallar la actualización
	}

	return booking, nil
}

func (s *bookingService) DeleteBooking(ctx context.Context, id int64) error {
	// Verificar que existe
	_, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.bookingRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishBookingEvent("deleted", id); err != nil {
		// Log error pero no fallar la eliminación
	}

	return nil
}

