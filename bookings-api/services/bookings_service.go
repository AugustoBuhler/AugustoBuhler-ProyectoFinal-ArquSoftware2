package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sync"
	"time"

	"bookings-api/domain"
	"bookings-api/repositories"
)

// calculateDeposit calcula la seña anticipada (30% del total, redondeado a 2 decimales)
func calculateDeposit(totalPrice float64) float64 {
	return math.Round(totalPrice*0.30*100) / 100
}

type BookingService interface {
	CreateBooking(ctx context.Context, req domain.CreateBookingRequest, isAdmin bool, adminUserID *int64) (*domain.Booking, error)
	GetBookingByID(ctx context.Context, id int64) (*domain.Booking, error)
	GetBookingsByUserID(ctx context.Context, userID int64) ([]*domain.Booking, error)
	GetAllBookings(ctx context.Context, filters map[string]interface{}, page, size int) ([]*domain.Booking, int64, error)
	UpdateBooking(ctx context.Context, id int64, req domain.UpdateBookingRequest) (*domain.Booking, error)
	DeleteBooking(ctx context.Context, id int64) error
	CompleteBooking(ctx context.Context, id int64) (*domain.Booking, error)
	CancelBooking(ctx context.Context, id int64) (*domain.Booking, error)
	MarkAsPaid(ctx context.Context, id int64, dollarRate float64) (*domain.Booking, error)
	MarkExpiredBookingsAsCompleted(ctx context.Context) (int, error)
}

type bookingService struct {
	bookingRepo      repositories.BookingRepository
	usersClient      repositories.UsersClient
	apartmentsClient repositories.ApartmentsClient
	rmqClient        RabbitMQClient
	financeRepo      repositories.FinanceRepository
}

type RabbitMQClient interface {
	PublishBookingEvent(action string, bookingID int64) error
}

func NewBookingService(
	bookingRepo repositories.BookingRepository,
	usersClient repositories.UsersClient,
	apartmentsClient repositories.ApartmentsClient,
	rmqClient RabbitMQClient,
	financeRepo repositories.FinanceRepository,
) BookingService {
	return &bookingService{
		bookingRepo:      bookingRepo,
		usersClient:      usersClient,
		apartmentsClient: apartmentsClient,
		rmqClient:        rmqClient,
		financeRepo:      financeRepo,
	}
}

// CreateBooking implementa cálculo concurrente usando goroutines, channels y WaitGroup
func (s *bookingService) CreateBooking(ctx context.Context, req domain.CreateBookingRequest, isAdmin bool, adminUserID *int64) (*domain.Booking, error) {
	// Parsear fechas en UTC para evitar problemas de zona horaria
	// CRÍTICO: time.Parse con layout "2006-01-02" crea fechas en UTC, pero para estar seguros,
	// parseamos y luego construimos una nueva fecha explícitamente en UTC usando time.Date
	parsedCheckIn, err := time.Parse("2006-01-02", req.CheckIn)
	if err != nil {
		return nil, fmt.Errorf("invalid check_in date format: %w", err)
	}
	// Construir fecha explícitamente en UTC usando los componentes extraídos
	// Esto asegura que la fecha se almacene correctamente en MongoDB
	var checkIn time.Time
	checkIn = time.Date(parsedCheckIn.Year(), parsedCheckIn.Month(), parsedCheckIn.Day(), 0, 0, 0, 0, time.UTC)

	parsedCheckOut, err := time.Parse("2006-01-02", req.CheckOut)
	if err != nil {
		return nil, fmt.Errorf("invalid check_out date format: %w", err)
	}
	// Construir fecha explícitamente en UTC usando los componentes extraídos
	var checkOut time.Time
	checkOut = time.Date(parsedCheckOut.Year(), parsedCheckOut.Month(), parsedCheckOut.Day(), 0, 0, 0, 0, time.UTC)

	if checkOut.Before(checkIn) || checkOut.Equal(checkIn) {
		return nil, errors.New("check_out must be after check_in")
	}

	// check_in no puede ser en el pasado (comparar solo fechas, sin hora)
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if checkIn.Before(today) {
		return nil, errors.New("check_in cannot be in the past")
	}

	// Determinar apartment_id antes de las goroutines
	var apartmentID int64
	var apartment *repositories.ApartmentInfo

	if req.ApartmentID != nil {
		// Si viene apartment_id, usar ese (admin)
		apartmentID = *req.ApartmentID
	} else if req.ApartmentType != "" {
		// Si viene apartment_type, buscar TODOS los apartamentos del tipo y verificar disponibilidad uno por uno
		allApartments, err := s.apartmentsClient.GetAllApartmentsByType(req.ApartmentType)
		if err != nil {
			return nil, fmt.Errorf("failed to get apartments of type %s: %w", req.ApartmentType, err)
		}
		if len(allApartments) == 0 {
			return nil, fmt.Errorf("no apartments of type %s found", req.ApartmentType)
		}

		// Iterar sobre TODOS los apartamentos del tipo y verificar disponibilidad real
		// hasta encontrar uno disponible para las fechas solicitadas
		var foundAvailable *repositories.ApartmentInfo
		for _, apt := range allApartments {
			// Verificar que el apartamento tenga capacidad suficiente
			if apt.MaxGuests < req.Guests {
				// Saltar este apartamento, no tiene capacidad suficiente
				continue
			}

			// Verificar disponibilidad REAL usando el repository (verifica contra bookings reales en MongoDB)
			// Esta verificación consulta MongoDB directamente para ver si hay reservas solapadas
			available, err := s.bookingRepo.CheckAvailability(ctx, apt.ID, checkIn, checkOut, nil)
			if err != nil {
				// Si hay error al verificar, continuar con el siguiente apartamento
				// NO asignar este apartamento si hay error
				continue
			}

			// CRÍTICO: Solo asignar si available == true (sin reservas solapadas)
			// Si available == false, significa que hay reservas que se solapan con las fechas solicitadas
			if available {
				// ¡Encontramos uno disponible y con capacidad suficiente!
				// Asignar este apartamento y salir del bucle
				foundAvailable = apt
				// Salir inmediatamente, ya tenemos uno disponible
				break
			}
			// Si available == false, este apartamento NO está disponible
			// Continuar con el siguiente apartamento en el bucle
		}

		if foundAvailable == nil {
			// No encontramos ningún apartamento disponible del tipo solicitado
			// Retornar error descriptivo
			return nil, fmt.Errorf("no apartments of type %s available for the requested date range (checked %d apartments)", req.ApartmentType, len(allApartments))
		}

		apartmentID = foundAvailable.ID
		apartment = foundAvailable // Ya tenemos el apartamento disponible verificado, no necesitamos buscarlo de nuevo
	} else {
		return nil, errors.New("apartment_id or apartment_type is required")
	}

	// CÁLCULO CONCURRENTE usando goroutines, channels y WaitGroup
	var wg sync.WaitGroup
	errChan := make(chan error, 2)
	resultChan := make(chan interface{}, 2)

	// Goroutine 1: Validar y obtener información del apartamento (si no se obtuvo por tipo)
	if apartment == nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			apt, err := s.apartmentsClient.GetApartmentByID(apartmentID)
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
	} else {
		// Si ya tenemos el apartment por tipo, validar capacidad antes de continuar
		if apartment.MaxGuests < req.Guests {
			return nil, fmt.Errorf("apartment max capacity (%d) is less than requested guests (%d)", apartment.MaxGuests, req.Guests)
		}
	}

	// Goroutine 2: Validar usuario (si se proporciona user_id)
	// NOTA: user_id es opcional. Solo se valida si se proporciona.
	// Si no viene user_id, es una reserva pública (sin login) y es válida.
	wg.Add(1)
	go func() {
		defer wg.Done()
		if req.UserID != nil {
			// Solo validar si se proporciona user_id (admin creando para un usuario específico)
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
			// Si no hay user_id, es una reserva pública (válida) - no requiere login
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
	if apartment == nil {
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
	} else {
		// Si ya tenemos el apartment, solo procesar user validation
		for result := range resultChan {
			switch v := result.(type) {
			case bool:
				// userValid - ya validado en la goroutine
				_ = v
			case *repositories.ApartmentInfo:
				// Ya tenemos el apartment, ignorar
				_ = v
			}
		}
	}

	// Calcular precio total (usando información del apartamento obtenido concurrentemente)
	days := int(checkOut.Sub(checkIn).Hours() / 24)
	if days < 1 {
		days = 1
	}
	totalPrice := float64(days) * apartment.PricePerNight

	// Validar disponibilidad atómica (antes de crear la reserva)
	// Esta verificación previene condiciones de carrera donde otro proceso pudo haber reservado
	// el apartamento justo antes de que creemos esta reserva
	// Si estamos buscando por tipo, intentar hasta encontrar uno disponible o agotar las opciones
	maxRetries := 5 // Máximo de intentos para encontrar un apartamento disponible del tipo
	retryCount := 0

	for {
		available, err := s.bookingRepo.CheckAvailability(ctx, apartmentID, checkIn, checkOut, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to check availability: %w", err)
		}

		// Si está disponible, salir del bucle de reintentos
		if available {
			break
		}

		// Si no está disponible Y buscamos por tipo, intentar buscar otro apartamento del mismo tipo
		if !available && req.ApartmentType != "" {
			// Guardar el ID del apartamento que no está disponible
			unavailableApartmentID := apartmentID
			alreadyTried := make(map[int64]bool)
			alreadyTried[unavailableApartmentID] = true

			// Reintentar buscar otro apartamento disponible del mismo tipo
			allApartments, err := s.apartmentsClient.GetAllApartmentsByType(req.ApartmentType)
			if err != nil || len(allApartments) == 0 {
				return nil, fmt.Errorf("no apartments of type %s available for the requested date range (all are booked)", req.ApartmentType)
			}

			// Intentar encontrar otro apartamento del tipo que esté disponible
			foundAlternative := false
			for _, apt := range allApartments {
				// Saltar apartamentos que ya intentamos
				if alreadyTried[apt.ID] {
					continue
				}

				// Verificar que tenga capacidad suficiente
				if apt.MaxGuests < req.Guests {
					continue
				}

				// Verificar disponibilidad del siguiente apartamento
				altAvailable, err := s.bookingRepo.CheckAvailability(ctx, apt.ID, checkIn, checkOut, nil)
				if err != nil {
					// Si hay error, continuar con el siguiente
					continue
				}

				if altAvailable {
					// ¡Encontramos otro disponible! Actualizar referencias
					apartmentID = apt.ID
					apartment = apt
					totalPrice = float64(days) * apt.PricePerNight
					foundAlternative = true
					// Marcar como intentado y salir del bucle para intentar con este
					alreadyTried[apt.ID] = true
					break
				}
			}

			if !foundAlternative {
				// No encontramos otro disponible, retornar error
				return nil, fmt.Errorf("no apartments of type %s available for the requested date range (all are booked)", req.ApartmentType)
			}

			// Incrementar contador de reintentos
			retryCount++
			if retryCount >= maxRetries {
				return nil, fmt.Errorf("no apartments of type %s available for the requested date range (max retries reached)", req.ApartmentType)
			}

			// Continuar el bucle para verificar disponibilidad atómica del nuevo apartamento
			continue
		} else if !available {
			// Si no buscamos por tipo o no hay más apartamentos del tipo, retornar error
			return nil, errors.New("apartment is not available for the requested date range")
		}

		// Si llegamos aquí y no estamos en modo tipo, salir
		break
	}

	// Validar datos del huésped
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid guest information: %w", err)
	}

	// Validar capacidad
	if apartment.MaxGuests < req.Guests {
		return nil, fmt.Errorf("apartment max capacity (%d) is less than requested guests (%d)", apartment.MaxGuests, req.Guests)
	}

	// Asignar DNI como ID del huésped
	guestInfo := req.GuestInfo
	guestInfo.ID = req.GuestInfo.DNI

	// Crear la reserva
	booking := &domain.Booking{
		ApartmentID:    apartmentID,
		UserID:         req.UserID,
		GuestInfo:      guestInfo,
		CheckIn:        checkIn,
		CheckOut:       checkOut,
		Guests:         req.Guests,
		TotalPrice:     totalPrice,
		DepositAmount:  calculateDeposit(totalPrice),
		PaymentMethod:  req.PaymentMethod,
		Status:         "reservada",
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

func (s *bookingService) GetAllBookings(ctx context.Context, filters map[string]interface{}, page, size int) ([]*domain.Booking, int64, error) {
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 10
	}
	if size > 100 {
		size = 100
	}

	skip := int64((page - 1) * size)
	limit := int64(size)

	bookings, err := s.bookingRepo.GetAll(ctx, filters, skip, limit)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.bookingRepo.Count(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	return bookings, total, nil
}

func (s *bookingService) UpdateBooking(ctx context.Context, id int64, req domain.UpdateBookingRequest) (*domain.Booking, error) {
	booking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Campos simples
	if req.Guests != nil {
		booking.Guests = *req.Guests
	}
	if req.Status != nil {
		booking.Status = *req.Status
	}
	if req.PaymentMethod != nil {
		booking.PaymentMethod = *req.PaymentMethod
	}
	if req.GuestInfo != nil {
		booking.GuestInfo = *req.GuestInfo
		booking.GuestInfo.ID = req.GuestInfo.DNI
	}

	// Cambio de apartamento
	if req.ApartmentID != nil && *req.ApartmentID != booking.ApartmentID {
		apt, err := s.apartmentsClient.GetApartmentByID(*req.ApartmentID)
		if err != nil {
			return nil, errors.New("apartment not found")
		}
		available, err := s.bookingRepo.CheckAvailability(ctx, *req.ApartmentID, booking.CheckIn, booking.CheckOut, &booking.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to check availability: %w", err)
		}
		if !available {
			return nil, errors.New("apartment is not available for the requested date range")
		}
		booking.ApartmentID = *req.ApartmentID
		// Recalcular precio con el nuevo apartamento salvo que venga un precio manual
		if req.TotalPrice == nil {
			days := int(booking.CheckOut.Sub(booking.CheckIn).Hours() / 24)
			if days < 1 {
				days = 1
			}
			booking.TotalPrice = float64(days) * apt.PricePerNight
		}
	}

	// Cambio de fechas
	checkIn := booking.CheckIn
	checkOut := booking.CheckOut
	if req.CheckIn != nil {
		parsed, err := time.Parse("2006-01-02", *req.CheckIn)
		if err != nil {
			return nil, fmt.Errorf("invalid check_in date format: %w", err)
		}
		checkIn = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC)
	}
	if req.CheckOut != nil {
		parsed, err := time.Parse("2006-01-02", *req.CheckOut)
		if err != nil {
			return nil, fmt.Errorf("invalid check_out date format: %w", err)
		}
		checkOut = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC)
	}
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
		// Recalcular precio por las nuevas fechas salvo que venga un precio manual
		if req.TotalPrice == nil {
			apartment, err := s.apartmentsClient.GetApartmentByID(booking.ApartmentID)
			if err == nil {
				days := int(checkOut.Sub(checkIn).Hours() / 24)
				if days < 1 {
					days = 1
				}
				booking.TotalPrice = float64(days) * apartment.PricePerNight
			}
		}
	}

	// Precio manual (siempre tiene la última palabra)
	if req.TotalPrice != nil {
		booking.TotalPrice = *req.TotalPrice
	}

	// Recalcular seña anticipada cada vez que cambia el precio total
	booking.DepositAmount = calculateDeposit(booking.TotalPrice)

	// Sincronizar montos USD para reservas pagadas
	if booking.Status == "pagado" {
		if req.USDAmount != nil {
			// El admin editó USD manualmente → tiene precedencia absoluta
			booking.USDAmount = req.USDAmount
		} else if booking.ExchangeRateUsed != nil && *booking.ExchangeRateUsed > 0 {
			// Recalcular USD usando el tipo de cambio registrado al momento del pago
			recalculated := booking.TotalPrice / *booking.ExchangeRateUsed
			booking.USDAmount = &recalculated
		}
	}

	err = s.bookingRepo.Update(ctx, id, booking)
	if err != nil {
		return nil, err
	}

	if err := s.rmqClient.PublishBookingEvent("updated", booking.ID); err != nil {
		// log pero no falla
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

// CompleteBooking marca una reserva "pagado" como "finalizada" si su fecha de check_out ya pasó
func (s *bookingService) CompleteBooking(ctx context.Context, id int64) (*domain.Booking, error) {
	// Obtener la reserva
	booking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Solo las reservas pagadas pueden finalizarse
	if booking.Status != "pagado" {
		return nil, fmt.Errorf("booking must be in 'pagado' status to be finalized, current status: %s", booking.Status)
	}

	// Verificar que la fecha de check_out ya pasó
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	checkOutUTC := booking.CheckOut.UTC()
	checkOutDate := time.Date(checkOutUTC.Year(), checkOutUTC.Month(), checkOutUTC.Day(), 0, 0, 0, 0, time.UTC)

	if !checkOutDate.Before(today) {
		return nil, fmt.Errorf("booking check-out date (%s) has not passed yet", checkOutDate.Format("2006-01-02"))
	}

	// Actualizar estado a "finalizada"
	err = s.bookingRepo.UpdateStatus(ctx, id, "finalizada")
	if err != nil {
		return nil, err
	}

	// Obtener la reserva actualizada
	updatedBooking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishBookingEvent("updated", updatedBooking.ID); err != nil {
		// Log error pero no fallar la actualización
	}

	return updatedBooking, nil
}

// CancelBooking marca una reserva como "cancelled" (solo para admin)
func (s *bookingService) CancelBooking(ctx context.Context, id int64) (*domain.Booking, error) {
	// Obtener la reserva
	booking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar que no esté ya cancelada
	if booking.Status == "cancelada" {
		return nil, fmt.Errorf("booking is already cancelled")
	}

	// No se puede cancelar una reserva ya finalizada
	if booking.Status == "finalizada" {
		return nil, fmt.Errorf("cannot cancel a finalized booking")
	}

	// Actualizar estado a "cancelada"
	err = s.bookingRepo.UpdateStatus(ctx, id, "cancelada")
	if err != nil {
		return nil, err
	}

	// Obtener la reserva actualizada
	updatedBooking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishBookingEvent("updated", updatedBooking.ID); err != nil {
		// Log error pero no fallar la actualización
	}

	return updatedBooking, nil
}

// MarkAsPaid marca una reserva como "pagado" y registra el pago completo en MySQL
func (s *bookingService) MarkAsPaid(ctx context.Context, id int64, dollarRate float64) (*domain.Booking, error) {
	booking, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if booking.Status == "pagado" {
		return nil, errors.New("booking is already marked as paid")
	}
	if booking.Status == "cancelada" {
		return nil, errors.New("cannot mark a cancelled booking as paid")
	}
	if booking.Status == "finalizada" {
		return nil, errors.New("cannot mark a finalized booking as paid")
	}

	if dollarRate <= 0 {
		return nil, errors.New("dollar rate must be configured before marking a booking as paid")
	}

	// Obtener el registro de tipo de cambio actual de MySQL (necesitamos su ID para el FK)
	rateRec, err := s.financeRepo.GetCurrentDollarRate(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current dollar rate: %w", err)
	}
	if rateRec == nil {
		return nil, errors.New("no dollar rate configured, please set it first from the admin panel")
	}

	usdAmount := booking.TotalPrice / rateRec.Rate
	now := time.Now().UTC()

	// Marcar como pagado en MongoDB
	if err := s.bookingRepo.MarkAsPaid(ctx, id, usdAmount, rateRec.Rate, now); err != nil {
		return nil, err
	}

	// Registrar el pago completo en MySQL con todos los datos relacionales
	paymentMethod := booking.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "transferencia"
	}
	if err := s.financeRepo.CreatePayment(ctx, repositories.CreatePaymentInput{
		BookingID:      booking.ID,
		ApartmentID:    booking.ApartmentID,
		GuestFirstName: booking.GuestInfo.FirstName,
		GuestLastName:  booking.GuestInfo.LastName,
		GuestDNI:       booking.GuestInfo.DNI,
		GuestEmail:     booking.GuestInfo.Email,
		GuestPhone:     booking.GuestInfo.Phone,
		CheckIn:        booking.CheckIn,
		CheckOut:       booking.CheckOut,
		AmountARS:      booking.TotalPrice,
		AmountUSD:      usdAmount,
		ExchangeRateID: rateRec.ID,
		ExchangeRate:   rateRec.Rate,
		PaymentMethod:  paymentMethod,
		PaidAt:         now,
	}); err != nil {
		// Loguear error pero no revertir — el estado en MongoDB ya fue actualizado
		// En producción esto requeriría una transacción distribuida o saga pattern
		fmt.Printf("[MarkAsPaid] warning: failed to record payment in MySQL: %v\n", err)
	}

	updated, err := s.bookingRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.rmqClient.PublishBookingEvent("updated", updated.ID); err != nil {
		// log but don't fail
	}

	return updated, nil
}

// MarkExpiredBookingsAsCompleted marca automáticamente las reservas pagadas vencidas como "finalizada"
func (s *bookingService) MarkExpiredBookingsAsCompleted(ctx context.Context) (int, error) {
	// Obtener todas las reservas PAGADAS cuyo check_out ya pasó
	expiredBookings, err := s.bookingRepo.GetExpiredPaidBookings(ctx)
	if err != nil {
		return 0, err
	}

	// Marcar cada una como "finalizada"
	completedCount := 0
	for _, booking := range expiredBookings {
		err := s.bookingRepo.UpdateStatus(ctx, booking.ID, "finalizada")
		if err != nil {
			// Continuar con las siguientes aunque falle una
			continue
		}
		completedCount++

		// Publicar evento a RabbitMQ
		if err := s.rmqClient.PublishBookingEvent("updated", booking.ID); err != nil {
			// Log error pero continuar
		}
	}

	return completedCount, nil
}
