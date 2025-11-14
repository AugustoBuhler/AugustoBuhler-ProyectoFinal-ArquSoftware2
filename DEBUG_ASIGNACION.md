# 🔍 Debug: Asignación Automática de Apartamentos

## Estado Actual

- **Apartamentos Double Matrimonial totales:** 3 (IDs 9, 10, 11)
- **Reserva existente:** Apt 9 reservado del 2026-01-25 al 2026-01-28
- **Request:** Crear reserva del 2026-01-25 al 2026-01-28 con `apartment_type="double_matrimonial"`

## Problema

El sistema debería:
1. ✅ Obtener todos los apartamentos del tipo (9, 10, 11)
2. ✅ Verificar disponibilidad de apt 9 → NO disponible (reservado)
3. ✅ Continuar con apt 10 → Verificar disponibilidad
4. ✅ Continuar con apt 11 → Verificar disponibilidad
5. ✅ Asignar el primero disponible encontrado (apt 10 o 11)
6. ❌ **PERO** está retornando error "apartment is not available for the requested date range"

## Verificaciones Necesarias

### 1. Verificar que GetAllApartmentsByType retorna todos los apartamentos
### 2. Verificar que CheckAvailability funciona correctamente para apt 10 y 11
### 3. Verificar que el bucle itera sobre todos los apartamentos
### 4. Verificar que la lógica de reintento funciona correctamente

## Código Relevante

### bookings-api/services/bookings_service.go (líneas 72-118)
```go
// Obtiene todos los apartamentos del tipo
allApartments, err := s.apartmentsClient.GetAllApartmentsByType(req.ApartmentType)

// Itera sobre cada uno verificando disponibilidad
for _, apt := range allApartments {
    if apt.MaxGuests < req.Guests {
        continue
    }
    available, err := s.bookingRepo.CheckAvailability(ctx, apt.ID, checkIn, checkOut, nil)
    if err != nil {
        continue
    }
    if available {
        foundAvailable = apt
        break
    }
}
```

### bookings-api/repositories/bookings_repository.go (líneas 165-194)
```go
func (r *bookingRepository) CheckAvailability(ctx context.Context, apartmentID int64, checkIn, checkOut time.Time, excludeBookingID *int64) (bool, error) {
    filter := bson.M{
        "apartment_id": apartmentID,
        "status":       bson.M{"$ne": "cancelled"},
        "$or": []bson.M{
            {
                "check_in":  bson.M{"$lt": checkOut},
                "check_out": bson.M{"$gt": checkIn},
            },
        },
    }
    count, err := r.collection.CountDocuments(ctx, filter)
    return count == 0, nil
}
```

## Próximos Pasos

1. Agregar logging detallado para ver qué apartamentos está verificando
2. Verificar que GetAllApartmentsByType está retornando los 3 apartamentos
3. Verificar que CheckAvailability retorna `true` para apt 10 y 11
4. Si todo lo anterior está bien, el problema puede estar en la verificación atómica final

