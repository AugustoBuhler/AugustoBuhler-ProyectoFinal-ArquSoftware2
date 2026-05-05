package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Booking struct {
	ID            int64     `json:"id"`
	ApartmentID   int64     `json:"apartment_id"`
	GuestFirstName string   `json:"-"`
	GuestLastName  string   `json:"-"`
	GuestEmail     string   `json:"-"`
	GuestDNI       string   `json:"-"`
	GuestPhone     string   `json:"-"`
	CheckIn        string   `json:"check_in"`
	CheckOut       string   `json:"check_out"`
	Guests         int      `json:"guests"`
	TotalPrice     float64  `json:"total_price"`
	PaymentMethod  string   `json:"payment_method"`
	Status         string   `json:"status"`
}

// bookingAPIResponse refleja exactamente la respuesta de bookings-api
type bookingAPIResponse struct {
	ID          int64  `json:"id"`
	ApartmentID int64  `json:"apartment_id"`
	UserInfo    struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		DNI       string `json:"dni"`
		Phone     string `json:"phone"`
	} `json:"user_info"`
	CheckIn       string  `json:"check_in"`
	CheckOut      string  `json:"check_out"`
	Guests        int     `json:"guests"`
	TotalPrice    float64 `json:"total_price"`
	PaymentMethod string  `json:"payment_method"`
	Status        string  `json:"status"`
}

type BookingsClient interface {
	GetBookingByID(id int64) (*Booking, error)
}

type bookingsClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewBookingsClient() BookingsClient {
	baseURL := os.Getenv("BOOKINGS_API_URL")
	if baseURL == "" {
		baseURL = "http://bookings-api:8082"
	}
	return &bookingsClient{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *bookingsClient) GetBookingByID(id int64) (*Booking, error) {
	url := fmt.Sprintf("%s/api/v1/bookings/%d", c.baseURL, id)

	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("error calling bookings-api: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bookings-api returned %d: %s", resp.StatusCode, string(body))
	}

	var raw bookingAPIResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("error parsing booking response: %w", err)
	}

	return &Booking{
		ID:             raw.ID,
		ApartmentID:    raw.ApartmentID,
		GuestFirstName: raw.UserInfo.FirstName,
		GuestLastName:  raw.UserInfo.LastName,
		GuestEmail:     raw.UserInfo.Email,
		GuestDNI:       raw.UserInfo.DNI,
		GuestPhone:     raw.UserInfo.Phone,
		CheckIn:        raw.CheckIn,
		CheckOut:       raw.CheckOut,
		Guests:         raw.Guests,
		TotalPrice:     raw.TotalPrice,
		PaymentMethod:  raw.PaymentMethod,
		Status:         raw.Status,
	}, nil
}
