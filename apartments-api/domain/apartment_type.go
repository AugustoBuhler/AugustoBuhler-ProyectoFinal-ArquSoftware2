package domain

type ApartmentType struct {
	Type        string  `json:"type"`         // "quadruple", "double_matrimonial", "double_twin", "triple"
	Name        string  `json:"name"`         // "Habitación Cuádruple", "Habitación Double Matrimonial", etc.
	Description string  `json:"description"`  // Descripción del tipo
	MaxGuests   int     `json:"max_guests"`   // Capacidad
	Count       int     `json:"count"`        // Cantidad de apartamentos de este tipo
	MinPrice    float64 `json:"min_price"`    // Precio mínimo
	MaxPrice    float64 `json:"max_price"`    // Precio máximo
	Available   bool    `json:"available"`    // Si hay al menos uno disponible
}

// GetApartmentType extrae el tipo de apartamento del nombre
func GetApartmentType(name string) string {
	if len(name) == 0 {
		return "unknown"
	}
	
	// Buscar patrón - verificar desde el inicio del string
	if len(name) >= 9 && name[:9] == "Quadruple" {
		return "quadruple"
	}
	if len(name) >= 18 && name[:18] == "Double Matrimonial" {
		return "double_matrimonial"
	}
	if len(name) >= 11 && name[:11] == "Double Twin" {
		return "double_twin"
	}
	if len(name) >= 6 && name[:6] == "Triple" {
		return "triple"
	}
	
	return "unknown"
}

// GetTypeDisplayName retorna el nombre para mostrar
func GetTypeDisplayName(aptType string) string {
	switch aptType {
	case "quadruple":
		return "Habitación Cuádruple"
	case "double_matrimonial":
		return "Habitación Double Matrimonial"
	case "double_twin":
		return "Habitación Double Twin"
	case "triple":
		return "Habitación Triple"
	default:
		return "Habitación Desconocida"
	}
}

// GetTypeDescription retorna la descripción del tipo
func GetTypeDescription(aptType string) string {
	switch aptType {
	case "quadruple":
		return "Amplio departamento para 4 personas con 2 habitaciones"
	case "double_matrimonial":
		return "Acogedora habitación para 2 personas con cama matrimonial"
	case "double_twin":
		return "Habitación para 2 personas con dos camas individuales"
	case "triple":
		return "Espaciosa habitación para 3 personas"
	default:
		return "Habitación disponible"
	}
}

