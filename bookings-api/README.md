# Bookings API

Microservicio para la gestión de reservas de apartamentos con cálculo concurrente.

## Características

- ✅ CRUD completo de reservas
- ✅ **Cálculo concurrente** usando goroutines, channels y WaitGroup
- ✅ Validación de disponibilidad atómica
- ✅ Validación de usuario y apartamento vía HTTP
- ✅ Publicación de eventos a RabbitMQ
- ✅ Soporte para reservas públicas (sin login) y reservas de admin

## Endpoints

### POST /api/v1/bookings
Crear nueva reserva (con cálculo concurrente)

### GET /api/v1/bookings/:id
Obtener reserva por ID

### GET /api/v1/bookings/user/:user_id
Obtener todas las reservas de un usuario

### PATCH /api/v1/bookings/:id
Actualizar reserva (con validación de disponibilidad)

### DELETE /api/v1/bookings/:id
Eliminar reserva

## Características de las Reservas

### Campos Requeridos
- `apartment_id`: ID del apartamento
- `user_info`: Información del huésped
  - `first_name`: Nombre
  - `last_name`: Apellido
  - `dni`: Documento Nacional de Identidad
  - `phone`: Teléfono
  - `email`: Email
- `check_in`: Fecha de entrada (formato: "YYYY-MM-DD")
- `check_out`: Fecha de salida (formato: "YYYY-MM-DD")
- `guests`: Número de huéspedes (capacity_requested)
- `payment_method`: "transferencia" o "efectivo"

### Campos Opcionales
- `user_id`: ID de usuario (si es admin creando para un usuario)

## Cálculo Concurrente

El endpoint POST /bookings implementa cálculo concurrente usando:

1. **Goroutine 1**: Validar y obtener información del apartamento
2. **Goroutine 2**: Validar usuario (si se proporciona user_id)
3. **WaitGroup**: Sincronizar todas las goroutines
4. **Channels**: Comunicar resultados y errores
5. **Validación atómica**: Verificar disponibilidad antes de crear la reserva

## Validación de Disponibilidad

- No se permiten reservas solapadas para el mismo apartamento
- Las reservas canceladas no bloquean disponibilidad
- Validación atómica antes de crear la reserva

## Reservas Públicas vs Admin

- **Reserva Pública**: Sin `user_id`, usuario no requiere login
- **Reserva de Admin**: Con `user_id`, marcada como `created_by_admin: true`

## Pruebas

Usar el archivo `requests.http` con la extensión REST Client de VS Code.

