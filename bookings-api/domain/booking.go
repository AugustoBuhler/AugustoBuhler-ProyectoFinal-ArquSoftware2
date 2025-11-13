package domain

import (
	"fmt"
	"time"
)

type GuestInfo struct {
	ID        string `json:"id" bson:"id"`                // DNI usado como ID del huésped
	FirstName string `json:"first_name" bson:"first_name" binding:"required"`
	LastName  string `json:"last_name" bson:"last_name" binding:"required"`
	DNI       string `json:"dni" bson:"dni" binding:"required"`
	Phone     string `json:"phone" bson:"phone" binding:"required"`
	Email     string `json:"email" bson:"email" binding:"required,email"`
}

type Booking struct {
	ID              int64     `json:"id" bson:"id"`
	ApartmentID     int64     `json:"apartment_id" bson:"apartment_id"`
	UserID          *int64    `json:"user_id,omitempty" bson:"user_id,omitempty"` // Opcional (puede ser null para reservas públicas)
	GuestInfo       GuestInfo `json:"user_info" bson:"user_info"`                 // Datos del huésped (requerido)
	CheckIn         time.Time `json:"check_in" bson:"check_in"`
	CheckOut        time.Time `json:"check_out" bson:"check_out"`
	Guests          int       `json:"guests" bson:"guests"`               // capacity_requested
	TotalPrice      float64   `json:"total_price" bson:"total_price"`
	PaymentMethod   string    `json:"payment_method" bson:"payment_method"` // "transferencia" o "efectivo"
	Status          string    `json:"status" bson:"status"`                 // "confirmed", "cancelled", "pending"
	CreatedByAdmin  bool      `json:"created_by_admin" bson:"created_by_admin"`
	AdminUserID     *int64    `json:"admin_user_id,omitempty" bson:"admin_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateBookingRequest struct {
	ApartmentID   int64     `json:"apartment_id" binding:"required"`
	UserID        *int64    `json:"user_id,omitempty"` // Opcional: si es admin creando para un usuario
	GuestInfo     GuestInfo `json:"user_info" binding:"required"`
	CheckIn       string    `json:"check_in" binding:"required"`       // Formato: "2025-11-10"
	CheckOut      string    `json:"check_out" binding:"required"`      // Formato: "2025-11-14"
	Guests        int       `json:"guests" binding:"required,min=1"`   // capacity_requested
	PaymentMethod string    `json:"payment_method" binding:"required,oneof=transferencia efectivo"`
}

// Validate valida que todos los campos del huésped estén presentes
func (req *CreateBookingRequest) Validate() error {
	if req.GuestInfo.FirstName == "" {
		return fmt.Errorf("first_name is required")
	}
	if req.GuestInfo.LastName == "" {
		return fmt.Errorf("last_name is required")
	}
	if req.GuestInfo.DNI == "" {
		return fmt.Errorf("dni is required")
	}
	if req.GuestInfo.Phone == "" {
		return fmt.Errorf("phone is required")
	}
	if req.GuestInfo.Email == "" {
		return fmt.Errorf("email is required")
	}
	if req.PaymentMethod != "transferencia" && req.PaymentMethod != "efectivo" {
		return fmt.Errorf("payment_method must be 'transferencia' or 'efectivo'")
	}
	return nil
}

type UpdateBookingRequest struct {
	CheckIn       *string  `json:"check_in"`
	CheckOut      *string  `json:"check_out"`
	Guests        *int     `json:"guests"`
	Status        *string  `json:"status" binding:"omitempty,oneof=confirmed cancelled pending"`
	PaymentMethod *string  `json:"payment_method" binding:"omitempty,oneof=transferencia efectivo"`
}

