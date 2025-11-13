package repositories

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"search-api/domain"
)

type SolrRepository interface {
	IndexApartment(apt *domain.ApartmentSearchResult) error
	UpdateApartment(apt *domain.ApartmentSearchResult) error
	DeleteApartment(id int64) error
	Search(req domain.SearchRequest) (*domain.SearchResponse, error)
}

type solrRepository struct {
	baseURL string
	client  *http.Client
}

func NewSolrRepository() SolrRepository {
	baseURL := os.Getenv("SOLR_URL")
	if baseURL == "" {
		baseURL = "http://solr:8983/solr/apartments"
	}
	return &solrRepository{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

func (r *solrRepository) IndexApartment(apt *domain.ApartmentSearchResult) error {
	doc := map[string]interface{}{
		"id":             apt.ID,
		"name":           apt.Name,
		"description":    apt.Description,
		"address":        apt.Address,
		"city":           apt.City,
		"max_guests":     apt.MaxGuests,
		"bedrooms":       apt.Bedrooms,
		"bathrooms":      apt.Bathrooms,
		"amenities":      apt.Amenities,
		"price_per_night": apt.PricePerNight,
		"images":         apt.Images,
		"available":      apt.Available,
	}

	payload := map[string]interface{}{
		"add": map[string]interface{}{
			"doc": doc,
		},
	}

	return r.updateSolr(payload)
}

func (r *solrRepository) UpdateApartment(apt *domain.ApartmentSearchResult) error {
	return r.IndexApartment(apt) // En Solr, update es igual que add
}

func (r *solrRepository) DeleteApartment(id int64) error {
	payload := map[string]interface{}{
		"delete": map[string]interface{}{
			"id": id,
		},
	}

	return r.updateSolr(payload)
}

func (r *solrRepository) updateSolr(payload map[string]interface{}) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	updateURL := r.baseURL + "/update?commit=true"
	resp, err := r.client.Post(updateURL, "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		return fmt.Errorf("failed to update Solr: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Solr returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (r *solrRepository) Search(req domain.SearchRequest) (*domain.SearchResponse, error) {
	// Construir query Solr
	query := "*:*" // Por defecto, buscar todo
	if req.Q != "" {
		query = fmt.Sprintf("(name:*%s* OR description:*%s* OR city:*%s*)", req.Q, req.Q, req.Q)
	}

	// Construir filtros
	var filters []string
	if req.City != "" {
		filters = append(filters, fmt.Sprintf("city:\"%s\"", req.City))
	}
	if req.MinPrice > 0 {
		filters = append(filters, fmt.Sprintf("price_per_night:[%f TO *]", req.MinPrice))
	}
	if req.MaxPrice > 0 {
		filters = append(filters, fmt.Sprintf("price_per_night:[* TO %f]", req.MaxPrice))
	}
	if req.Capacity > 0 {
		filters = append(filters, fmt.Sprintf("max_guests:[%d TO *]", req.Capacity))
	}
	// Nota: La validación de disponibilidad se hace después, consultando bookings-api
	// Por ahora, no filtramos por available en Solr (el campo puede no estar indexado aún)
	// En producción, se puede agregar cuando el campo esté disponible

	// Paginación
	page := req.Page
	if page < 1 {
		page = 1
	}
	size := req.Size
	if size < 1 {
		size = 10
	}
	if size > 100 {
		size = 100
	}
	start := (page - 1) * size

	// Ordenamiento
	sortBy := req.SortBy
	if sortBy == "" {
		sortBy = "id"
	}
	sortOrder := req.SortOrder
	if sortOrder == "" {
		sortOrder = "asc"
	}
	if sortBy == "price" {
		sortBy = "price_per_night"
	}

	// Construir URL
	params := url.Values{}
	params.Set("q", query)
	if len(filters) > 0 {
		params.Set("fq", strings.Join(filters, " AND "))
	}
	params.Set("start", strconv.Itoa(start))
	params.Set("rows", strconv.Itoa(size))
	params.Set("sort", fmt.Sprintf("%s %s", sortBy, sortOrder))
	params.Set("wt", "json")

	searchURL := r.baseURL + "/select?" + params.Encode()

	// Realizar búsqueda
	resp, err := r.client.Get(searchURL)
	if err != nil {
		return nil, fmt.Errorf("failed to search Solr: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Solr returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parsear respuesta
	var solrResponse struct {
		Response struct {
			NumFound int64 `json:"numFound"`
			Docs     []map[string]interface{} `json:"docs"`
		} `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&solrResponse); err != nil {
		return nil, fmt.Errorf("failed to decode Solr response: %w", err)
	}

	// Convertir documentos a ApartmentSearchResult
	results := make([]*domain.ApartmentSearchResult, 0, len(solrResponse.Response.Docs))
	for _, doc := range solrResponse.Response.Docs {
		apt := &domain.ApartmentSearchResult{}

		// Helper para obtener valor (puede ser array o valor simple)
		getValue := func(key string) interface{} {
			if val, ok := doc[key]; ok {
				if arr, ok := val.([]interface{}); ok && len(arr) > 0 {
					return arr[0]
				}
				return val
			}
			return nil
		}

		if id := getValue("id"); id != nil {
			// Solr puede devolver ID como string o número
			switch v := id.(type) {
			case float64:
				apt.ID = int64(v)
			case string:
				if idInt, err := strconv.ParseInt(v, 10, 64); err == nil {
					apt.ID = idInt
				}
			}
		}
		if name := getValue("name"); name != nil {
			if nameStr, ok := name.(string); ok {
				apt.Name = nameStr
			}
		}
		if desc := getValue("description"); desc != nil {
			if descStr, ok := desc.(string); ok {
				apt.Description = descStr
			}
		}
		if addr := getValue("address"); addr != nil {
			if addrStr, ok := addr.(string); ok {
				apt.Address = addrStr
			}
		}
		if city := getValue("city"); city != nil {
			if cityStr, ok := city.(string); ok {
				apt.City = cityStr
			}
		}
		if guests := getValue("max_guests"); guests != nil {
			if guestsFloat, ok := guests.(float64); ok {
				apt.MaxGuests = int(guestsFloat)
			}
		}
		if bedrooms := getValue("bedrooms"); bedrooms != nil {
			if bedroomsFloat, ok := bedrooms.(float64); ok {
				apt.Bedrooms = int(bedroomsFloat)
			}
		}
		if bathrooms := getValue("bathrooms"); bathrooms != nil {
			if bathroomsFloat, ok := bathrooms.(float64); ok {
				apt.Bathrooms = int(bathroomsFloat)
			}
		}
		if price := getValue("price_per_night"); price != nil {
			if priceFloat, ok := price.(float64); ok {
				apt.PricePerNight = priceFloat
			}
		}
		if available := getValue("available"); available != nil {
			if availableBool, ok := available.(bool); ok {
				apt.Available = availableBool
			}
		}
		if amenities, ok := doc["amenities"].([]interface{}); ok {
			apt.Amenities = make([]string, 0, len(amenities))
			for _, a := range amenities {
				if s, ok := a.(string); ok {
					apt.Amenities = append(apt.Amenities, s)
				}
			}
		}
		if images, ok := doc["images"].([]interface{}); ok {
			apt.Images = make([]string, 0, len(images))
			for _, img := range images {
				if s, ok := img.(string); ok {
					apt.Images = append(apt.Images, s)
				}
			}
		}

		results = append(results, apt)
	}

	totalPages := int(solrResponse.Response.NumFound) / size
	if int(solrResponse.Response.NumFound)%size > 0 {
		totalPages++
	}

	return &domain.SearchResponse{
		Data:       results,
		Total:      solrResponse.Response.NumFound,
		Page:       page,
		Size:       size,
		TotalPages: totalPages,
	}, nil
}

