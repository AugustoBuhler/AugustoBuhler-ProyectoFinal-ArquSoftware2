package domain

import (
	"encoding/json"
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

// DateOnly es un tipo personalizado para fechas que se serializan como "YYYY-MM-DD"
type DateOnly struct {
	time.Time
}

// MarshalJSON serializa la fecha como string "YYYY-MM-DD" (sin hora ni zona horaria)
func (d DateOnly) MarshalJSON() ([]byte, error) {
	if d.Time.IsZero() {
		return []byte("null"), nil
	}
	formatted := d.Time.Format("2006-01-02")
	return json.Marshal(formatted)
}

// UnmarshalJSON deserializa el string "YYYY-MM-DD" a DateOnly
func (d *DateOnly) UnmarshalJSON(data []byte) error {
	var dateStr string
	if err := json.Unmarshal(data, &dateStr); err != nil {
		return err
	}
	if dateStr == "" || dateStr == "null" {
		d.Time = time.Time{}
		return nil
	}
	parsed, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return err
	}
	d.Time = parsed
	return nil
}

type Booking struct {
	ID              int64     `json:"id" bson:"id"`
	ApartmentID     int64     `json:"apartment_id" bson:"apartment_id"`
	UserID          *int64    `json:"user_id,omitempty" bson:"user_id,omitempty"` // Opcional (puede ser null para reservas públicas)
	GuestInfo       GuestInfo `json:"user_info" bson:"user_info"`                 // Datos del huésped (requerido)
	CheckIn         time.Time `json:"check_in" bson:"check_in"`                   // En BD: time.Time, en JSON: "YYYY-MM-DD"
	CheckOut        time.Time `json:"check_out" bson:"check_out"`                 // En BD: time.Time, en JSON: "YYYY-MM-DD"
	Guests          int       `json:"guests" bson:"guests"`                       // capacity_requested
	TotalPrice      float64   `json:"total_price" bson:"total_price"`
	PaymentMethod   string    `json:"payment_method" bson:"payment_method"`       // "transferencia" o "efectivo"
	Status          string    `json:"status" bson:"status"`                       // "confirmed", "cancelled", "pending"
	CreatedByAdmin  bool      `json:"created_by_admin" bson:"created_by_admin"`
	AdminUserID     *int64    `json:"admin_user_id,omitempty" bson:"admin_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" bson:"updated_at"`
}

// BookingResponse es el struct usado para serializar las respuestas JSON
// con fechas en formato "YYYY-MM-DD" (sin hora ni zona horaria)
type BookingResponse struct {
	ID              int64     `json:"id"`
	ApartmentID     int64     `json:"apartment_id"`
	UserID          *int64    `json:"user_id,omitempty"`
	GuestInfo       GuestInfo `json:"user_info"`
	CheckIn         string    `json:"check_in"`         // "YYYY-MM-DD"
	CheckOut        string    `json:"check_out"`        // "YYYY-MM-DD"
	Guests          int       `json:"guests"`
	TotalPrice      float64   `json:"total_price"`
	PaymentMethod   string    `json:"payment_method"`
	Status          string    `json:"status"`
	CreatedByAdmin  bool      `json:"created_by_admin"`
	AdminUserID     *int64    `json:"admin_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ToBookingResponse convierte un Booking a BookingResponse con fechas formateadas
// IMPORTANTE: Las fechas se formatean extrayendo año, mes y día directamente de UTC
// para evitar problemas de zona horaria que muestren un día menos
func (b *Booking) ToBookingResponse() *BookingResponse {
	// Convertir a UTC y extraer solo los componentes de fecha (año, mes, día)
	// para evitar que se muestre un día menos debido a la zona horaria
	checkInUTC := b.CheckIn.UTC()
	checkOutUTC := b.CheckOut.UTC()
	
	// Formatear usando los componentes de fecha en UTC
	// Esto asegura que "2026-01-14T00:00:00Z" se muestre como "2026-01-14"
	// independientemente de la zona horaria del servidor
	checkInStr := formatDateOnly(checkInUTC)
	checkOutStr := formatDateOnly(checkOutUTC)
	
	return &BookingResponse{
		ID:             b.ID,
		ApartmentID:    b.ApartmentID,
		UserID:         b.UserID,
		GuestInfo:      b.GuestInfo,
		CheckIn:        checkInStr,
		CheckOut:       checkOutStr,
		Guests:         b.Guests,
		TotalPrice:     b.TotalPrice,
		PaymentMethod:  b.PaymentMethod,
		Status:         b.Status,
		CreatedByAdmin: b.CreatedByAdmin,
		AdminUserID:    b.AdminUserID,
		CreatedAt:      b.CreatedAt,
		UpdatedAt:      b.UpdatedAt,
	}
}

// formatDateOnly formatea una fecha extrayendo año, mes y día directamente de UTC
// sin importar la zona horaria original, para evitar problemas de día anterior
func formatDateOnly(t time.Time) string {
	// CRÍTICO: Extraer los componentes de fecha directamente de UTC
	// .UTC() convierte la fecha a UTC, y luego .Year()/.Month()/.Day() obtienen
	// los componentes de fecha en UTC, no en la zona horaria local
	utcTime := t.UTC()
	year, month, day := utcTime.Year(), utcTime.Month(), utcTime.Day()
	return fmt.Sprintf("%04d-%02d-%02d", year, int(month), day)
}

type CreateBookingRequest struct {
	ApartmentID   *int64    `json:"apartment_id,omitempty"`   // Opcional: ID específico (para admin)
	ApartmentType string    `json:"apartment_type,omitempty"` // Opcional: Tipo de apartamento (para reservas públicas)
	UserID        *int64    `json:"user_id,omitempty"`        // Opcional: si es admin creando para un usuario
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

