package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

// ValidateMPSignature verifica la firma del webhook de Mercado Pago.
// Header x-signature tiene formato: ts=TIMESTAMP,v1=HASH
// El signed content es: id:{dataID};request-date:{ts};
// Ref: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
func ValidateMPSignature(secret, xSignature, xRequestID, dataID string) bool {
	if secret == "" || xSignature == "" {
		return false
	}

	var ts, v1 string
	for _, part := range strings.Split(xSignature, ",") {
		part = strings.TrimSpace(part)
		switch {
		case strings.HasPrefix(part, "ts="):
			ts = strings.TrimPrefix(part, "ts=")
		case strings.HasPrefix(part, "v1="):
			v1 = strings.TrimPrefix(part, "v1=")
		}
	}

	if ts == "" || v1 == "" {
		return false
	}

	manifest := fmt.Sprintf("id:%s;request-date:%s;", dataID, ts)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(manifest))
	computed := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(computed), []byte(v1))
}
