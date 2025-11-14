package repositories

import (
	"time"
)

type BookingsClient interface {
	GetBookingsByApartmentIDAndDateRange(apartmentID int64, checkIn, checkOut time.Time) ([]map[string]interface{}, error)
}

type bookingsHTTPClient struct {
	baseURL string
}

func NewBookingsClient() BookingsClient {
	return &bookingsHTTPClient{}
}

func (c *bookingsHTTPClient) GetBookingsByApartmentIDAndDateRange(apartmentID int64, checkIn, checkOut time.Time) ([]map[string]interface{}, error) {
	// Por ahora, este método no existe en bookings-api
	// Se puede implementar después o usar el endpoint de availability
	// Por ahora retornamos array vacío (sin reservas)
	return []map[string]interface{}{}, nil
}

