# 🎫 Cómo Hacer Reservas Ahora (Mientras Implementamos Frontend)

## ✅ Ya Puedes Hacer Reservas

**Bookings-API está funcionando correctamente.** Puedes crear, ver, actualizar y eliminar reservas usando REST Client o curl.

## Opción 1: Usando REST Client (Recomendado)

1. Abre `bookings-api/requests.http` en VS Code
2. Instala la extensión "REST Client" si no la tienes
3. Haz clic en "Send Request" sobre cada request

### Ejemplos de Requests:

**Crear Reserva Pública (sin login):**
```http
POST http://localhost:8082/api/v1/bookings
Content-Type: application/json

{
  "apartment_id": 2,
  "user_info": {
    "first_name": "Juan",
    "last_name": "Perez",
    "dni": "12345678",
    "phone": "+5491123456789",
    "email": "juan@example.com"
  },
  "check_in": "2025-11-20",
  "check_out": "2025-11-24",
  "guests": 4,
  "payment_method": "transferencia"
}
```

**Ver Reserva:**
```http
GET http://localhost:8082/api/v1/bookings/1
```

**Ver Todas las Reservas de un Usuario:**
```http
GET http://localhost:8082/api/v1/bookings/user/1
```

## Opción 2: Usando curl (Terminal)

### Crear Reserva
```bash
curl -X POST http://localhost:8082/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 5,
    "user_info": {
      "first_name": "Ana",
      "last_name": "Martinez",
      "dni": "22334455",
      "phone": "+5491166778899",
      "email": "ana@example.com"
    },
    "check_in": "2025-12-01",
    "check_out": "2025-12-05",
    "guests": 4,
    "payment_method": "efectivo"
  }'
```

### Ver Reserva
```bash
curl http://localhost:8082/api/v1/bookings/1
```

### Ver Todas las Reservas
```bash
# Ver todas las reservas de un usuario (si tiene user_id)
curl http://localhost:8082/api/v1/bookings/user/1
```

## ✅ Qué Ya Funciona

- ✅ Crear reservas (públicas y de admin)
- ✅ Ver reservas por ID
- ✅ Ver reservas por usuario
- ✅ Actualizar reservas
- ✅ Cancelar reservas (cambiar status)
- ✅ Eliminar reservas
- ✅ Validación de disponibilidad
- ✅ Cálculo automático de precio

## 🎨 Próximo Paso: Frontend

Para tener una **interfaz visual** donde puedas:
- 🔍 Buscar apartamentos disponibles
- 📅 Seleccionar fechas
- 👤 Completar formulario de reserva
- ✅ Ver tus reservas en una lista
- 🎉 Confirmación visual

**Necesitamos implementar el Frontend (React).**

---

**¿Continuamos con Search-API (para búsquedas mejoradas) o directamente con Frontend (interfaz visual)?**

