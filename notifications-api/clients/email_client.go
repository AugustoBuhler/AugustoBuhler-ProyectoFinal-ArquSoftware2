package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

type EmailClient interface {
	SendConfirmation(booking *Booking) error
}

type emailClient struct {
	apiKey     string
	fromEmail  string
	httpClient *http.Client
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

func NewEmailClient() EmailClient {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		log.Println("[email] WARNING: RESEND_API_KEY not set — emails will be logged but not sent")
	}

	fromEmail := os.Getenv("FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "Reservas <onboarding@resend.dev>"
	}

	return &emailClient{
		apiKey:     apiKey,
		fromEmail:  fromEmail,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *emailClient) SendConfirmation(booking *Booking) error {
	subject := fmt.Sprintf("Confirmación de tu reserva #%d", booking.ID)
	html := buildConfirmationHTML(booking)

	if c.apiKey == "" {
		log.Printf("[email] (dry-run) Would send to: %s | Subject: %s", booking.GuestEmail, subject)
		return nil
	}

	payload := resendRequest{
		From:    c.fromEmail,
		To:      []string{booking.GuestEmail},
		Subject: subject,
		Html:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshaling email payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request to Resend: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Resend API error %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

func buildConfirmationHTML(b *Booking) string {
	paymentLabel := "Transferencia bancaria"
	if b.PaymentMethod == "efectivo" {
		paymentLabel = "Efectivo"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700">¡Reserva Confirmada!</h1>
            <p style="margin:10px 0 0;color:#c4b5fd;font-size:16px">Gracias por elegirnos, %s</p>
          </td>
        </tr>

        <!-- Booking ID badge -->
        <tr>
          <td style="padding:30px 40px 0;text-align:center">
            <div style="display:inline-block;background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:12px 24px">
              <span style="color:#15803d;font-size:14px;font-weight:600">Número de Reserva</span>
              <div style="color:#166534;font-size:32px;font-weight:800">#%d</div>
            </div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:30px 40px 10px">
            <p style="margin:0;color:#374151;font-size:16px;line-height:1.6">
              Hola <strong>%s %s</strong>, tu reserva ha sido registrada exitosamente.
              A continuación encontrás el resumen completo:
            </p>
          </td>
        </tr>

        <!-- Booking details -->
        <tr>
          <td style="padding:10px 40px 30px">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">

              <tr style="background:#e2e8f0">
                <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">
                  Detalles de la estadía
                </td>
              </tr>

              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Apartamento</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">N° %d</td>
              </tr>
              <tr style="background:#f1f5f9">
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Check-in</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Check-out</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td>
              </tr>
              <tr style="background:#f1f5f9">
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Huéspedes</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%d persona(s)</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Método de pago</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td>
              </tr>
              <tr style="background:#fef9c3">
                <td style="padding:16px 20px;color:#854d0e;font-size:15px;font-weight:700">Total</td>
                <td style="padding:16px 20px;color:#854d0e;font-size:20px;font-weight:800">$%.2f ARS</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Guest info -->
        <tr>
          <td style="padding:0 40px 30px">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
              <tr style="background:#e2e8f0">
                <td colspan="2" style="padding:14px 20px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">
                  Datos del huésped
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">Nombre</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%s %s</td>
              </tr>
              <tr style="background:#f1f5f9">
                <td style="padding:14px 20px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0">DNI</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0">%s</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;color:#64748b;font-size:14px">Email</td>
                <td style="padding:14px 20px;color:#1e293b;font-size:14px;font-weight:600">%s</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Important note -->
        <tr>
          <td style="padding:0 40px 30px">
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;padding:16px 20px">
              <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6">
                <strong>Importante:</strong> Guardá el número de reserva <strong>#%d</strong> para cualquier consulta.
                Podés ver el estado de tu reserva en nuestra web en cualquier momento.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1e293b;padding:24px 40px;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:13px">
              Sistema de Reservas de Apartamentos Amoblados
            </p>
            <p style="margin:6px 0 0;color:#64748b;font-size:12px">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
		b.GuestFirstName,
		b.ID,
		b.GuestFirstName, b.GuestLastName,
		b.ApartmentID,
		b.CheckIn,
		b.CheckOut,
		b.Guests,
		paymentLabel,
		b.TotalPrice,
		b.GuestFirstName, b.GuestLastName,
		b.GuestDNI,
		b.GuestEmail,
		b.ID,
	)
}
