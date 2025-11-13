package services

import (
	"context"
	"errors"
	"fmt"

	"apartments-api/domain"
	"apartments-api/repositories"
)

type ApartmentService interface {
	CreateApartment(ctx context.Context, req domain.CreateApartmentRequest) (*domain.Apartment, error)
	GetApartmentByID(ctx context.Context, id int64) (*domain.Apartment, error)
	GetAllApartments(ctx context.Context, filters map[string]interface{}, page, size int) ([]*domain.Apartment, int64, error)
	UpdateApartment(ctx context.Context, id int64, req domain.UpdateApartmentRequest) (*domain.Apartment, error)
	DeleteApartment(ctx context.Context, id int64) error
}

type apartmentService struct {
	aptRepo    repositories.ApartmentRepository
	usersClient repositories.UsersClient
	rmqClient  RabbitMQClient
}

type RabbitMQClient interface {
	PublishApartmentEvent(action string, apartmentID int64) error
}

func NewApartmentService(
	aptRepo repositories.ApartmentRepository,
	usersClient repositories.UsersClient,
	rmqClient RabbitMQClient,
) ApartmentService {
	return &apartmentService{
		aptRepo:     aptRepo,
		usersClient: usersClient,
		rmqClient:   rmqClient,
	}
}

func (s *apartmentService) CreateApartment(ctx context.Context, req domain.CreateApartmentRequest) (*domain.Apartment, error) {
	// Validar que el owner existe
	exists, err := s.usersClient.GetUserByID(req.OwnerID)
	if err != nil {
		return nil, fmt.Errorf("failed to validate owner: %w", err)
	}
	if !exists {
		return nil, errors.New("owner not found")
	}

	// Crear apartamento
	apartment := &domain.Apartment{
		Name:          req.Name,
		Description:   req.Description,
		Address:       req.Address,
		City:          req.City,
		MaxGuests:     req.MaxGuests,
		Bedrooms:      req.Bedrooms,
		Bathrooms:     req.Bathrooms,
		Amenities:     req.Amenities,
		PricePerNight: req.PricePerNight,
		Images:        req.Images,
		Available:     req.Available,
		OwnerID:       req.OwnerID,
	}

	if apartment.Available == false && len(req.Amenities) == 0 {
		apartment.Available = true // Por defecto disponible
	}

	err = s.aptRepo.Create(ctx, apartment)
	if err != nil {
		return nil, fmt.Errorf("failed to create apartment: %w", err)
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishApartmentEvent("created", apartment.ID); err != nil {
		// Log error pero no fallar la creación
		// En producción, considerar reintentos o cola de dead letter
		// Por ahora solo loguear
	}

	return apartment, nil
}

func (s *apartmentService) GetApartmentByID(ctx context.Context, id int64) (*domain.Apartment, error) {
	return s.aptRepo.GetByID(ctx, id)
}

func (s *apartmentService) GetAllApartments(ctx context.Context, filters map[string]interface{}, page, size int) ([]*domain.Apartment, int64, error) {
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

	apartments, err := s.aptRepo.GetAll(ctx, filters, skip, limit)
	if err != nil {
		return nil, 0, err
	}

	// Para simplificar, retornamos el count actual (en producción hacer count total)
	total := int64(len(apartments))

	return apartments, total, nil
}

func (s *apartmentService) UpdateApartment(ctx context.Context, id int64, req domain.UpdateApartmentRequest) (*domain.Apartment, error) {
	// Obtener apartamento existente
	apartment, err := s.aptRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Actualizar campos si se proporcionan
	if req.Name != nil {
		apartment.Name = *req.Name
	}
	if req.Description != nil {
		apartment.Description = *req.Description
	}
	if req.Address != nil {
		apartment.Address = *req.Address
	}
	if req.City != nil {
		apartment.City = *req.City
	}
	if req.MaxGuests != nil {
		apartment.MaxGuests = *req.MaxGuests
	}
	if req.Bedrooms != nil {
		apartment.Bedrooms = *req.Bedrooms
	}
	if req.Bathrooms != nil {
		apartment.Bathrooms = *req.Bathrooms
	}
	if req.Amenities != nil {
		apartment.Amenities = *req.Amenities
	}
	if req.PricePerNight != nil {
		apartment.PricePerNight = *req.PricePerNight
	}
	if req.Images != nil {
		apartment.Images = *req.Images
	}
	if req.Available != nil {
		apartment.Available = *req.Available
	}

	err = s.aptRepo.Update(ctx, id, apartment)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishApartmentEvent("updated", apartment.ID); err != nil {
		// Log error pero no fallar la actualización
	}

	return apartment, nil
}

func (s *apartmentService) DeleteApartment(ctx context.Context, id int64) error {
	// Verificar que existe
	_, err := s.aptRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	err = s.aptRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishApartmentEvent("deleted", id); err != nil {
		// Log error pero no fallar la eliminación
	}

	return nil
}

