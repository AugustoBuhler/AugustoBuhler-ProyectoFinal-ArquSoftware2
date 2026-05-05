package domain

import "time"

type DollarRateConfig struct {
	Key       string    `json:"key" bson:"key"`
	Rate      float64   `json:"rate" bson:"rate"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

type SetDollarRateRequest struct {
	Rate float64 `json:"rate" binding:"required,gt=0"`
}

type DollarRateResponse struct {
	Rate      float64   `json:"rate"`
	UpdatedAt time.Time `json:"updated_at"`
}
