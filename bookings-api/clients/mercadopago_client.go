package clients

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"bookings-api/domain"

	"github.com/mercadopago/sdk-go/pkg/config"
	"github.com/mercadopago/sdk-go/pkg/payment"
	"github.com/mercadopago/sdk-go/pkg/preference"
)

type MercadoPagoClient struct {
	cfg         *config.Config
	frontendURL string
	ngrokURL    string
}

func NewMercadoPagoClient() (*MercadoPagoClient, error) {
	accessToken := os.Getenv("MP_ACCESS_TOKEN")
	if accessToken == "" {
		return nil, fmt.Errorf("MP_ACCESS_TOKEN not set")
	}

	cfg, err := config.New(accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create MP config: %w", err)
	}

	frontendURL := os.Getenv("FRONTEND_BASE_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	ngrokURL := strings.TrimRight(os.Getenv("NGROK_URL"), "/")

	return &MercadoPagoClient{
		cfg:         cfg,
		frontendURL: strings.TrimRight(frontendURL, "/"),
		ngrokURL:    ngrokURL,
	}, nil
}

func (c *MercadoPagoClient) CreatePreference(ctx context.Context, bookingID int64, depositAmount float64, description string, guestEmail string) (*domain.CheckoutResponse, error) {
	client := preference.NewClient(c.cfg)

	bookingIDStr := strconv.FormatInt(bookingID, 10)

	req := preference.Request{
		Items: []preference.ItemRequest{
			{
				ID:         bookingIDStr,
				Title:      description,
				Quantity:   1,
				UnitPrice:  depositAmount,
				CurrencyID: "ARS",
			},
		},
		Payer: &preference.PayerRequest{
			Email: guestEmail,
		},
		// back_urls always use frontendURL. In dev (localhost) MP won't auto-redirect
		// but the flow uses polling so the user never relies on this redirect.
		// In production (https domain) auto_return activates and redirects automatically.
		BackURLs: &preference.BackURLsRequest{
			Success: fmt.Sprintf("%s/reserva/pago/resultado?booking_id=%d&status=approved", c.frontendURL, bookingID),
			Failure: fmt.Sprintf("%s/reserva/pago/resultado?booking_id=%d&status=failure", c.frontendURL, bookingID),
			Pending: fmt.Sprintf("%s/reserva/pago/resultado?booking_id=%d&status=pending", c.frontendURL, bookingID),
		},
		PaymentMethods: &preference.PaymentMethodsRequest{
			Installments:        1,
			DefaultInstallments: 1,
		},
		ExternalReference: bookingIDStr,
	}

	if strings.HasPrefix(c.frontendURL, "https://") {
		req.AutoReturn = "approved"
	}

	if c.ngrokURL != "" {
		req.NotificationURL = fmt.Sprintf("%s/api/v1/payments/webhook", c.ngrokURL)
	}

	resp, err := client.Create(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create MP preference: %w", err)
	}

	return &domain.CheckoutResponse{
		PreferenceID:  resp.ID,
		InitPoint:     resp.InitPoint,
		BookingID:     bookingID,
		DepositAmount: depositAmount,
	}, nil
}

// FindApprovedPayment busca en MP un pago aprobado para el booking dado.
// Valida explícitamente external_reference, status y que el pago sea posterior a createdAfter
// para evitar falsos positivos con pagos de tests anteriores.
func (c *MercadoPagoClient) FindApprovedPayment(ctx context.Context, externalRef string, createdAfter time.Time) (string, error) {
	client := payment.NewClient(c.cfg)
	resp, err := client.Search(ctx, payment.SearchRequest{
		Filters: map[string]string{
			"external_reference": externalRef,
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to search MP payments: %w", err)
	}

	for _, p := range resp.Results {
		if p.ExternalReference == externalRef &&
			p.Status == "approved" &&
			!p.DateApproved.IsZero() &&
			p.DateApproved.After(createdAfter) {
			return strconv.Itoa(p.ID), nil
		}
	}

	return "", fmt.Errorf("no approved payment found for booking %s", externalRef)
}

func (c *MercadoPagoClient) GetPayment(ctx context.Context, paymentID string) (string, string, error) {
	id64, err := strconv.ParseInt(paymentID, 10, 64)
	if err != nil {
		return "", "", fmt.Errorf("invalid payment ID: %w", err)
	}

	client := payment.NewClient(c.cfg)
	resp, err := client.Get(ctx, int(id64))
	if err != nil {
		return "", "", fmt.Errorf("failed to get MP payment: %w", err)
	}

	return resp.Status, resp.ExternalReference, nil
}
