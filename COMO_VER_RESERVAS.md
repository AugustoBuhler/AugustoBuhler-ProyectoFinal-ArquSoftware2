# 👀 Cómo Ver Reservas - Guía Completa

## ✅ Ya Puedes Ver Reservas

**Bookings-API está funcionando correctamente.** Puedes ver reservas de varias formas:

## Opción 1: REST Client (VS Code) - RECOMENDADO

1. **Abre** `bookings-api/requests.http` en VS Code
2. **Instala** extensión "REST Client" si no la tienes
3. **Haz clic** en "Send Request" sobre:
   - `### 3. Obtener reserva por ID`
   - `### 4. Obtener reservas por usuario`

### Ejemplo de Requests:

**Ver una reserva específica:**
```http
GET http://localhost:8082/api/v1/bookings/1
```

**Ver todas las reservas de un usuario:**
```http
GET http://localhost:8082/api/v1/bookings/user/1
```

## Opción 2: curl (Terminal)

### Ver una reserva por ID
```bash
curl http://localhost:8082/api/v1/bookings/1
```

### Ver todas las reservas de un usuario
```bash
curl http://localhost:8082/api/v1/bookings/user/1
```

### Ver todas las reservas (formato bonito)
```bash
curl http://localhost:8082/api/v1/bookings/1 | python3 -m json.tool
```

## 📋 Ejemplo de Respuesta

```json
{
  "id": 5,
  "apartment_id": 15,
  "user_info": {
    "id": "4321456",
    "first_name": "Lolo",
    "last_name": "Gala",
    "dni": "4321456",
    "phone": "+5491145654432",
    "email": "lolo@example.com"
  },
  "check_in": "2025-11-25T00:00:00Z",
  "check_out": "2025-11-30T00:00:00Z",
  "guests": 2,
  "total_price": 475,
  "payment_method": "transferencia",
  "status": "confirmed",
  "created_by_admin": false,
  "created_at": "2025-11-13T17:08:07.701Z",
  "updated_at": "2025-11-13T17:08:07.701Z"
}
```

## 🎨 Para Interfaz Visual

**Actualmente NO hay Frontend**, por lo que:
- ❌ No puedes ver reservas en el navegador
- ❌ No hay lista visual de reservas
- ❌ No hay formulario visual para crear reservas

**Para tener interfaz visual, necesitamos implementar Frontend React.**

## 🚀 Próximo Paso: Frontend

El Frontend incluirá:
- 🔍 **Pantalla de búsqueda** de apartamentos
- 📅 **Selector de fechas** (check-in, check-out)
- 📝 **Formulario de reserva** con todos los campos del huésped
- 📋 **Lista de "Mis Reservas"** con todas tus reservas
- 🎉 **Página de confirmación** después de reservar

**Tiempo estimado:** 3-4 horas

---

**✅ Ya puedes ver reservas usando REST Client o curl. Para interfaz visual, implementemos el Frontend.**

