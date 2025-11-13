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

func main() {
	apartmentsAPIURL := "http://localhost:8081/api/v1/apartments"
	searchAPIURL := "http://localhost:8083/api/v1/search"

	if len(os.Args) > 1 {
		apartmentsAPIURL = os.Args[1]
	}
	if len(os.Args) > 2 {
		searchAPIURL = os.Args[2]
	}

	client := &http.Client{Timeout: 30 * time.Second}

	// Obtener todos los apartamentos
	fmt.Println("📥 Obteniendo apartamentos desde apartments-api...")
	resp, err := client.Get(apartmentsAPIURL + "?size=50")
	if err != nil {
		fmt.Printf("❌ Error obteniendo apartamentos: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("❌ Error leyendo respuesta: %v\n", err)
		return
	}

	var result struct {
		Data []map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("❌ Error parseando JSON: %v\n", err)
		return
	}

	fmt.Printf("✅ Encontrados %d apartamentos\n", len(result.Data))
	fmt.Println("📤 Indexando en Solr (esto puede tardar unos minutos)...")

	// Indexar cada apartamento en Solr
	successCount := 0
	failCount := 0

	for i, apt := range result.Data {
		// Convertir a formato esperado por Solr
		solrDoc := map[string]interface{}{
			"id":             apt["id"],
			"name":           apt["name"],
			"description":    apt["description"],
			"address":        apt["address"],
			"city":           apt["city"],
			"max_guests":     apt["max_guests"],
			"bedrooms":       apt["bedrooms"],
			"bathrooms":      apt["bathrooms"],
			"amenities":      apt["amenities"],
			"price_per_night": apt["price_per_night"],
			"images":         apt["images"],
			"available":     apt["available"],
		}

		payload := map[string]interface{}{
			"add": map[string]interface{}{
				"doc": solrDoc,
			},
		}

		jsonData, _ := json.Marshal(payload)
		solrURL := "http://localhost:8983/solr/apartments/update?commit=true"

		req, _ := http.NewRequest("POST", solrURL, bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("❌ Error indexando apartamento %d: %v\n", i+1, err)
			failCount++
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == 200 {
			fmt.Printf("✅ Indexado apartamento %d: %v\n", i+1, apt["name"])
			successCount++
		} else {
			fmt.Printf("❌ Error indexando apartamento %d: Status %d\n", i+1, resp.StatusCode)
			failCount++
		}

		time.Sleep(50 * time.Millisecond)
	}

	fmt.Printf("\n📊 Summary: %d indexados, %d fallos (Total: %d)\n", successCount, failCount, len(result.Data))
	fmt.Println("\n🔍 Probando búsqueda...")
	
	// Probar búsqueda
	testResp, err := client.Get(searchAPIURL + "?size=5")
	if err == nil {
		defer testResp.Body.Close()
		var searchResult map[string]interface{}
		json.NewDecoder(testResp.Body).Decode(&searchResult)
		if total, ok := searchResult["total"].(float64); ok {
			fmt.Printf("✅ Búsqueda funcionando: %d apartamentos indexados\n", int(total))
		}
	}
}

