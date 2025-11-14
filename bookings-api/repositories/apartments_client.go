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
	GetAvailableApartmentByType(aptType string, checkIn, checkOut string) (*ApartmentInfo, error)
	GetAllApartmentsByType(aptType string) ([]*ApartmentInfo, error)
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

func (c *apartmentsHTTPClient) GetAvailableApartmentByType(aptType string, checkIn, checkOut string) (*ApartmentInfo, error) {
	url := fmt.Sprintf("%s/api/v1/apartments/available-by-type?type=%s&check_in=%s&check_out=%s", 
		c.baseURL, aptType, checkIn, checkOut)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to apartments-api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("no apartments of this type available")
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

// GetAllApartmentsByType obtiene todos los apartamentos de un tipo específico
func (c *apartmentsHTTPClient) GetAllApartmentsByType(aptType string) ([]*ApartmentInfo, error) {
	// Obtener TODOS los apartamentos (no filtrar por available, porque la disponibilidad real
	// se verifica en bookings-api consultando las reservas existentes)
	url := fmt.Sprintf("%s/api/v1/apartments?size=1000", c.baseURL)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to apartments-api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("apartments-api returned status %d: %s", resp.StatusCode, string(body))
	}

	var response struct {
		Data []*ApartmentInfo `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode apartments response: %w", err)
	}

	// Filtrar por tipo usando la función GetApartmentType
	// Necesitamos importar el dominio de apartments-api, pero como es otra API,
	// debemos duplicar la lógica de GetApartmentType aquí
	var filteredApartments []*ApartmentInfo
	for _, apt := range response.Data {
		if getApartmentTypeFromName(apt.Name) == aptType {
			filteredApartments = append(filteredApartments, apt)
		}
	}

	return filteredApartments, nil
}

// getApartmentTypeFromName extrae el tipo de apartamento del nombre (duplicado de apartments-api/domain)
func getApartmentTypeFromName(name string) string {
	if len(name) == 0 {
		return "unknown"
	}
	
	if len(name) >= 9 && name[:9] == "Quadruple" {
		return "quadruple"
	}
	if len(name) >= 18 && name[:18] == "Double Matrimonial" {
		return "double_matrimonial"
	}
	if len(name) >= 11 && name[:11] == "Double Twin" {
		return "double_twin"
	}
	if len(name) >= 6 && name[:6] == "Triple" {
		return "triple"
	}
	
	return "unknown"
}

