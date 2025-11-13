package domain

type ApartmentSearchResult struct {
	ID            int64    `json:"id"`
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
}

type SearchRequest struct {
	Q         string  `form:"q"`          // Query de texto libre
	City      string  `form:"city"`       // Filtro por ciudad
	MinPrice  float64 `form:"min_price"`  // Precio mínimo
	MaxPrice  float64 `form:"max_price"`  // Precio máximo
	Capacity  int     `form:"capacity"`    // Capacidad mínima (max_guests)
	CheckIn   string  `form:"check_in"`   // Fecha de entrada (opcional, para validar disponibilidad)
	CheckOut  string  `form:"check_out"`  // Fecha de salida (opcional, para validar disponibilidad)
	Page      int     `form:"page"`       // Página (default: 1)
	Size      int     `form:"size"`       // Tamaño de página (default: 10)
	SortBy    string  `form:"sort_by"`    // Ordenamiento: "price", "name" (default: "id")
	SortOrder string  `form:"sort_order"`  // Orden: "asc", "desc" (default: "asc")
}

type SearchResponse struct {
	Data       []*ApartmentSearchResult `json:"data"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	Size       int                      `json:"size"`
	TotalPages int                      `json:"total_pages"`
}

