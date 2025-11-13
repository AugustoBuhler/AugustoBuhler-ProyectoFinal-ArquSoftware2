package repositories

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type ApartmentInfo struct {
	ID            int64   `json:"id"`
	Name          string  `json:"name"`
	PricePerNight float64 `json:"price_per_night"`
	MaxGuests     int     `json:"max_guests"`
	Available     bool    `json:"available"`
}

type ApartmentsClient interface {
	GetApartmentByID(apartmentID int64) (*ApartmentInfo, error)
}

type apartmentsHTTPClient struct {
	baseURL string
}

func NewApartmentsClient() ApartmentsClient {
	baseURL := os.Getenv("APARTMENTS_API_URL")
	if baseURL == "" {
		baseURL = "http://apartments-api:8081"
	}
	return &apartmentsHTTPClient{baseURL: baseURL}
}

func (c *apartmentsHTTPClient) GetApartmentByID(apartmentID int64) (*ApartmentInfo, error) {
	url := fmt.Sprintf("%s/api/v1/apartments/%d", c.baseURL, apartmentID)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to apartments-api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("apartment not found")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("apartments-api returned status %d: %s", resp.StatusCode, string(body))
	}

	var apartment ApartmentInfo
	if err := json.NewDecoder(resp.Body).Decode(&apartment); err != nil {
		return nil, fmt.Errorf("failed to decode apartment response: %w", err)
	}

	return &apartment, nil
}

