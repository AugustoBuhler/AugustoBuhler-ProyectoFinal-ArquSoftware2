package domain

import "time"

type Apartment struct {
	ID            int64     `json:"id" bson:"id"`
	Name          string    `json:"name" bson:"name"`
	Description   string    `json:"description" bson:"description"`
	Address       string    `json:"address" bson:"address"`
	City          string    `json:"city" bson:"city"`
	MaxGuests     int       `json:"max_guests" bson:"max_guests"`
	Bedrooms      int       `json:"bedrooms" bson:"bedrooms"`
	Bathrooms     int       `json:"bathrooms" bson:"bathrooms"`
	Amenities     []string  `json:"amenities" bson:"amenities"`
	PricePerNight float64   `json:"price_per_night" bson:"price_per_night"`
	Images        []string  `json:"images" bson:"images"`
	Available     bool      `json:"available" bson:"available"`
	OwnerID       int64     `json:"owner_id" bson:"owner_id"`
	CreatedAt     time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateApartmentRequest struct {
	Name          string    `json:"name" binding:"required"`
	Description   string    `json:"description"`
	Address       string    `json:"address" binding:"required"`
	City          string    `json:"city" binding:"required"`
	MaxGuests     int       `json:"max_guests" binding:"required,min=1"`
	Bedrooms      int       `json:"bedrooms" binding:"required,min=1"`
	Bathrooms     int       `json:"bathrooms" binding:"required,min=1"`
	Amenities     []string  `json:"amenities"`
	PricePerNight float64   `json:"price_per_night" binding:"required,min=0"`
	Images        []string  `json:"images"`
	Available     bool      `json:"available"`
	OwnerID       int64     `json:"owner_id" binding:"required"`
}

type UpdateApartmentRequest struct {
	Name          *string   `json:"name"`
	Description   *string   `json:"description"`
	Address       *string   `json:"address"`
	City          *string   `json:"city"`
	MaxGuests     *int      `json:"max_guests"`
	Bedrooms      *int      `json:"bedrooms"`
	Bathrooms     *int      `json:"bathrooms"`
	Amenities     *[]string `json:"amenities"`
	PricePerNight *float64  `json:"price_per_night"`
	Images        *[]string `json:"images"`
	Available     *bool     `json:"available"`
}

