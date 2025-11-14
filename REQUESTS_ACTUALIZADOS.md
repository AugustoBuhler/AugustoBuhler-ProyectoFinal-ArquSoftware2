# ✅ Requests HTTP Actualizados

## 📝 Cambios Realizados

Se actualizaron los archivos `requests.http` con nuevos endpoints para probar las funcionalidades internas.

---

## 🔧 Bookings-API (`bookings-api/requests.http`)

### Nuevos Endpoints Agregados:

#### **Request 12: Verificar reservas de un apartamento (simula CheckAvailability)**
```http
GET http://localhost:8082/api/v1/bookings?apartment_id=9&size=100
```
**Descripción:** Obtiene todas las reservas de un apartamento específico para verificar disponibilidad manualmente.

**Nota:** `CheckAvailability` es un método interno que no tiene endpoint HTTP directo, pero puedes ver todas las reservas de un apartamento con este endpoint y verificar solapamientos manualmente.

#### **Request 13: Obtener todos los apartamentos (simula GetAllApartmentsByType)**
```http
GET http://localhost:8081/api/v1/apartments?size=1000
```
**Descripción:** Obtiene todos los apartamentos. Puedes filtrar manualmente por tipo en la respuesta (buscar "Double Matrimonial", "Triple", etc.).

**Nota:** `GetAllApartmentsByType` es un método interno de `bookings-api`, pero puedes obtener todos los apartamentos desde `apartments-api` y filtrar por tipo.

#### **Request 14: Verificar apartamento disponible por tipo y fechas**
```http
GET http://localhost:8081/api/v1/apartments/available-by-type?type=double_matrimonial&check_in=2026-01-28&check_out=2026-01-29
```
**Descripción:** Busca un apartamento disponible del tipo especificado para las fechas dadas.

#### **Request 15: Obtener todos los tipos de apartamentos agregados**
```http
GET http://localhost:8081/api/v1/apartment-types
```
**Descripción:** Retorna tipos agregados con conteos, precios mínimos/máximos, disponibilidad, etc.

---

## 🏠 Apartments-API (`apartments-api/requests.http`)

### Nuevos Endpoints Agregados:

#### **Request 8: Obtener todos los apartamentos (simula GetAllApartmentsByType)**
```http
GET http://localhost:8081/api/v1/apartments?size=1000
```
**Descripción:** Obtiene todos los apartamentos. Filtrar por tipo en la respuesta.

#### **Request 9: Verificar disponibilidad por tipo y fechas**
```http
GET http://localhost:8081/api/v1/apartments/available-by-type?type=double_matrimonial&check_in=2026-01-28&check_out=2026-01-29
```
**Descripción:** Retorna un apartamento disponible del tipo para las fechas especificadas.

#### **Request 10: Obtener tipos de apartamentos agregados**
```http
GET http://localhost:8081/api/v1/apartment-types
```
**Descripción:** Retorna todos los tipos agregados (quadruple, triple, double_matrimonial, double_twin) con información agregada.

---

## 📊 Cómo Probar las Funcionalidades Internas

### 1. Probar GetAllApartmentsByType (simulado)

**Request:**
```http
GET http://localhost:8081/api/v1/apartments?size=1000
```

**En la respuesta, filtrar por tipo:**
- Buscar apartamentos con `"name": "Double Matrimonial X"` → tipo: `double_matrimonial`
- Buscar apartamentos con `"name": "Triple X"` → tipo: `triple`
- Buscar apartamentos con `"name": "Quadruple X"` → tipo: `quadruple`
- Buscar apartamentos con `"name": "Double Twin X"` → tipo: `double_twin`

### 2. Probar CheckAvailability (simulado)

**Request:**
```http
GET http://localhost:8082/api/v1/bookings?apartment_id=9&size=100
```

**Verificar en la respuesta:**
- Si hay reservas con `status: "confirmed"` que se solapen con tus fechas
- Un solapamiento ocurre cuando:
  - `existing.check_in < requested.check_out` AND `existing.check_out > requested.check_in`
- Si hay reservas solapadas, el apartamento NO está disponible
- Si no hay reservas solapadas, el apartamento está disponible

### 3. Verificar Disponibilidad Real

**Request:**
```http
GET http://localhost:8081/api/v1/apartments/available-by-type?type=double_matrimonial&check_in=2026-01-28&check_out=2026-01-29
```

**Este endpoint:**
- Busca todos los apartamentos del tipo
- Verifica disponibilidad real consultando `bookings-api`
- Retorna el primer apartamento disponible encontrado

---

**✅ Los archivos `requests.http` ahora incluyen endpoints para probar estas funcionalidades.**

