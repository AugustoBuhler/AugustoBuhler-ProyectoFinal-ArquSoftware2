package repositories

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"search-api/domain"
)

type ApartmentsClient interface {
	GetApartmentByID(id int64) (*domain.ApartmentSearchResult, error)
}

type apartmentsHTTPClient struct {
	baseURL string
	client  *http.Client
}

func NewApartmentsClient() ApartmentsClient {
	baseURL := os.Getenv("APARTMENTS_API_URL")
	if baseURL == "" {
		baseURL = "http://apartments-api:8081"
	}
	return &apartmentsHTTPClient{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

func (c *apartmentsHTTPClient) GetApartmentByID(id int64) (*domain.ApartmentSearchResult, error) {
	url := fmt.Sprintf("%s/api/v1/apartments/%d", c.baseURL, id)

	resp, err := c.client.Get(url)
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

	var apt domain.ApartmentSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&apt); err != nil {
		return nil, fmt.Errorf("failed to decode apartment response: %w", err)
	}

	return &apt, nil
}

