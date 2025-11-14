package services

import (
	"context"
	"errors"
	"time"

	"apartments-api/clients"
	"apartments-api/domain"
	"apartments-api/repositories"
)

type ApartmentService interface {
	CreateApartment(ctx context.Context, req domain.CreateApartmentRequest) (*domain.Apartment, error)
	GetApartmentByID(ctx context.Context, id int64) (*domain.Apartment, error)
	GetAllApartments(ctx context.Context, filters map[string]interface{}, page, size int) ([]*domain.Apartment, int64, error)
	UpdateApartment(ctx context.Context, id int64, req domain.UpdateApartmentRequest) (*domain.Apartment, error)
	DeleteApartment(ctx context.Context, id int64) error
	GetApartmentTypes(ctx context.Context) ([]*domain.ApartmentType, error)
	GetAvailableApartmentByType(ctx context.Context, aptType string, checkIn, checkOut time.Time) (*domain.Apartment, error)
}

type apartmentService struct {
	aptRepo     repositories.ApartmentRepository
	usersClient repositories.UsersClient
	rmqClient   clients.RabbitMQClient
}

func NewApartmentService(
	aptRepo repositories.ApartmentRepository,
	usersClient repositories.UsersClient,
	rmqClient clients.RabbitMQClient,
) ApartmentService {
	return &apartmentService{
		aptRepo:     aptRepo,
		usersClient: usersClient,
		rmqClient:   rmqClient,
	}
}

func (s *apartmentService) CreateApartment(ctx context.Context, req domain.CreateApartmentRequest) (*domain.Apartment, error) {
	// Validar owner
	ownerExists, err := s.usersClient.GetUserByID(req.OwnerID)
	if err != nil || !ownerExists {
		return nil, errors.New("owner not found")
	}

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
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err = s.aptRepo.Create(ctx, apartment)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishApartmentEvent("created", apartment.ID); err != nil {
		// Log error pero no fallar la creación
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

	total, err := s.aptRepo.Count(ctx, filters)
	if err != nil {
		return nil, 0, err
	}

	return apartments, total, nil
}

func (s *apartmentService) UpdateApartment(ctx context.Context, id int64, req domain.UpdateApartmentRequest) (*domain.Apartment, error) {
	existing, err := s.aptRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.Address != nil {
		existing.Address = *req.Address
	}
	if req.City != nil {
		existing.City = *req.City
	}
	if req.MaxGuests != nil {
		existing.MaxGuests = *req.MaxGuests
	}
	if req.Bedrooms != nil {
		existing.Bedrooms = *req.Bedrooms
	}
	if req.Bathrooms != nil {
		existing.Bathrooms = *req.Bathrooms
	}
	if req.Amenities != nil {
		existing.Amenities = *req.Amenities
	}
	if req.PricePerNight != nil {
		existing.PricePerNight = *req.PricePerNight
	}
	if req.Images != nil {
		existing.Images = *req.Images
	}
	if req.Available != nil {
		existing.Available = *req.Available
	}
	existing.UpdatedAt = time.Now()

	err = s.aptRepo.Update(ctx, id, existing)
	if err != nil {
		return nil, err
	}

	// Publicar evento a RabbitMQ
	if err := s.rmqClient.PublishApartmentEvent("updated", existing.ID); err != nil {
		// Log error pero no fallar la actualización
	}

	return existing, nil
}

func (s *apartmentService) DeleteApartment(ctx context.Context, id int64) error {
	// Verificar que exista
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

// GetApartmentTypes obtiene todos los tipos de apartamentos agrupados
func (s *apartmentService) GetApartmentTypes(ctx context.Context) ([]*domain.ApartmentType, error) {
	// Obtener todos los apartamentos
	allApartments, err := s.aptRepo.GetAll(ctx, map[string]interface{}{}, 0, 1000)
	if err != nil {
		return nil, err
	}

	// Agrupar por tipo
	typeMap := make(map[string]*domain.ApartmentType)
	
	for _, apt := range allApartments {
		aptType := domain.GetApartmentType(apt.Name)
		if aptType == "unknown" {
			continue
		}

		if typeMap[aptType] == nil {
			typeMap[aptType] = &domain.ApartmentType{
				Type:        aptType,
				Name:        domain.GetTypeDisplayName(aptType),
				Description: domain.GetTypeDescription(aptType),
				MaxGuests:   apt.MaxGuests,
				Count:       0,
				MinPrice:    apt.PricePerNight,
				MaxPrice:    apt.PricePerNight,
				Available:   apt.Available,
			}
		}

		typeMap[aptType].Count++
		if apt.PricePerNight < typeMap[aptType].MinPrice {
			typeMap[aptType].MinPrice = apt.PricePerNight
		}
		if apt.PricePerNight > typeMap[aptType].MaxPrice {
			typeMap[aptType].MaxPrice = apt.PricePerNight
		}
		if apt.Available {
			typeMap[aptType].Available = true
		}
	}

	// Convertir a slice y ordenar
	types := make([]*domain.ApartmentType, 0, len(typeMap))
	order := []string{"quadruple", "triple", "double_matrimonial", "double_twin"}
	
	for _, t := range order {
		if typeMap[t] != nil {
			types = append(types, typeMap[t])
		}
	}
	
	return types, nil
}

// GetAvailableApartmentByType busca un apartamento disponible del tipo especificado en el rango de fechas
func (s *apartmentService) GetAvailableApartmentByType(ctx context.Context, aptType string, checkIn, checkOut time.Time) (*domain.Apartment, error) {
	// Obtener todos los apartamentos del tipo
	allApartments, err := s.aptRepo.GetAll(ctx, map[string]interface{}{}, 0, 1000)
	if err != nil {
		return nil, err
	}

	// Filtrar por tipo
	var typeApartments []*domain.Apartment
	for _, apt := range allApartments {
		if domain.GetApartmentType(apt.Name) == aptType && apt.Available {
			typeApartments = append(typeApartments, apt)
		}
	}

	if len(typeApartments) == 0 {
		return nil, errors.New("no apartments of this type available")
	}

	// Por ahora, retornamos el primero disponible
	// La verificación de disponibilidad real (checking bookings) se hace en bookings-api
	// cuando se intenta crear la reserva
	
	return typeApartments[0], nil
}
