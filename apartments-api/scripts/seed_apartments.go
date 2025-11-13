package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Apartment struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Address       string   `json:"address"`
	City          string   `json:"city"`
	MaxGuests     int      `json:"max_guests"`
	Bedrooms      int      `json:"bedrooms"`
	Bathrooms     int      `json:"bathrooms"`
	Amenities     []string `json:"amenities"`
	PricePerNight float64  `json:"price_per_night"`
	Images        []string `json:"images"`
	Available     bool     `json:"available"`
	OwnerID       int64    `json:"owner_id"`
}

var apartments = []Apartment{
	// 7 Quadruples (capacidad 4)
	{Name: "Quadruple 1", Description: "Amplio departamento para 4 personas", Address: "Av. Libertador 1234", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Cocina"}, PricePerNight: 120.50, Available: true, OwnerID: 1},
	{Name: "Quadruple 2", Description: "Departamento moderno con vista", Address: "Av. Corrientes 567", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV"}, PricePerNight: 125.00, Available: true, OwnerID: 1},
	{Name: "Quadruple 3", Description: "Céntrico y cómodo", Address: "Av. Santa Fe 890", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "Cocina"}, PricePerNight: 118.75, Available: true, OwnerID: 1},
	{Name: "Quadruple 4", Description: "Espacioso con balcón", Address: "Av. 9 de Julio 234", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 2, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 135.00, Available: true, OwnerID: 1},
	{Name: "Quadruple 5", Description: "Estilo minimalista", Address: "Av. Cabildo 456", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Lavadora"}, PricePerNight: 122.50, Available: true, OwnerID: 1},
	{Name: "Quadruple 6", Description: "Ideal para familias", Address: "Av. Rivadavia 789", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "TV", "Cocina"}, PricePerNight: 115.00, Available: true, OwnerID: 1},
	{Name: "Quadruple 7", Description: "Luminoso y acogedor", Address: "Av. Córdoba 321", City: "Buenos Aires", MaxGuests: 4, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 130.00, Available: true, OwnerID: 1},

	// 10 Doubles Matrimoniales (capacidad 2)
	{Name: "Double Matrimonial 1", Description: "Romántico para parejas", Address: "Av. Libertador 1111", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV"}, PricePerNight: 85.00, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 2", Description: "Cálido y acogedor", Address: "Av. Corrientes 2222", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "Cocina"}, PricePerNight: 82.50, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 3", Description: "Con vista panorámica", Address: "Av. Santa Fe 3333", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 90.00, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 4", Description: "Moderno y elegante", Address: "Av. 9 de Julio 4444", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV", "Cocina"}, PricePerNight: 88.75, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 5", Description: "Estilo boutique", Address: "Av. Cabildo 5555", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Lavadora"}, PricePerNight: 87.50, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 6", Description: "Tranquilo y silencioso", Address: "Av. Rivadavia 6666", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "TV"}, PricePerNight: 83.00, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 7", Description: "Con terraza privada", Address: "Av. Córdoba 7777", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Terraza"}, PricePerNight: 95.00, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 8", Description: "Centro histórico", Address: "Av. Libertador 8888", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Cocina"}, PricePerNight: 86.25, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 9", Description: "Vista al río", Address: "Av. Corrientes 9999", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 92.50, Available: true, OwnerID: 1},
	{Name: "Double Matrimonial 10", Description: "Estilo clásico porteño", Address: "Av. Santa Fe 1010", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "TV"}, PricePerNight: 89.00, Available: true, OwnerID: 1},

	// 4 Doubles Twin Beds (capacidad 2)
	{Name: "Double Twin 1", Description: "Dos camas individuales", Address: "Av. 9 de Julio 111", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV"}, PricePerNight: 80.00, Available: true, OwnerID: 1},
	{Name: "Double Twin 2", Description: "Ideal para amigos", Address: "Av. Cabildo 222", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "Cocina"}, PricePerNight: 78.50, Available: true, OwnerID: 1},
	{Name: "Double Twin 3", Description: "Espacioso para dos", Address: "Av. Rivadavia 333", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV"}, PricePerNight: 82.00, Available: true, OwnerID: 1},
	{Name: "Double Twin 4", Description: "Cómodo y funcional", Address: "Av. Córdoba 444", City: "Buenos Aires", MaxGuests: 2, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Lavadora"}, PricePerNight: 79.75, Available: true, OwnerID: 1},

	// 10 Triples (capacidad 3)
	{Name: "Triple 1", Description: "Perfecto para tres personas", Address: "Av. Libertador 555", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV", "Cocina"}, PricePerNight: 100.00, Available: true, OwnerID: 1},
	{Name: "Triple 2", Description: "Espacioso y confortable", Address: "Av. Corrientes 666", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 105.00, Available: true, OwnerID: 1},
	{Name: "Triple 3", Description: "Moderno y equipado", Address: "Av. Santa Fe 777", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "TV"}, PricePerNight: 98.50, Available: true, OwnerID: 1},
	{Name: "Triple 4", Description: "Con amplio living", Address: "Av. 9 de Julio 888", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Cocina", "Lavadora"}, PricePerNight: 102.75, Available: true, OwnerID: 1},
	{Name: "Triple 5", Description: "Ideal para familias pequeñas", Address: "Av. Cabildo 999", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV"}, PricePerNight: 103.00, Available: true, OwnerID: 1},
	{Name: "Triple 6", Description: "Céntrico y luminoso", Address: "Av. Rivadavia 101", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón"}, PricePerNight: 99.50, Available: true, OwnerID: 1},
	{Name: "Triple 7", Description: "Estilo contemporáneo", Address: "Av. Córdoba 202", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "Calefacción", "Cocina"}, PricePerNight: 97.00, Available: true, OwnerID: 1},
	{Name: "Triple 8", Description: "Con terraza compartida", Address: "Av. Libertador 303", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 2, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Terraza"}, PricePerNight: 106.50, Available: true, OwnerID: 1},
	{Name: "Triple 9", Description: "Tranquilo y silencioso", Address: "Av. Corrientes 404", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "TV", "Lavadora"}, PricePerNight: 101.25, Available: true, OwnerID: 1},
	{Name: "Triple 10", Description: "Vista privilegiada", Address: "Av. Santa Fe 505", City: "Buenos Aires", MaxGuests: 3, Bedrooms: 1, Bathrooms: 1, Amenities: []string{"WiFi", "AC", "Balcón", "Cocina"}, PricePerNight: 104.00, Available: true, OwnerID: 1},
}

func main() {
	apiURL := "http://localhost:8081/api/v1/apartments"
	if len(os.Args) > 1 {
		apiURL = os.Args[1]
	}

	client := &http.Client{Timeout: 10 * time.Second}

	successCount := 0
	failCount := 0

	for i, apt := range apartments {
		jsonData, err := json.Marshal(apt)
		if err != nil {
			fmt.Printf("Error marshaling apartment %d: %v\n", i+1, err)
			failCount++
			continue
		}

		req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
		if err != nil {
			fmt.Printf("Error creating request for apartment %d: %v\n", i+1, err)
			failCount++
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Error sending request for apartment %d (%s): %v\n", i+1, apt.Name, err)
			failCount++
			continue
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		if resp.StatusCode == http.StatusCreated {
			fmt.Printf("✅ Created apartment %d: %s\n", i+1, apt.Name)
			successCount++
		} else {
			fmt.Printf("❌ Failed to create apartment %d (%s): Status %d - %s\n", i+1, apt.Name, resp.StatusCode, string(body))
			failCount++
		}

		time.Sleep(100 * time.Millisecond) // Pequeña pausa para no sobrecargar
	}

	fmt.Printf("\n📊 Summary: %d created, %d failed (Total: %d)\n", successCount, failCount, len(apartments))
}

