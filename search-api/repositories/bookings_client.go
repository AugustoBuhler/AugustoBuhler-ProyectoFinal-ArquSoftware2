package repositories

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type availabilityRequest struct {
	ApartmentIDs []int64 `json:"apartment_ids"`
	CheckIn      string  `json:"check_in"`
	CheckOut     string  `json:"check_out"`
}

type availabilityResponse struct {
	Available []int64 `json:"available"`
}

type BookingsClient interface {
	FilterAvailable(apartmentIDs []int64, checkIn, checkOut string) (map[int64]bool, error)
}

type bookingsHTTPClient struct {
	baseURL string
	client  *http.Client
}

func NewBookingsClient() BookingsClient {
	baseURL := os.Getenv("BOOKINGS_API_URL")
	if baseURL == "" {
		baseURL = "http://bookings-api:8082"
	}
	return &bookingsHTTPClient{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

// FilterAvailable llama a bookings-api con una lista de IDs y fechas,
// y devuelve un set con los IDs que están disponibles.
func (c *bookingsHTTPClient) FilterAvailable(apartmentIDs []int64, checkIn, checkOut string) (map[int64]bool, error) {
	body, _ := json.Marshal(availabilityRequest{
		ApartmentIDs: apartmentIDs,
		CheckIn:      checkIn,
		CheckOut:     checkOut,
	})

	resp, err := c.client.Post(
		fmt.Sprintf("%s/api/v1/bookings/availability-batch", c.baseURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, fmt.Errorf("error calling bookings-api: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bookings-api returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result availabilityResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("error parsing availability response: %w", err)
	}

	available := make(map[int64]bool, len(result.Available))
	for _, id := range result.Available {
		available[id] = true
	}
	return available, nil
}
