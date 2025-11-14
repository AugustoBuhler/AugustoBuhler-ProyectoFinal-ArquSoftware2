# 📋 Lista Completa de Endpoints Funcionales

## 🎯 Resumen General

| Microservicio | Puerto | Base URL | Endpoints |
|--------------|--------|----------|-----------|
| **Users-API** | 8080 | `http://localhost:8080/api/v1` | 4 endpoints |
| **Apartments-API** | 8081 | `http://localhost:8081/api/v1` | 7 endpoints |
| **Bookings-API** | 8082 | `http://localhost:8082/api/v1` | 6 endpoints |
| **Search-API** | 8083 | `http://localhost:8083/api/v1` | 1 endpoint |

**Total: 18 endpoints funcionales**

---

## 1️⃣ USERS-API (Puerto 8080)

### Base URL: `http://localhost:8080/api/v1`

---

### 1.1. Crear Usuario
**POST** `/users`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "juanperez",
  "email": "juan@example.com",
  "password": "password123",
  "first_name": "Juan",
  "last_name": "Perez",
  "user_type": "normal"
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/v1/users`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juanperez",
    "email": "juan@example.com",
    "password": "password123",
    "first_name": "Juan",
    "last_name": "Perez",
    "user_type": "normal"
  }'
```

---

### 1.2. Crear Usuario Admin
**POST** `/users`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "first_name": "Admin",
  "last_name": "User",
  "user_type": "admin"
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/v1/users`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User",
    "user_type": "admin"
  }'
```

---

### 1.3. Login
**POST** `/users/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8080/api/v1/users/login`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response incluye `token` JWT (guardarlo para endpoints protegidos)**

---

### 1.4. Obtener Usuario por ID (Público)
**GET** `/users/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8080/api/v1/users/1`

**cURL:**
```bash
curl http://localhost:8080/api/v1/users/1
```

---

### 1.5. Obtener Usuario por ID (Interno - Sin JWT)
**GET** `/internal/users/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8080/api/v1/internal/users/1`

**cURL:**
```bash
curl http://localhost:8080/api/v1/internal/users/1
```

---

## 2️⃣ APARTMENTS-API (Puerto 8081)

### Base URL: `http://localhost:8081/api/v1`

---

### 2.1. Crear Apartamento
**POST** `/apartments`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Quadruple 1",
  "description": "Amplio departamento para 4 personas",
  "address": "Av. Libertador 1234",
  "city": "Buenos Aires",
  "max_guests": 4,
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["WiFi", "AC", "Cocina"],
  "price_per_night": 120.50,
  "images": [],
  "available": true,
  "owner_id": 1
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8081/api/v1/apartments`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8081/api/v1/apartments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quadruple 1",
    "description": "Amplio departamento para 4 personas",
    "address": "Av. Libertador 1234",
    "city": "Buenos Aires",
    "max_guests": 4,
    "bedrooms": 2,
    "bathrooms": 1,
    "amenities": ["WiFi", "AC", "Cocina"],
    "price_per_night": 120.50,
    "images": [],
    "available": true,
    "owner_id": 1
  }'
```

---

### 2.2. Obtener Apartamento por ID
**GET** `/apartments/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8081/api/v1/apartments/1`

**cURL:**
```bash
curl http://localhost:8081/api/v1/apartments/1
```

---

### 2.3. Obtener Todos los Apartamentos
**GET** `/apartments`

**Query Parameters (opcionales):**
- `city`: Filtrar por ciudad
- `max_guests`: Filtrar por capacidad mínima
- `available`: `true` o `false`
- `page`: Número de página (default: 1)
- `size`: Tamaño de página (default: 10)

**Postman:**
- Method: `GET`
- URL: `http://localhost:8081/api/v1/apartments`
- Con filtros: `http://localhost:8081/api/v1/apartments?city=Buenos Aires&max_guests=4&available=true&page=1&size=10`

**cURL:**
```bash
# Sin filtros
curl http://localhost:8081/api/v1/apartments

# Con filtros
curl "http://localhost:8081/api/v1/apartments?city=Buenos Aires&max_guests=4&available=true&page=1&size=10"
```

---

### 2.4. Actualizar Apartamento
**PATCH** `/apartments/:id`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "price_per_night": 125.00,
  "available": false
}
```

**Postman:**
- Method: `PATCH`
- URL: `http://localhost:8081/api/v1/apartments/1`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X PATCH http://localhost:8081/api/v1/apartments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price_per_night": 125.00,
    "available": false
  }'
```

---

### 2.5. Eliminar Apartamento
**DELETE** `/apartments/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `DELETE`
- URL: `http://localhost:8081/api/v1/apartments/1`

**cURL:**
```bash
curl -X DELETE http://localhost:8081/api/v1/apartments/1
```

---

### 2.6. Obtener Tipos de Apartamentos (Agregado)
**GET** `/apartment-types`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8081/api/v1/apartment-types`

**cURL:**
```bash
curl http://localhost:8081/api/v1/apartment-types
```

**Response:** Retorna array con tipos agregados (quadruple, triple, double_matrimonial, double_twin) con información de conteo, precios, etc.

---

### 2.7. Obtener Apartamento Disponible por Tipo
**GET** `/apartments/available-by-type`

**Query Parameters (requeridos):**
- `type`: Tipo de apartamento (`quadruple`, `triple`, `double_matrimonial`, `double_twin`)
- `check_in`: Fecha de entrada (`YYYY-MM-DD`)
- `check_out`: Fecha de salida (`YYYY-MM-DD`)

**Postman:**
- Method: `GET`
- URL: `http://localhost:8081/api/v1/apartments/available-by-type?type=quadruple&check_in=2026-01-11&check_out=2026-01-15`

**cURL:**
```bash
curl "http://localhost:8081/api/v1/apartments/available-by-type?type=quadruple&check_in=2026-01-11&check_out=2026-01-15"
```

---

## 3️⃣ BOOKINGS-API (Puerto 8082)

### Base URL: `http://localhost:8082/api/v1`

---

### 3.1. Crear Reserva Pública (con apartment_id)
**POST** `/bookings`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "apartment_id": 16,
  "user_info": {
    "first_name": "Laura",
    "last_name": "Esteven",
    "dni": "36763321",
    "phone": "+5491156321456",
    "email": "laura.esteven@example.com"
  },
  "check_in": "2026-01-11",
  "check_out": "2026-01-15",
  "guests": 2,
  "payment_method": "transferencia"
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8082/api/v1/bookings`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8082/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 16,
    "user_info": {
      "first_name": "Laura",
      "last_name": "Esteven",
      "dni": "36763321",
      "phone": "+5491156321456",
      "email": "laura.esteven@example.com"
    },
    "check_in": "2026-01-11",
    "check_out": "2026-01-15",
    "guests": 2,
    "payment_method": "transferencia"
  }'
```

---

### 3.2. Crear Reserva Pública (con apartment_type - asignación automática)
**POST** `/bookings`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "apartment_type": "double_matrimonial",
  "user_info": {
    "first_name": "Pepe",
    "last_name": "Argento",
    "dni": "34611234",
    "phone": "+5491179622111",
    "email": "pepe.argento@example.com"
  },
  "check_in": "2026-01-16",
  "check_out": "2026-01-20",
  "guests": 2,
  "payment_method": "transferencia"
}
```

**Postman:**
- Method: `POST`
- URL: `http://localhost:8082/api/v1/bookings`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8082/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_type": "double_matrimonial",
    "user_info": {
      "first_name": "Pepe",
      "last_name": "Argento",
      "dni": "34611234",
      "phone": "+5491179622111",
      "email": "pepe.argento@example.com"
    },
    "check_in": "2026-01-16",
    "check_out": "2026-01-20",
    "guests": 2,
    "payment_method": "transferencia"
  }'
```

---

### 3.3. Crear Reserva como Admin (para un usuario)
**POST** `/bookings`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "apartment_id": 17,
  "user_id": 1,
  "user_info": {
    "first_name": "Angie",
    "last_name": "Yunes",
    "dni": "46987432",
    "phone": "+5491198765110",
    "email": "angie.yunes@example.com"
  },
  "check_in": "2026-01-05",
  "check_out": "2026-01-10",
  "guests": 2,
  "payment_method": "transferencia"
}
```

**Nota:** `user_id` debe existir en Users-API. La reserva se marca como `created_by_admin: true`.

**Postman:**
- Method: `POST`
- URL: `http://localhost:8082/api/v1/bookings`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X POST http://localhost:8082/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_id": 17,
    "user_id": 1,
    "user_info": {
      "first_name": "Angie",
      "last_name": "Yunes",
      "dni": "46987432",
      "phone": "+5491198765110",
      "email": "angie.yunes@example.com"
    },
    "check_in": "2026-01-05",
    "check_out": "2026-01-10",
    "guests": 2,
    "payment_method": "transferencia"
  }'
```

---

### 3.4. Obtener Todas las Reservas (Admin)
**GET** `/bookings`

**Query Parameters (opcionales):**
- `apartment_id`: Filtrar por apartamento
- `status`: Filtrar por estado (`confirmed`, `cancelled`, `pending`)
- `user_id`: Filtrar por usuario
- `page`: Número de página (default: 1)
- `size`: Tamaño de página (default: 100, max: 100)

**Postman:**
- Method: `GET`
- URL: `http://localhost:8082/api/v1/bookings?size=100`
- Con filtros: `http://localhost:8082/api/v1/bookings?apartment_id=15&status=confirmed&size=50`

**cURL:**
```bash
# Todas las reservas
curl http://localhost:8082/api/v1/bookings?size=100

# Con filtros
curl "http://localhost:8082/api/v1/bookings?apartment_id=15&status=confirmed&size=50"
```

---

### 3.5. Obtener Reserva por ID
**GET** `/bookings/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8082/api/v1/bookings/1`

**cURL:**
```bash
curl http://localhost:8082/api/v1/bookings/1
```

---

### 3.6. Obtener Reservas por Usuario
**GET** `/bookings/user/:user_id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `GET`
- URL: `http://localhost:8082/api/v1/bookings/user/1`

**cURL:**
```bash
curl http://localhost:8082/api/v1/bookings/user/1
```

---

### 3.7. Actualizar Reserva
**PATCH** `/bookings/:id`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "check_in": "2025-11-21",
  "check_out": "2025-11-25"
}
```

**O para cancelar:**
```json
{
  "status": "cancelled"
}
```

**Postman:**
- Method: `PATCH`
- URL: `http://localhost:8082/api/v1/bookings/1`
- Body → raw → JSON
- Copiar el JSON de arriba

**cURL:**
```bash
curl -X PATCH http://localhost:8082/api/v1/bookings/1 \
  -H "Content-Type: application/json" \
  -d '{
    "check_in": "2025-11-21",
    "check_out": "2025-11-25"
  }'
```

---

### 3.8. Eliminar Reserva
**DELETE** `/bookings/:id`

**Headers:**
```
(none)
```

**Postman:**
- Method: `DELETE`
- URL: `http://localhost:8082/api/v1/bookings/1`

**cURL:**
```bash
curl -X DELETE http://localhost:8082/api/v1/bookings/1
```

---

## 4️⃣ SEARCH-API (Puerto 8083)

### Base URL: `http://localhost:8083/api/v1`

---

### 4.1. Buscar Apartamentos
**GET** `/search`

**Query Parameters (opcionales):**
- `q`: Texto libre de búsqueda
- `city`: Filtrar por ciudad
- `capacity`: Capacidad mínima (número de huéspedes)
- `min_price`: Precio mínimo
- `max_price`: Precio máximo
- `check_in`: Fecha de entrada (`YYYY-MM-DD`)
- `check_out`: Fecha de salida (`YYYY-MM-DD`)
- `page`: Número de página (default: 1)
- `size`: Tamaño de página (default: 10)
- `sort_by`: Campo para ordenar (`price`, `name`, etc.)
- `sort_order`: Orden (`asc` o `desc`)

**Postman:**
- Method: `GET`
- URL: `http://localhost:8083/api/v1/search`
- Con filtros: `http://localhost:8083/api/v1/search?city=Buenos Aires&capacity=4&min_price=100&max_price=130&check_in=2025-12-01&check_out=2025-12-05&page=1&size=10&sort_by=price&sort_order=asc`

**cURL:**
```bash
# Búsqueda simple
curl http://localhost:8083/api/v1/search

# Con múltiples filtros
curl "http://localhost:8083/api/v1/search?city=Buenos Aires&capacity=4&min_price=100&max_price=130&check_in=2025-12-01&check_out=2025-12-05&page=1&size=10&sort_by=price&sort_order=asc"
```

---

## 📊 Resumen por Categoría

### 🔐 Autenticación y Usuarios (Users-API)
1. ✅ Crear usuario
2. ✅ Crear usuario admin
3. ✅ Login (obtener JWT)
4. ✅ Obtener usuario por ID
5. ✅ Obtener usuario interno

### 🏠 Apartamentos (Apartments-API)
1. ✅ Crear apartamento
2. ✅ Obtener apartamento por ID
3. ✅ Listar todos los apartamentos (con filtros)
4. ✅ Actualizar apartamento
5. ✅ Eliminar apartamento
6. ✅ Obtener tipos de apartamentos
7. ✅ Obtener apartamento disponible por tipo

### 📅 Reservas (Bookings-API)
1. ✅ Crear reserva pública (con apartment_id)
2. ✅ Crear reserva pública (con apartment_type)
3. ✅ Crear reserva como admin
4. ✅ Listar todas las reservas (admin)
5. ✅ Obtener reserva por ID
6. ✅ Obtener reservas por usuario
7. ✅ Actualizar reserva
8. ✅ Eliminar reserva

### 🔍 Búsqueda (Search-API)
1. ✅ Buscar apartamentos (con múltiples filtros)

---

## 🚀 Cómo Probar en Postman

1. **Crear una Collection:**
   - Nueva Collection → "Proyecto Final ArquSoft II"
   - Crear carpetas: "Users-API", "Apartments-API", "Bookings-API", "Search-API"

2. **Variables de Entorno:**
   - Crear Environment → "Local"
   - Variables:
     - `base_users`: `http://localhost:8080/api/v1`
     - `base_apartments`: `http://localhost:8081/api/v1`
     - `base_bookings`: `http://localhost:8082/api/v1`
     - `base_search`: `http://localhost:8083/api/v1`
     - `token`: (se llena después del login)

3. **Guardar respuestas:**
   - Guardar el `token` del login en la variable `token`
   - Guardar IDs de apartamentos y reservas para usar en otras requests

---

**✅ Total: 18 endpoints funcionales listos para usar**

