# 📋 Nuevos Estados de Reservas - Implementación Completa

## ✅ Cambios Implementados

Se han agregado dos nuevos estados para las reservas y funcionalidades para gestionarlos:

### 🎯 Estados Disponibles

1. **`confirmed`** - Reserva confirmada (estado inicial)
2. **`cancelled`** - Reserva cancelada (puede ser cancelada por admin)
3. **`concluida`** - Reserva concluida (automáticamente cuando pasa la fecha de check-out)
4. **`pending`** - Reserva pendiente (reservado para futuro)

---

## 🔧 Funcionalidades Implementadas

### 1. **Marcar Reserva como Concluida**

**Endpoint:** `PATCH /api/v1/bookings/:id/complete`

**Descripción:** Marca una reserva como "concluida" si su fecha de `check_out` ya pasó.

**Validaciones:**
- La reserva debe estar en estado `"confirmed"`
- La fecha de `check_out` debe ser anterior a la fecha actual
- Si estas condiciones se cumplen, la reserva se marca como "concluida"

**Efecto:**
- ✅ La reserva queda liberada (el apartamento puede ser reservado nuevamente)
- ✅ El estado cambia de `"confirmed"` a `"concluida"` en la base de datos
- ✅ Se publica evento a RabbitMQ para sincronización

**Ejemplo:**
```bash
PATCH http://localhost:8082/api/v1/bookings/27/complete
```

**Respuesta exitosa:**
```json
{
  "id": 27,
  "apartment_id": 16,
  "status": "concluida",
  "check_in": "2026-01-11",
  "check_out": "2026-01-15",
  ...
}
```

**Errores posibles:**
- `400 Bad Request`: "booking check-out date has not passed yet"
- `400 Bad Request`: "booking is not in 'confirmed' status, current status: cancelled"
- `404 Not Found`: "booking not found"

---

### 2. **Cancelar Reserva (Admin)**

**Endpoint:** `PATCH /api/v1/bookings/:id/cancel`

**Descripción:** Marca una reserva como "cancelled". Solo puede ser usada por administradores.

**Validaciones:**
- La reserva no debe estar ya cancelada
- La reserva no debe estar concluida (no se puede cancelar una reserva ya completada)

**Efecto:**
- ✅ La reserva queda liberada (el apartamento puede ser reservado nuevamente)
- ✅ El estado cambia a `"cancelled"` en la base de datos
- ✅ Se publica evento a RabbitMQ para sincronización

**Ejemplo:**
```bash
PATCH http://localhost:8082/api/v1/bookings/27/cancel
```

**Respuesta exitosa:**
```json
{
  "id": 27,
  "apartment_id": 16,
  "status": "cancelled",
  ...
}
```

**Errores posibles:**
- `400 Bad Request`: "booking is already cancelled"
- `400 Bad Request`: "cannot cancel a completed booking"
- `404 Not Found`: "booking not found"

---

### 3. **Marcar Automáticamente Reservas Vencidas como Concluidas**

**Endpoint:** `POST /api/v1/bookings/mark-expired-as-completed`

**Descripción:** Busca todas las reservas confirmadas cuyo `check_out` ya pasó y las marca automáticamente como "concluida".

**Funcionalidad:**
- Busca todas las reservas con estado `"confirmed"`
- Filtra aquellas cuyo `check_out < fecha_actual`
- Marca cada una como `"concluida"`
- Retorna el número de reservas marcadas

**Efecto:**
- ✅ Todas las reservas vencidas se marcan como "concluida"
- ✅ Los apartamentos quedan liberados para nuevas reservas
- ✅ Útil para ejecutar periódicamente (cron job, tarea programada)

**Ejemplo:**
```bash
POST http://localhost:8082/api/v1/bookings/mark-expired-as-completed
```

**Respuesta exitosa:**
```json
{
  "message": "expired bookings marked as completed",
  "completed_count": 5
}
```

---

## 🔍 Validación de Disponibilidad Actualizada

**Cambio importante:** La validación de disponibilidad ahora **excluye** reservas:
- Con estado `"cancelled"`
- Con estado `"concluida"`

**Solo bloquean disponibilidad:**
- Reservas con estado `"confirmed"`
- Reservas con estado `"pending"`

Esto significa que:
- ✅ Un apartamento con reservas concluidas puede ser reservado nuevamente
- ✅ Un apartamento con reservas canceladas puede ser reservado nuevamente
- ✅ Solo las reservas activas (confirmed/pending) bloquean disponibilidad

---

## 📊 Consultas con Filtros

Ahora puedes filtrar reservas por estado:

### Obtener todas las reservas concluidas:
```bash
GET http://localhost:8082/api/v1/bookings?status=concluida&size=100
```

### Obtener todas las reservas canceladas:
```bash
GET http://localhost:8082/api/v1/bookings?status=cancelled&size=100
```

### Obtener todas las reservas confirmadas (activas):
```bash
GET http://localhost:8082/api/v1/bookings?status=confirmed&size=100
```

---

## 🧪 Cómo Probar

### Prueba 1: Marcar reserva como concluida manualmente

1. Crea una reserva con fecha de check-out en el pasado:
```bash
POST http://localhost:8082/api/v1/bookings
Content-Type: application/json

{
  "apartment_id": 9,
  "user_info": {
    "first_name": "Test",
    "last_name": "User",
    "dni": "12345678",
    "phone": "+5491111111111",
    "email": "test@example.com"
  },
  "check_in": "2024-01-01",
  "check_out": "2024-01-05",
  "guests": 2,
  "payment_method": "transferencia"
}
```

2. Marca la reserva como concluida:
```bash
PATCH http://localhost:8082/api/v1/bookings/{id}/complete
```

3. Verifica que el estado cambió:
```bash
GET http://localhost:8082/api/v1/bookings/{id}
```

### Prueba 2: Cancelar una reserva

1. Crea una reserva activa (fechas futuras)
2. Cancela la reserva:
```bash
PATCH http://localhost:8082/api/v1/bookings/{id}/cancel
```

3. Verifica que el estado es "cancelled" y el apartamento puede ser reservado nuevamente

### Prueba 3: Proceso automático de reservas vencidas

1. Crea varias reservas con fechas de check-out en el pasado
2. Ejecuta el proceso automático:
```bash
POST http://localhost:8082/api/v1/bookings/mark-expired-as-completed
```

3. Verifica que todas las reservas vencidas ahora tienen estado "concluida"

---

## 📝 Archivos Modificados

### 1. **`bookings-api/domain/booking.go`**
- ✅ Agregado estado `"concluida"` al comentario del campo `Status`
- ✅ Actualizada validación de `UpdateBookingRequest` para permitir `"concluida"`

### 2. **`bookings-api/repositories/bookings_repository.go`**
- ✅ Actualizado `CheckAvailability` para excluir reservas `"concluida"` además de `"cancelled"`
- ✅ Agregado método `UpdateStatus(ctx, id, status)` - actualiza solo el estado
- ✅ Agregado método `GetExpiredConfirmedBookings(ctx)` - obtiene reservas vencidas

### 3. **`bookings-api/services/bookings_service.go`**
- ✅ Agregado método `CompleteBooking(ctx, id)` - marca reserva como concluida
- ✅ Agregado método `CancelBooking(ctx, id)` - cancela una reserva
- ✅ Agregado método `MarkExpiredBookingsAsCompleted(ctx)` - proceso automático

### 4. **`bookings-api/controllers/bookings_controller.go`**
- ✅ Agregado endpoint `CompleteBooking` - `PATCH /bookings/:id/complete`
- ✅ Agregado endpoint `CancelBooking` - `PATCH /bookings/:id/cancel`
- ✅ Agregado endpoint `MarkExpiredBookingsAsCompleted` - `POST /bookings/mark-expired-as-completed`

### 5. **`bookings-api/main.go`**
- ✅ Agregadas las nuevas rutas al router

### 6. **`bookings-api/requests.http`**
- ✅ Agregados ejemplos de uso de los nuevos endpoints (líneas 180-208)

---

## 🎯 Casos de Uso

### Caso 1: Admin cancela una reserva de cliente
```bash
# El cliente pidió cancelar su reserva
PATCH /api/v1/bookings/42/cancel
# → Reserva marcada como "cancelled"
# → Apartamento liberado para nuevas reservas
```

### Caso 2: Sistema marca automáticamente reservas vencidas
```bash
# Ejecutar diariamente (cron job)
POST /api/v1/bookings/mark-expired-as-completed
# → Todas las reservas con check_out < hoy marcadas como "concluida"
# → Apartamentos liberados automáticamente
```

### Caso 3: Admin marca manualmente una reserva como concluida
```bash
# El huésped se fue antes de la fecha de check-out
PATCH /api/v1/bookings/42/complete
# → Reserva marcada como "concluida"
# → Apartamento liberado inmediatamente
```

---

## 🚀 Próximos Pasos Recomendados

1. **Agregar al Frontend:**
   - Botón "Cancelar" en el Admin Panel para cada reserva
   - Indicador visual del estado de reserva (confirmada, concluida, cancelada)
   - Tarea programada para ejecutar `mark-expired-as-completed` diariamente

2. **Agregar Tarea Programada:**
   - Crear un cron job o tarea programada que ejecute `POST /bookings/mark-expired-as-completed` diariamente
   - Ejecutar a las 00:00 o 01:00 AM para marcar todas las reservas vencidas

3. **Mejoras Opcionales:**
   - Notificaciones cuando una reserva se marca como concluida
   - Historial de cambios de estado
   - Reportes de reservas concluidas vs canceladas

---

## ✅ Resumen

- ✅ Estado `"concluida"` agregado al dominio
- ✅ Estado `"cancelled"` ya estaba disponible
- ✅ Endpoint para marcar reserva como concluida (con validación de fecha)
- ✅ Endpoint para cancelar reserva (admin)
- ✅ Endpoint para proceso automático de reservas vencidas
- ✅ Validación de disponibilidad actualizada (excluye concluidas y canceladas)
- ✅ Documentación y ejemplos agregados

**¡Todo listo para usar!** 🎉

