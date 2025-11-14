# ✅ Nuevo Endpoint: GET /api/v1/bookings (Todas las Reservas)

## Resumen / Diagnóstico

**Problema:** El frontend solo mostraba reservas del usuario ID 1 porque estaba usando `/bookings/user/1`.

**Solución:** Creado nuevo endpoint `GET /api/v1/bookings` que retorna TODAS las reservas (públicas y con user_id) para el panel de administración.

## Cambios Realizados

### 1. Backend - Bookings-API

#### Nuevo método en Repository:
- ✅ `GetAll(ctx, filters, skip, limit)` - Retorna todas las reservas con filtros opcionales
- ✅ `Count(ctx, filters)` - Cuenta reservas con filtros opcionales

#### Nuevo método en Service:
- ✅ `GetAllBookings(ctx, filters, page, size)` - Orquesta la obtención de todas las reservas

#### Nuevo endpoint en Controller:
- ✅ `GetAllBookings(ctx)` - Maneja GET /bookings con filtros y paginación

#### Nueva ruta en main.go:
- ✅ `GET /api/v1/bookings` - Endpoint para obtener todas las reservas

### 2. Frontend - Admin Dashboard

#### Actualizado `adminApi.js`:
- ✅ `getAllBookings()` ahora usa `GET /bookings?size=1000` en lugar de `/bookings/user/1`
- ✅ Retorna todas las reservas, incluyendo las públicas (sin user_id)

## Nuevo Endpoint

### GET /api/v1/bookings

Obtiene todas las reservas (para admin).

**Query Parameters (opcionales):**
- `apartment_id`: Filtrar por apartamento específico
- `status`: Filtrar por estado (confirmed, cancelled, pending)
- `user_id`: Filtrar por usuario específico
- `page`: Página (default: 1)
- `size`: Tamaño de página (default: 100, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "apartment_id": 15,
      "user_id": null,
      "user_info": {
        "first_name": "Enzo",
        "last_name": "Frattin",
        "dni": "19873432",
        ...
      },
      "check_in": "2026-01-11T00:00:00Z",
      "check_out": "2026-01-15T00:00:00Z",
      "guests": 2,
      "total_price": 314,
      "payment_method": "transferencia",
      "status": "confirmed",
      "created_by_admin": false,
      ...
    },
    ...
  ],
  "total": 25,
  "page": 1,
  "size": 100,
  "total_pages": 1
}
```

## Ejemplos de Uso

### 1. Obtener todas las reservas
```bash
curl http://localhost:8082/api/v1/bookings
```

### 2. Obtener reservas de un apartamento específico
```bash
curl "http://localhost:8082/api/v1/bookings?apartment_id=15"
```

### 3. Obtener reservas canceladas
```bash
curl "http://localhost:8082/api/v1/bookings?status=cancelled"
```

### 4. Obtener reservas de un usuario específico
```bash
curl "http://localhost:8082/api/v1/bookings?user_id=1"
```

### 5. Obtener reservas públicas (sin user_id)
Para esto, necesitarías filtrar en el frontend las que tienen `user_id: null`.

## Frontend Actualizado

El panel de administración ahora muestra:
- ✅ Todas las reservas públicas (sin user_id)
- ✅ Todas las reservas con user_id
- ✅ Información completa de cada reserva
- ✅ Fechas, huésped, apartamento, total, estado

## Flujo Completo

1. **Usuario público crea reserva** (sin user_id)
   - Frontend llama: `POST /bookings` con `apartment_type` o `apartment_id`
   - Reserva creada con `user_id: null`, `created_by_admin: false`

2. **Admin ve todas las reservas**
   - Frontend llama: `GET /bookings?size=1000`
   - Retorna TODAS las reservas (públicas y con user_id)

3. **Admin puede eliminar/modificar cualquier reserva**
   - Frontend usa: `DELETE /bookings/:id` o `PATCH /bookings/:id`
   - Funciona para reservas públicas y con user_id

---

**✅ El panel de administración ahora muestra todas las reservas, incluyendo las públicas.**

