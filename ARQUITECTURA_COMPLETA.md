# Sistema de Reserva de Apartamentos Amoblados
## Documentación Técnica Completa — Arquitectura de Software II

> Este documento describe en detalle completo cómo está construido y cómo funciona el sistema.
> Está pensado para que alguien que nunca vio el proyecto pueda entenderlo desde cero.

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Infraestructura y Docker](#3-infraestructura-y-docker)
4. [Microservicio: Users-API](#4-microservicio-users-api)
5. [Microservicio: Apartments-API](#5-microservicio-apartments-api)
6. [Microservicio: Bookings-API](#6-microservicio-bookings-api)
7. [Microservicio: Search-API](#7-microservicio-search-api)
8. [Frontend React](#8-frontend-react)
9. [Mensajería con RabbitMQ](#9-mensajería-con-rabbitmq)
10. [Búsqueda y Caché (Solr + Memcached)](#10-búsqueda-y-caché-solr--memcached)
11. [Autenticación y Seguridad](#11-autenticación-y-seguridad)
12. [Flujos de Negocio Principales](#12-flujos-de-negocio-principales)
13. [Bases de Datos](#13-bases-de-datos)
14. [Convenciones y Patrones de Código](#14-convenciones-y-patrones-de-código)
15. [Cómo Levantar el Sistema](#15-cómo-levantar-el-sistema)
16. [Limitaciones Conocidas](#16-limitaciones-conocidas)
17. [Referencia Rápida de Endpoints](#17-referencia-rápida-de-endpoints)

---

## 1. Visión General

El sistema es una **plataforma de reservas de apartamentos amoblados** construida con arquitectura de microservicios. Permite:

- A visitantes **buscar apartamentos** por texto, ciudad, precio y capacidad.
- A visitantes **hacer una reserva** sin necesidad de crear cuenta, solo con sus datos personales.
- A administradores **gestionar apartamentos y reservas** desde un panel privado.
- Sincronizar automáticamente el índice de búsqueda cuando se crean/modifican apartamentos.

**Tecnologías principales:**

| Capa | Tecnología |
|------|-----------|
| Lenguaje de backend | Go 1.21 con framework Gin |
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Base de datos relacional | MySQL 8.0 (usuarios) |
| Base de datos documental | MongoDB 4.4 (apartamentos, reservas) |
| Motor de búsqueda | Apache Solr 8.11 |
| Caché distribuida | Memcached 1.6 |
| Mensajería asíncrona | RabbitMQ 3 |
| Orquestación | Docker Compose |

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama General

```
                          ┌─────────────────────────────────────┐
                          │         USUARIO / NAVEGADOR         │
                          └──────────────────┬──────────────────┘
                                             │ HTTP :3000
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         FRONTEND (React SPA)        │
                          │              Puerto 3000            │
                          └─────┬──────┬──────┬──────┬─────────┘
                                │      │      │      │
              ┌─────────────────┘      │      │      └─────────────────┐
              │ :8080                  │:8081  │:8082                   │:8083
              ▼                        ▼       ▼                        ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │   USERS-API      │  │  APARTMENTS-API  │  │  BOOKINGS-API    │  │   SEARCH-API     │
   │   Puerto 8080    │  │   Puerto 8081    │  │   Puerto 8082    │  │   Puerto 8083    │
   │                  │  │                  │  │                  │  │                  │
   │  - Registro      │  │  - CRUD apart.   │  │  - Crear reserva │  │  - Búsqueda      │
   │  - Login/JWT     │  │  - Tipos apart.  │  │  - Disponibilidad│  │    full-text     │
   │  - Roles         │  │  - Asignación    │  │  - Scheduler     │  │  - Cache L1 + L2 │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                      │                     │
            │                     │ publica eventos      │ consulta            │ indexa
            │                     ▼                      ▼                     ▼
            │            ┌──────────────────────────────────────────────────────────────┐
            │            │                      RabbitMQ                                │
            │            │   Exchange: apartments.events  |  Exchange: bookings.events  │
            │            │                Puerto 5672 / UI: 15672                       │
            │            └───────────────────────────────┬──────────────────────────────┘
            │                                            │ consume apartments.events
            │                                            ▼
            │                                   ┌────────────────┐
            │                                   │  SEARCH-API    │
            │                                   │  RabbitMQ      │
            │                                   │  Consumer      │
            │                                   └───────┬────────┘
            │                                           │ indexa
            │                                           ▼
            │                              ┌────────────────────────┐
            │                              │     Apache Solr        │
            │                              │  Colección: apartments │
            │                              │      Puerto 8983       │
            │                              └────────────────────────┘
            │
   ┌─────────────────────────────────────────────────────────────────────┐
   │                           BASES DE DATOS                            │
   │                                                                     │
   │  ┌────────────────┐   ┌─────────────────────────────────────────┐  │
   │  │ MySQL :3306    │   │            MongoDB :27017               │  │
   │  │                │   │                                         │  │
   │  │  users_db      │   │  apartments_db         bookings_db      │  │
   │  │  tabla: users  │   │  col: apartments       col: bookings    │  │
   │  └────────────────┘   └─────────────────────────────────────────┘  │
   └─────────────────────────────────────────────────────────────────────┘

   ┌────────────────┐
   │  Memcached     │  ← Caché L2 de Search-API (TTL 15 min)
   │  Puerto 11211  │
   └────────────────┘
```

### 2.2 Comunicación entre servicios

Los servicios se comunican de dos formas:

**Sincrónica (HTTP):** Cuando un servicio necesita datos de otro en tiempo real.
- `bookings-api` llama a `apartments-api` para obtener el apartamento y verificar disponibilidad.
- `bookings-api` llama a `users-api` para validar que el usuario existe.
- `apartments-api` llama a `users-api` para validar que el propietario existe al crear un apartamento.
- `search-api` llama a `apartments-api` para obtener los datos completos de un apartamento cuando llega un evento de RabbitMQ.

**Asincrónica (RabbitMQ):** Para actualizar el índice de búsqueda sin bloquear la operación principal.
- `apartments-api` publica un evento cada vez que crea, actualiza o elimina un apartamento.
- `search-api` consume esos eventos y actualiza Solr automáticamente.

### 2.3 Puertos del sistema

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 3000 | Aplicación React |
| users-api | 8080 | API de usuarios y autenticación |
| apartments-api | 8081 | API de apartamentos |
| bookings-api | 8082 | API de reservas |
| search-api | 8083 | API de búsqueda |
| MySQL | 3306 | Base de datos relacional |
| MongoDB | 27017 | Base de datos documental |
| RabbitMQ | 5672 | Mensajería (AMQP) |
| RabbitMQ UI | 15672 | Panel de administración RabbitMQ |
| Solr | 8983 | Motor de búsqueda |
| Memcached | 11211 | Caché distribuida |

---

## 3. Infraestructura y Docker

Todo el sistema corre en contenedores Docker orquestados con Docker Compose. Todos los servicios están en la misma red virtual `app-network`.

### 3.1 Servicios de infraestructura

**MySQL 8.0**
- Almacena los usuarios del sistema.
- Credenciales de desarrollo: usuario `root`, contraseña `root`.
- Base de datos: `users_db`.
- El esquema de la tabla `users` se crea automáticamente mediante GORM al iniciar `users-api`.

**MongoDB 4.4.6**
- Almacena apartamentos y reservas en formato de documentos JSON.
- Credenciales de desarrollo: usuario `root`, contraseña `root`.
- Dos bases de datos: `apartments_db` (colección `apartments`) y `bookings_db` (colección `bookings`).
- Las colecciones se crean automáticamente al primer insert.

**RabbitMQ 3 (con Management UI)**
- Message broker para comunicación asíncrona entre servicios.
- Credenciales: usuario `admin`, contraseña `admin`.
- Panel de administración en `http://localhost:15672`.
- Se usan dos exchanges del tipo `topic`: `apartments.events` y `bookings.events`.

**Apache Solr 8.11**
- Motor de búsqueda full-text.
- Al iniciar, Docker ejecuta automáticamente `solr-precreate apartments` para crear la colección.
- Solo `search-api` habla con Solr directamente.

**Memcached 1.6**
- Caché distribuida que usa `search-api` como segunda capa de caché (L2).
- No tiene persistencia; si se reinicia, la caché se pierde.

### 3.2 Healthchecks

Docker Compose define healthchecks para todos los servicios de infraestructura. Los microservicios esperan a que sus dependencias estén `healthy` antes de arrancar (condición `service_healthy`). Esto evita errores de conexión durante el arranque.

### 3.3 Credenciales de desarrollo

```
MySQL:      root / root
MongoDB:    root / root
RabbitMQ:   admin / admin
JWT Secret: your-secret-key-change-in-production  (en docker-compose.yml)
```

**Importante:** Estas credenciales son solo para desarrollo local. En producción deben moverse a variables de entorno protegidas.

---

## 4. Microservicio: Users-API

**Puerto:** 8080  
**Base de datos:** MySQL 8.0 (`users_db`, tabla `users`)  
**Responsabilidad:** Registro de usuarios, autenticación con JWT y validación de identidad para otros servicios.

### 4.1 Modelo de dominio

```go
// Usuario almacenado en MySQL
User {
    ID        uint      // auto-incremental
    Username  string    // único en la tabla
    Email     string    // único, formato validado
    Password  string    // hash bcrypt, nunca se devuelve en respuestas
    FirstName string
    LastName  string
    UserType  string    // "normal" (por defecto) o "admin"
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### 4.2 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/users` | Registrar usuario nuevo |
| POST | `/api/v1/users/login` | Login: devuelve JWT + datos del usuario |
| GET | `/api/v1/users/:id` | Obtener usuario por ID |
| GET | `/api/v1/internal/users/:id` | Uso interno (otros microservicios validan existencia) |

### 4.3 Lógica de negocio

**Registro (`POST /api/v1/users`)**
1. Valida que `username` y `email` sean únicos.
2. Hashea la contraseña con bcrypt (cost 10).
3. Si no se especifica `user_type`, se asigna `"normal"`.
4. Guarda en MySQL vía GORM.
5. Devuelve el usuario sin el campo `password`.

**Login (`POST /api/v1/users/login`)**
1. Busca al usuario por `username`.
2. Compara la contraseña recibida con el hash bcrypt almacenado.
3. Si es válida, genera un JWT firmado con HS256:
   - Claims: `user_id`, `user_type`, `exp` (expira en 24 horas).
   - Firmado con `JWT_SECRET` del entorno.
4. Devuelve `{ "token": "eyJ...", "user": {...} }`.

### 4.4 Validación de request

```json
// POST /api/v1/users
{
    "username":   "juan123",          // requerido
    "email":      "juan@mail.com",    // requerido, formato email
    "password":   "secreto",          // requerido, mín 6 chars
    "first_name": "Juan",             // requerido
    "last_name":  "Pérez",            // requerido
    "user_type":  "admin"             // opcional, default "normal"
}

// POST /api/v1/users/login
{
    "username": "juan123",  // requerido
    "password": "secreto"   // requerido
}
```

### 4.5 Arquitectura interna

Sigue el patrón en capas estándar del proyecto:

```
HTTP Request
    → Controller (valida input, mapea HTTP ↔ dominio)
        → Service (lógica de negocio, bcrypt, JWT)
            → Repository (SQL vía GORM)
                → MySQL
```

---

## 5. Microservicio: Apartments-API

**Puerto:** 8081  
**Base de datos:** MongoDB (`apartments_db`, colección `apartments`)  
**Responsabilidad:** CRUD de apartamentos, agrupación por tipos y asignación automática de apartamento disponible.

### 5.1 Modelo de dominio

```go
// Apartamento almacenado en MongoDB
Apartment {
    ID            int64     // identificador numérico
    Name          string    // ej: "Quadruple Room A"
    Description   string
    Address       string
    City          string
    MaxGuests     int       // capacidad máxima de huéspedes
    Bedrooms      int
    Bathrooms     int
    Amenities     []string  // ej: ["wifi", "ac", "pool"]
    PricePerNight float64
    Images        []string  // URLs de imágenes
    Available     bool
    OwnerID       int64     // ID de usuario en users-api
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

**Tipos de apartamento:** El sistema clasifica los apartamentos en 4 tipos según el prefijo del nombre:

| Tipo | Prefijo del nombre | Descripción |
|------|-------------------|-------------|
| `quadruple` | "Quadruple" | Habitación cuádruple |
| `triple` | "Triple" | Habitación triple |
| `double_matrimonial` | "Double Matrimonial" | Doble matrimonial |
| `double_twin` | "Double Twin" | Doble twin |

El sistema tiene 31 apartamentos pre-cargados: 7 cuadruples, 10 dobles matrimoniales, 4 dobles twin, 10 triples.

### 5.2 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/apartments` | Crear apartamento |
| GET | `/api/v1/apartments` | Listar apartamentos (con filtros y paginación) |
| GET | `/api/v1/apartments/:id` | Obtener apartamento por ID |
| PATCH | `/api/v1/apartments/:id` | Actualizar apartamento |
| DELETE | `/api/v1/apartments/:id` | Eliminar apartamento |
| GET | `/api/v1/apartment-types` | Tipos de apartamentos con precios y conteos |
| GET | `/api/v1/apartments/available-by-type` | Primer apartamento disponible del tipo pedido |

### 5.3 Lógica de negocio

**Crear apartamento (`POST /api/v1/apartments`)**
1. Llama a `users-api` para validar que el `owner_id` existe.
2. Inserta el apartamento en MongoDB.
3. Publica evento `"created"` en el exchange `apartments.events` de RabbitMQ.

**Listar apartamentos (`GET /api/v1/apartments`)**
- Parámetros de query opcionales: `city`, `available` (bool), `max_guests`, `page`, `size`.
- Paginación: página 1 por defecto, máx 100 items por página.

**Tipos de apartamentos (`GET /api/v1/apartment-types`)**
- Obtiene todos los apartamentos de MongoDB.
- Los agrupa por tipo (según prefijo del nombre).
- Para cada tipo calcula: cantidad total, precio mínimo, precio máximo, si hay disponibles.
- Devuelve array ordenado: quadruple → triple → double_matrimonial → double_twin.

```json
// Ejemplo de respuesta
[
    {
        "type":        "quadruple",
        "name":        "Habitación Cuádruple",
        "description": "Espaciosa habitación para 4 personas",
        "max_guests":  4,
        "count":       7,
        "min_price":   120.0,
        "max_price":   200.0,
        "available":   true
    }
]
```

**Apartamento disponible por tipo (`GET /api/v1/apartments/available-by-type`)**
- Recibe parámetros: `type`, `check_in`, `check_out`, `guests`.
- Filtra apartamentos del tipo indicado que tengan `available: true` y suficiente capacidad.
- Devuelve el primero que encuentre.
- **Nota importante:** Esta verificación solo mira el campo `available` del apartamento, no las reservas reales. La verificación real de disponibilidad por fechas la hace `bookings-api` internamente con su query a MongoDB.

**Eliminar apartamento (`DELETE /api/v1/apartments/:id`)**
- Elimina de MongoDB.
- Publica evento `"deleted"` en RabbitMQ para que `search-api` lo elimine de Solr.

### 5.4 Mensajería (Publisher)

Cada vez que se crea, actualiza o elimina un apartamento, `apartments-api` publica un evento en RabbitMQ:

```json
{
    "action":    "created",   // "created" | "updated" | "deleted"
    "id":        42,
    "timestamp": "42"
}
```

`search-api` escucha estos eventos para mantener Solr sincronizado.

---

## 6. Microservicio: Bookings-API

**Puerto:** 8082  
**Bases de datos:** MongoDB (`bookings_db`, colección `bookings`) + MySQL (`finance_db`, tabla `payments`)  
**Responsabilidad:** Motor central de reservas — creación, disponibilidad, ciclo de vida, pagos, estadísticas y scheduler automático.

Esta es la parte más compleja y crítica del sistema.

### 6.1 Modelo de dominio

```go
// Información del huésped (obligatoria en toda reserva)
GuestInfo {
    ID        string  // DNI como identificador
    FirstName string
    LastName  string
    DNI       string
    Phone     string
    Email     string  // validado
}

// Reserva almacenada en MongoDB
Booking {
    ID               int64
    ApartmentID      int64
    UserID           *int64     // puntero, nil en reservas públicas
    GuestInfo        GuestInfo
    CheckIn          time.Time  // almacenado UTC, serializado como "YYYY-MM-DD"
    CheckOut         time.Time  // almacenado UTC, serializado como "YYYY-MM-DD"
    Guests           int
    TotalPrice       float64    // precio en moneda local (ARS)
    PaymentMethod    string     // "transferencia" o "efectivo"
    Status           string     // ver estados abajo
    USDAmount        *float64   // nil hasta que se marque como pagado
    ExchangeRateUsed *float64   // tasa de cambio al momento del pago
    PaidAt           *time.Time // nil hasta que se marque como pagado
    CreatedByAdmin   bool
    AdminUserID      *int64
    CreatedAt        time.Time
    UpdatedAt        time.Time
}
```

**Estados posibles de una reserva:**

```
                    ┌──────────────┐
                    │   confirmed  │  ← Estado inicial al crear reserva
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐   ┌────────────┐   ┌─────────────┐
   │  pagado    │   │ cancelled  │   │  concluida  │
   │            │   │            │   │             │
   │ Admin marcó│   │ Admin can- │   │ Pasó el     │
   │ como pagado│   │ celó       │   │ check-out   │
   │ con tasa   │   │            │   │ (scheduler) │
   │ USD        │   │            │   │             │
   └────────────┘   └────────────┘   └─────────────┘
```

### 6.2 Endpoints

**Reservas:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/bookings` | Crear reserva (pública o admin) |
| GET | `/api/v1/bookings` | Listar todas las reservas (con filtros) |
| GET | `/api/v1/bookings/:id` | Obtener reserva por ID |
| GET | `/api/v1/bookings/user/:user_id` | Reservas de un usuario |
| PATCH | `/api/v1/bookings/:id` | Actualizar fechas/huéspedes/método de pago |
| DELETE | `/api/v1/bookings/:id` | Eliminar reserva |
| PATCH | `/api/v1/bookings/:id/complete` | Marcar como "concluida" (manual) |
| PATCH | `/api/v1/bookings/:id/cancel` | Cancelar reserva |
| PATCH | `/api/v1/bookings/:id/paid` | Marcar como pagada (con conversión USD) |
| POST | `/api/v1/bookings/mark-expired-as-completed` | Disparador manual del scheduler |

**Configuración financiera:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/config/dollar-rate` | Obtener tasa de cambio actual |
| PUT | `/api/v1/config/dollar-rate` | Actualizar tasa de cambio |
| GET | `/api/v1/config/dollar-rate/history` | Historial de cambios de tasa |

**Estadísticas:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/stats/finance` | Resumen financiero (ingresos, métodos de pago) |
| GET | `/api/v1/stats/payments` | Todos los registros de pagos |

### 6.3 Creación de reserva — lógica detallada

El endpoint `POST /api/v1/bookings` soporta dos modos:

**Modo público (cliente sin cuenta):** envía `apartment_type`.  
**Modo admin (con cuenta admin):** puede enviar `apartment_id` directo o también `apartment_type`.

```json
// Request de ejemplo (reserva pública)
{
    "apartment_type": "quadruple",
    "check_in":       "2026-03-15",
    "check_out":      "2026-03-20",
    "guests":         3,
    "payment_method": "transferencia",
    "guest_info": {
        "first_name": "María",
        "last_name":  "García",
        "dni":        "12345678",
        "phone":      "+5491234567890",
        "email":      "maria@mail.com"
    }
}
```

**Flujo interno paso a paso:**

```
1. Validar input básico
   ├─ ¿check_in < check_out? (error si no)
   └─ ¿check_in en el futuro? (error si está en el pasado)

2. Seleccionar apartamento
   ├─ Si se envió apartment_id (admin):
   │    └─ Usar ese apartamento directamente
   │
   └─ Si se envió apartment_type (público):
        └─ Llamar a apartments-api para obtener TODOS los apartamentos del tipo
           └─ Iterar cada uno y verificar disponibilidad en MongoDB
              └─ Usar el primero que esté disponible (máx 5 intentos)

3. Validación concurrente con goroutines + WaitGroup
   ├─ Goroutine 1: Llamar a apartments-api, validar que existe y tiene capacidad
   │                (apartment.max_guests >= booking.guests)
   └─ Goroutine 2: Llamar a users-api si se proveyó user_id (validar que existe)
   → Ambas goroutines corren en paralelo, se espera con WaitGroup
   → Los errores se recogen por un channel con buffer capacidad 2

4. CheckAvailability — query atómica en MongoDB
   db.bookings.find({
       apartment_id: <id>,
       check_in:  { $lt: checkOut },   ← el check_in existente es antes del check_out pedido
       check_out: { $gt: checkIn },    ← el check_out existente es después del check_in pedido
       status: { $nin: ["cancelled", "concluida"] }
   })
   → Si devuelve documentos: el apartamento está ocupado en ese período
   → Si no devuelve nada: está disponible

5. Calcular precio
   días = ceil((checkOut - checkIn) / 24h), mínimo 1 día
   totalPrice = días × apartment.price_per_night

6. Insertar en MongoDB con status "confirmed"

7. Publicar evento en bookings.events de RabbitMQ
```

### 6.4 Manejo de fechas — invariante crítica

Las fechas se almacenan como UTC sin componente horario para evitar desfasajes de zona horaria.

```go
// El frontend envía: "2026-03-15" (string)
// El backend parsea así:
t, _ := time.Parse("2006-01-02", "2026-03-15")
date := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
// Resultado: 2026-03-15T00:00:00Z (UTC puro, sin offset)

// La respuesta serializa así:
func formatDateOnly(t time.Time) string {
    return fmt.Sprintf("%04d-%02d-%02d", t.UTC().Year(), t.UTC().Month(), t.UTC().Day())
}
// El frontend recibe de vuelta: "2026-03-15"
```

**Por qué es importante:** Si se usara `time.Now().Local()` o se guardara la hora, un apartamento reservado el "15 de marzo" en Argentina (-3 UTC) se guardaría como "2026-03-14T21:00:00Z" y aparecería como el día 14 en los reportes del servidor (que corre en UTC). Este patrón evita ese problema.

### 6.5 Scheduler automático

`bookings-api` arranca una goroutine en background que se ejecuta cada día a las **00:05 UTC**:

```go
func runDailyScheduler(service BookingsService) {
    for {
        now := time.Now().UTC()
        next := time.Date(now.Year(), now.Month(), now.Day(), 0, 5, 0, 0, time.UTC)
        if now.After(next) {
            next = next.Add(24 * time.Hour)
        }
        time.Sleep(next.Sub(now))
        service.MarkExpiredBookingsAsCompleted()
    }
}
```

`MarkExpiredBookingsAsCompleted` busca todas las reservas con status `"confirmed"` cuyo `check_out` ya pasó y las marca como `"concluida"`.

También se puede disparar manualmente con `POST /api/v1/bookings/mark-expired-as-completed`.

### 6.6 Sistema de pagos

**Marcar como pagada (`PATCH /api/v1/bookings/:id/paid`)**
- El admin ingresa la tasa de cambio del dólar del día.
- El sistema calcula: `usd_amount = total_price * dollar_rate`.
- Actualiza: `status = "pagado"`, guarda `usd_amount`, `exchange_rate_used`, `paid_at`.
- Registra el pago en la tabla `payments` de MySQL (finance_db) para estadísticas.

**Tasa de cambio (`PUT /api/v1/config/dollar-rate`)**
- El admin puede actualizar la tasa de cambio actual.
- Cada cambio queda registrado en historial (`GET /api/v1/config/dollar-rate/history`).

---

## 7. Microservicio: Search-API

**Puerto:** 8083  
**Tecnologías:** Apache Solr (índice), Memcached (caché L2), caché local en memoria (caché L1)  
**Responsabilidad:** Búsqueda full-text de apartamentos con doble capa de caché y sincronización automática via RabbitMQ.

### 7.1 Endpoint de búsqueda

```
GET /api/v1/search

Parámetros de query (todos opcionales):
  q          - texto libre (busca en nombre, descripción y ciudad)
  city       - filtro por ciudad exacta
  min_price  - precio mínimo por noche
  max_price  - precio máximo por noche
  capacity   - capacidad mínima (max_guests >= valor)
  check_in   - fecha de entrada (incluida en la clave de caché, pero NO filtra reservas)
  check_out  - fecha de salida (idem)
  page       - página (default 1)
  size       - resultados por página (default 10, máx 100)
  sort_by    - campo de ordenamiento: "id" o "price" (default "id")
  sort_order - "asc" o "desc" (default "asc")
```

```json
// Ejemplo de respuesta
{
    "data": [
        {
            "id":             1,
            "name":           "Quadruple Room A",
            "description":    "Espaciosa habitación para 4 personas",
            "city":           "Buenos Aires",
            "max_guests":     4,
            "price_per_night": 150.0,
            "available":      true
        }
    ],
    "total":       31,
    "page":        1,
    "size":        10,
    "total_pages": 4
}
```

### 7.2 Patrón Cache-Aside (tres capas)

```
Request llega
    │
    ├─ 1. Generar clave de caché (MD5 de todos los parámetros)
    │
    ├─ 2. Buscar en Caché L1 (en memoria, TTL 5 min)
    │       ├─ HIT → devolver resultado inmediatamente
    │       └─ MISS → continuar
    │
    ├─ 3. Buscar en Caché L2 (Memcached, TTL 15 min)
    │       ├─ HIT → guardar en L1, devolver resultado
    │       └─ MISS → continuar
    │
    └─ 4. Consultar Solr (fuente de verdad)
            └─ Guardar resultado en L2 y L1
            └─ Devolver resultado
```

**Generación de clave de caché:**
```go
keyData := fmt.Sprintf("%s|%s|%f|%f|%d|%s|%s|%d|%d|%s|%s",
    q, city, minPrice, maxPrice, capacity,
    checkIn, checkOut, page, size, sortBy, sortOrder)
hash := md5.Sum([]byte(keyData))
cacheKey := fmt.Sprintf("search:%x", hash)
// Ejemplo: "search:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
```

**Por qué dos capas:**
- **L1 local (5 min):** Extremadamente rápida (acceso en memoria), sin latencia de red. Útil para los mismos parámetros repetidos en ráfaga.
- **L2 Memcached (15 min):** Compartida entre múltiples instancias del servicio (si hubiera escalado horizontal). Persiste aunque el proceso reinicie.

**Limitación actual:** Cuando un apartamento cambia, Solr se actualiza vía RabbitMQ, pero la caché NO se invalida activamente. Los usuarios pueden ver resultados desactualizados hasta que venza el TTL (máximo 15 minutos).

### 7.3 Consulta a Solr

`search-api` traduce los parámetros de búsqueda en una query HTTP a Solr:

```
GET http://solr:8983/solr/apartments/select?
    q=(name:*texto* OR description:*texto* OR city:*texto*)
    &fq=city:"Buenos Aires"
    &fq=price_per_night:[100 TO 300]
    &fq=max_guests:[4 TO *]
    &start=0
    &rows=10
    &sort=price_per_night asc
    &wt=json
```

Si no hay texto de búsqueda (`q`), usa `*:*` (devuelve todos).

### 7.4 Consumer de RabbitMQ

`search-api` también corre un consumer en background que escucha el exchange `apartments.events`:

```
Evento recibido: { "action": "created", "id": 42 }
    │
    ├─ action == "created" o "updated":
    │       1. GET http://apartments-api:8081/api/v1/apartments/42
    │       2. Obtener datos completos del apartamento
    │       3. POST al endpoint de Solr para indexar/actualizar el documento
    │       4. Ack del mensaje (confirmado)
    │
    └─ action == "deleted":
            1. DELETE del documento en Solr con id=42
            2. Ack del mensaje
```

Si falla (Solr inaccesible, apartments-api inaccesible), hace **nack con requeue** para que RabbitMQ lo reintente más tarde.

---

## 8. Frontend React

**Puerto:** 3000  
**Tecnologías:** React 18, React Router v6, TailwindCSS, Framer Motion, Axios, Vite

### 8.1 Cómo el frontend se conecta a los backends

El frontend detecta si está corriendo en desarrollo local o en Docker y ajusta las URLs base:

```javascript
// Si hostname es "localhost" → desarrollo directo
// Si no → usa variables VITE_* del docker-compose

const BOOKINGS_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8082'
    : import.meta.env.VITE_BOOKINGS_API_URL

const APARTMENTS_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8081'
    : import.meta.env.VITE_APARTMENTS_API_URL

const SEARCH_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8083'
    : import.meta.env.VITE_SEARCH_API_URL

const USERS_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : import.meta.env.VITE_USERS_API_URL
```

### 8.2 Páginas y rutas

```
/                          → HomePage
/search                    → SearchPage
/apartment/:id             → ApartmentDetailPage
/booking                   → BookingPage (con ?apartmentId= o ?type= en query)
/confirmation/:bookingId   → ConfirmationPage
/booking-status            → BookingStatusPage
/admin/login               → AdminLoginPage
/admin/dashboard           → AdminDashboard (ruta protegida)
```

**Descripción de cada página:**

**`/` — HomePage**
- Muestra una sección hero con llamada a la acción.
- Llama a `GET /api/v1/apartment-types` (apartments-api) y renderiza tarjetas por tipo.
- Cada tipo tiene precio mínimo/máximo, cantidad y disponibilidad.
- Botón de búsqueda que lleva a `/search`.

**`/search` — SearchPage**
- Panel de filtros: texto libre, ciudad, rango de precios, capacidad, check-in/check-out.
- Llama a `GET /api/v1/search` (search-api) con los parámetros del formulario.
- Muestra resultados paginados como tarjetas de apartamento.
- Al hacer click en una tarjeta va a `/apartment/:id`.

**`/apartment/:id` — ApartmentDetailPage**
- Llama a `GET /api/v1/apartments/:id` (apartments-api).
- Muestra fotos, descripción, amenidades, precio, capacidad.
- Botón "Reservar" que lleva a `/booking?apartmentId=:id`.

**`/booking` — BookingPage**
- Formulario de reserva completo.
- Lee `?apartmentId=` o `?type=` de la URL para saber qué reservar.
- Campos: fechas, cantidad de huéspedes, método de pago, datos del huésped (nombre, apellido, DNI, teléfono, email).
- Al enviar llama a `POST /api/v1/bookings` (bookings-api).
- Si hay conflicto de fechas, ofrece buscar otro apartamento del mismo tipo.
- En éxito, redirige a `/confirmation/:bookingId`.

**`/confirmation/:bookingId` — ConfirmationPage**
- Llama a `GET /api/v1/bookings/:id` (bookings-api).
- Muestra el resumen completo de la reserva (datos del huésped, apartamento, fechas, precio).
- Proporciona el ID de reserva para consultas futuras.

**`/booking-status` — BookingStatusPage**
- Formulario para consultar el estado de una reserva por ID.
- Llama a `GET /api/v1/bookings/:id` y muestra el estado actual.

**`/admin/login` — AdminLoginPage**
- Formulario de usuario/contraseña.
- Llama a `POST /api/v1/users/login` (users-api).
- Si el usuario es `user_type == "admin"`, guarda el token y datos en `localStorage` y redirige al dashboard.

**`/admin/dashboard` — AdminDashboard (protegida)**
- Solo accesible si hay sesión de admin en `localStorage`.
- Panel con tres pestañas:

  **Pestaña Apartamentos:**
  - Lista todos los apartamentos con búsqueda y filtros.
  - Crear nuevo apartamento (modal con formulario).
  - Editar apartamento existente.
  - Eliminar apartamento.

  **Pestaña Reservas:**
  - Lista todas las reservas con filtros por ID de apartamento, estado, ID de usuario.
  - Editar fechas y método de pago.
  - Marcar como concluida o cancelar.
  - Marcar como pagada (ingresa tasa de cambio USD).
  - Eliminar reserva.
  - Botón para marcar vencidas como completadas.

  **Pestaña Financiero:**
  - Ver/actualizar tasa de cambio del dólar.
  - Ver estadísticas de ingresos totales por método de pago.
  - Tabla de pagos registrados.

### 8.3 Componentes principales

**`Navbar`** — Barra de navegación superior. Muestra botón de búsqueda, login de admin o botón de logout según el estado de sesión.

**`Footer`** — Pie de página estático con información de contacto.

**`ProtectedRoute`** — Componente que envuelve las rutas privadas. Verifica `isAdmin()` al montar; si no hay sesión válida, redirige a `/admin/login`.

**`ApartmentCard`** — Tarjeta de apartamento individual (imagen, nombre, precio, capacidad). Usada en SearchPage.

**`ApartmentTypeCard`** — Tarjeta de tipo de apartamento (rango de precios, disponibilidad). Usada en HomePage.

### 8.4 Autenticación en el frontend

```javascript
// Después del login exitoso
localStorage.setItem('auth_token', response.data.token)
localStorage.setItem('user', JSON.stringify(response.data.user))

// Verificar si es admin
const isAdmin = () => {
    const user = JSON.parse(localStorage.getItem('user'))
    return user && user.user_type === 'admin'
}

// Logout
localStorage.removeItem('auth_token')
localStorage.removeItem('user')
```

### 8.5 Módulos de servicios (API calls)

| Archivo | Conecta con | Funciones principales |
|---------|-------------|----------------------|
| `auth.js` | users-api (:8080) | `login`, `logout`, `isAdmin`, `getAuthToken` |
| `api.js` | search-api + apartments-api + bookings-api | `searchApartments`, `getApartmentById`, `createBooking`, `getBookingById` |
| `adminApi.js` | apartments-api + bookings-api | CRUD completo de admin (apartamentos, reservas, finanzas) |
| `apartmentTypes.js` | apartments-api (:8081) | `getApartmentTypes` |

---

## 9. Mensajería con RabbitMQ

### 9.1 Exchanges y colas

El sistema usa el patrón **Publish/Subscribe** con exchanges de tipo `topic`.

**Exchange: `apartments.events`** (tipo: topic, durable)
- **Publisher:** `apartments-api` — publica cuando crea, actualiza o elimina un apartamento.
- **Consumer:** `search-api` — escucha en la cola `search-api-apartments-events`.
- **Routing key:** `apartments.events`
- **Uso:** Mantener el índice de Solr sincronizado con los cambios de apartamentos.

**Exchange: `bookings.events`** (tipo: topic, durable)
- **Publisher:** `bookings-api` — publica cuando crea, actualiza, elimina o marca como pagada una reserva.
- **Consumer:** Ninguno actualmente (diseñado para extensión futura — ej: notificaciones por email).

### 9.2 Flujo de un evento de apartamento

```
apartments-api                RabbitMQ                    search-api
     │                           │                             │
     │  Crear apartamento ID=42  │                             │
     │──────────────────────────►│                             │
     │                           │  Mensaje en cola            │
     │                           │─────────────────────────────►
     │                           │                             │
     │                           │                      Procesar mensaje:
     │                           │                      { action: "created", id: 42 }
     │                           │                             │
     │                           │                      GET /apartments/42
     │◄──────────────────────────────────────────────────────►│
     │                           │                             │
     │  { id: 42, name: "..." } │                             │
     │──────────────────────────────────────────────────────►│
     │                           │                             │
     │                           │                      Indexar en Solr
     │                           │                      POST /solr/apartments/update
     │                           │                             │
     │                           │                      Ack mensaje ✓
     │                           │◄─────────────────────────────
```

### 9.3 Garantías de entrega

Las colas son `durable = true`, lo que significa que sobreviven a reinicios de RabbitMQ.

Los mensajes se confirman (`Ack`) solo cuando se procesan exitosamente. Si falla (Solr no disponible, etc.), se hace `Nack` con `requeue = true` para que RabbitMQ lo reintente.

---

## 10. Búsqueda y Caché (Solr + Memcached)

### 10.1 Índice en Solr

`search-api` indexa apartamentos en Solr con estos campos:

| Campo Solr | Tipo | Descripción |
|------------|------|-------------|
| `id` | int | ID del apartamento |
| `name` | string | Nombre |
| `description` | string | Descripción |
| `address` | string | Dirección |
| `city` | string | Ciudad |
| `max_guests` | int | Capacidad máxima |
| `bedrooms` | int | Cantidad de habitaciones |
| `bathrooms` | int | Cantidad de baños |
| `amenities` | []string | Lista de amenidades |
| `price_per_night` | float | Precio por noche |
| `images` | []string | URLs de imágenes |
| `available` | bool | Disponibilidad |

### 10.2 Búsqueda full-text

Solr indexa texto de `name`, `description` y `city`. La búsqueda soporta wildcards (`*texto*`), por lo que buscar "apart" encuentra "Apartment".

Los filtros numéricos (precio, capacidad) usan rangos de Solr: `price_per_night:[100 TO 300]`.

### 10.3 Cuándo se invalida la caché

La caché **no se invalida activamente**. Solo se vacía cuando:
1. El TTL vence (L1 a los 5 min, L2 a los 15 min).
2. Memcached se reinicia (pierde toda la caché).

Si un apartamento cambia, el índice de Solr se actualiza inmediatamente via RabbitMQ, pero los usuarios que ya tienen ese resultado en caché verán la versión vieja por hasta 15 minutos.

---

## 11. Autenticación y Seguridad

### 11.1 Flujo de autenticación

```
Usuario                 Frontend                  users-api
   │                       │                          │
   │ Ingresa credenciales   │                          │
   │──────────────────────►│                          │
   │                       │                          │
   │                       │ POST /api/v1/users/login │
   │                       │─────────────────────────►│
   │                       │                          │
   │                       │                    Validar password (bcrypt)
   │                       │                    Generar JWT (HS256, 24h)
   │                       │                          │
   │                       │  { token, user }         │
   │                       │◄─────────────────────────│
   │                       │                          │
   │                       │ Guardar en localStorage  │
   │                       │  auth_token = "eyJ..."   │
   │                       │  user = { user_type... } │
   │◄──────────────────────│                          │
   │ Redirige a /admin/dashboard                       │
```

### 11.2 Estructura del JWT

```json
// Header
{ "alg": "HS256", "typ": "JWT" }

// Payload (claims)
{
    "user_id":   1,
    "user_type": "admin",
    "exp":       1714089600   // Unix timestamp, 24h desde emisión
}

// Firmado con HMAC-SHA256 usando JWT_SECRET
```

### 11.3 Limitaciones de seguridad actuales

El sistema tiene varias brechas de seguridad conocidas que son aceptables en contexto académico pero deben corregirse en producción:

1. **Sin validación JWT en el backend:** Los microservicios `apartments-api`, `bookings-api` y `search-api` no validan el token JWT. Cualquier cliente puede llamar a esos endpoints sin autenticarse.

2. **Admin determinado por el frontend:** La protección de rutas admin solo existe en React. Si alguien hace un POST a `bookings-api` directamente con un `user_id` en el body, el sistema lo trata como reserva de admin.

3. **CORS abierto (`*`):** Cualquier origen puede hacer peticiones a todos los servicios.

4. **Secretos en docker-compose.yml:** `JWT_SECRET`, contraseñas de BD y RabbitMQ están hardcodeados en el archivo de orquestación.

---

## 12. Flujos de Negocio Principales

### 12.1 Reserva pública (sin login)

```
1. Usuario va a http://localhost:3000
2. Ve los tipos de apartamentos → elige "Quadruple"
3. Es redirigido a /booking?type=quadruple
4. Completa el formulario:
   - Fechas: 15/03/2026 al 20/03/2026
   - Huéspedes: 3
   - Pago: transferencia
   - Nombre: María García, DNI: 12345678, email: maria@mail.com
5. Frontend llama a POST /api/v1/bookings (bookings-api:8082)
6. bookings-api llama a apartments-api para obtener todos los "quadruple"
7. Por cada apartamento quadruple, verifica disponibilidad en MongoDB
8. Encuentra uno libre (ej: Apartment ID=5) y calcula:
   días = 5, precio_total = 5 × $150 = $750
9. Inserta la reserva en MongoDB con status "confirmed"
10. Publica evento en RabbitMQ bookings.events
11. Devuelve la reserva creada con ID (ej: 1001)
12. Frontend redirige a /confirmation/1001
13. Usuario ve el resumen y puede guardar el ID para consultas futuras
```

### 12.2 Reserva admin (con apartamento específico)

```
1. Admin hace login en /admin/login con usuario "admin" / "admin123"
2. users-api valida y devuelve JWT con user_type = "admin"
3. Frontend guarda token en localStorage
4. Admin va a /admin/dashboard → pestaña Reservas
5. Hace click en "Nueva Reserva"
6. Selecciona apartment_id = 3 directamente (no necesita tipo)
7. Completa los campos y envía
8. bookings-api recibe el request con apartment_id = 3 explícito
9. Llama a apartments-api para verificar que el apartamento existe
10. Verifica disponibilidad en MongoDB
11. Crea la reserva con CreatedByAdmin = true
```

### 12.3 Ciclo de vida de una reserva

```
Reserva creada → status: "confirmed"
    │
    ├─ Admin marca como pagada:
    │   status: "pagado"
    │   Registra USDAmount, ExchangeRateUsed, PaidAt
    │   Escribe en tabla payments de MySQL
    │
    ├─ Admin cancela:
    │   status: "cancelled"
    │   La reserva ya no bloquea disponibilidad
    │
    └─ Scheduler diario (00:05 UTC) o admin manual:
        Si check_out ya pasó → status: "concluida"
        La reserva ya no bloquea disponibilidad
```

### 12.4 Búsqueda de apartamentos

```
1. Usuario va a /search
2. Escribe "Buenos Aires", capacidad mínima 2, precio hasta $200
3. Frontend llama a GET /api/v1/search?city=Buenos+Aires&capacity=2&max_price=200
4. search-api genera clave MD5 de esos parámetros
5. Busca en L1 (en memoria) → no hay
6. Busca en L2 (Memcached) → no hay
7. Construye query Solr:
   q=*:*  fq=city:"Buenos Aires"  fq=price_per_night:[* TO 200]  fq=max_guests:[2 TO *]
8. Solr devuelve los resultados
9. Se guardan en Memcached (15 min) y en memoria local (5 min)
10. Frontend muestra las tarjetas de apartamentos
11. Si el mismo usuario busca de nuevo en los próximos 5 min → respuesta desde L1
```

### 12.5 Cuando se crea un apartamento

```
Admin crea apartamento en el dashboard
    │
    ▼
apartments-api
    ├─ Valida que el owner_id existe (llama a users-api)
    ├─ Inserta en MongoDB
    └─ Publica { action: "created", id: 55 } en apartments.events
                        │
                        ▼ (asíncrono)
search-api consumer
    ├─ Recibe el mensaje
    ├─ GET http://apartments-api:8081/api/v1/apartments/55
    ├─ Indexa el documento en Solr
    └─ Ack del mensaje
```

---

## 13. Bases de Datos

### 13.1 MySQL — users_db

**Administrada por:** users-api (via GORM, auto-migrate)

```sql
CREATE TABLE users (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(191) UNIQUE NOT NULL,
    email      VARCHAR(191) UNIQUE NOT NULL,
    password   VARCHAR(191) NOT NULL,         -- bcrypt hash
    first_name VARCHAR(191) NOT NULL,
    last_name  VARCHAR(191) NOT NULL,
    user_type  VARCHAR(191) DEFAULT 'normal', -- "normal" o "admin"
    created_at DATETIME(3),
    updated_at DATETIME(3)
);
```

**MySQL — finance_db (dentro de bookings-api)**

```sql
-- Registro de pagos (cada vez que una reserva se marca como "pagado")
CREATE TABLE payments (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    booking_id        INT NOT NULL,
    amount_local      FLOAT NOT NULL,    -- monto en pesos
    amount_usd        FLOAT NOT NULL,    -- monto en dólares
    exchange_rate     FLOAT NOT NULL,    -- tasa usada
    payment_method    VARCHAR(50),       -- "transferencia" o "efectivo"
    paid_at           DATETIME
);

-- Configuración del sistema
CREATE TABLE config (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    key_name     VARCHAR(100) UNIQUE,
    value        VARCHAR(500),
    updated_at   DATETIME
);

-- Historial de tasas de cambio
CREATE TABLE dollar_rate_history (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    rate       FLOAT NOT NULL,
    set_at     DATETIME NOT NULL
);
```

### 13.2 MongoDB — apartments_db

**Colección:** `apartments`  
**Índices:** ID del apartamento (único)

```json
// Ejemplo de documento
{
    "_id":            ObjectId("..."),
    "id":             1,
    "name":           "Quadruple Room A",
    "description":    "Habitación para 4 personas con vista al jardín",
    "address":        "Av. Corrientes 1234",
    "city":           "Buenos Aires",
    "max_guests":     4,
    "bedrooms":       2,
    "bathrooms":      1,
    "amenities":      ["wifi", "ac", "tv"],
    "price_per_night": 150.0,
    "images":         ["https://..."],
    "available":      true,
    "owner_id":       1,
    "created_at":     ISODate("2026-01-01T00:00:00Z"),
    "updated_at":     ISODate("2026-01-01T00:00:00Z")
}
```

### 13.3 MongoDB — bookings_db

**Colección:** `bookings`

```json
// Ejemplo de documento
{
    "_id":          ObjectId("..."),
    "id":           1001,
    "apartment_id": 5,
    "user_id":      null,
    "guest_info": {
        "id":         "12345678",
        "first_name": "María",
        "last_name":  "García",
        "dni":        "12345678",
        "phone":      "+5491234567890",
        "email":      "maria@mail.com"
    },
    "check_in":        ISODate("2026-03-15T00:00:00Z"),
    "check_out":       ISODate("2026-03-20T00:00:00Z"),
    "guests":          3,
    "total_price":     750.0,
    "payment_method":  "transferencia",
    "status":          "confirmed",
    "usd_amount":      null,
    "exchange_rate_used": null,
    "paid_at":         null,
    "created_by_admin": false,
    "admin_user_id":   null,
    "created_at":      ISODate("2026-03-01T12:00:00Z"),
    "updated_at":      ISODate("2026-03-01T12:00:00Z")
}
```

**Query de disponibilidad (CheckAvailability):**

```javascript
// Busca reservas que se solapan con el período pedido
db.bookings.find({
    apartment_id: 5,
    check_in:  { $lt: ISODate("2026-03-20T00:00:00Z") },  // algún check_in existente < nuestro check_out
    check_out: { $gt: ISODate("2026-03-15T00:00:00Z") },  // algún check_out existente > nuestro check_in
    status:    { $nin: ["cancelled", "concluida"] }        // solo reservas activas
})
// Si devuelve documentos → hay solapamiento → no disponible
// Si devuelve vacío → disponible
```

---

## 14. Convenciones y Patrones de Código

### 14.1 Arquitectura en capas (todos los microservicios)

```
controllers/  → Reciben HTTP, validan input, mapean a/desde dominio, devuelven respuesta
services/     → Lógica de negocio, coordinan entre repositorios y clientes externos
repositories/ → Acceso a datos (queries SQL/MongoDB/Solr)
domain/       → Structs de dominio (modelos, requests, responses)
```

**Regla:** Los controladores nunca hablan directamente con la base de datos. Los repositorios nunca tienen lógica de negocio. Los servicios no conocen los detalles HTTP.

### 14.2 Inyección de dependencias con interfaces

Cada capa define interfaces para sus dependencias:

```go
// Ejemplo en bookings-api
type BookingsRepository interface {
    Create(booking *domain.Booking) error
    FindByID(id int64) (*domain.Booking, error)
    CheckAvailability(apartmentID int64, checkIn, checkOut time.Time, excludeID *int64) (bool, error)
    // ...
}

type BookingsService struct {
    repo           BookingsRepository  // ← interface, no implementación concreta
    apartmentsClient ApartmentsClient
    usersClient     UsersClient
}
```

Esto permite mockear las dependencias en tests unitarios sin necesitar MongoDB ni red.

### 14.3 Tests unitarios

```bash
cd bookings-api && go test ./services/... -v
```

Los tests cubren:
- Validación de fechas pasadas.
- Solapamiento de reservas.
- Verificación de capacidad.
- Ciclo de vida de estados.
- Scheduler de vencimiento.

Los tests usan mocks de los repositorios y clientes HTTP — no requieren MongoDB ni red.

### 14.4 Manejo de errores

- El **service** retorna errores de negocio con `errors.New("mensaje descriptivo")`.
- El **controller** mapea esos mensajes al código HTTP correcto:
  - "not found" → 404
  - "already exists" / "not available" → 409 / 422
  - Error inesperado → 500
- Nunca se retorna 500 para errores de negocio previsibles.

### 14.5 CORS

Todos los microservicios tienen CORS abierto para desarrollo:

```go
c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

---

## 15. Cómo Levantar el Sistema

### 15.1 Primer arranque

```bash
# Clonar y entrar al proyecto
cd Proyecto-Final-ArquSoftWare2

# Construir y levantar todos los contenedores
docker compose up -d --build

# Verificar que todos estén healthy
docker compose ps

# Ver logs de un servicio específico
docker compose logs -f bookings-api
```

### 15.2 Smoke checks rápidos

```bash
bash VERIFICAR_SISTEMA.sh
```

O manualmente:

```bash
# users-api
curl http://localhost:8080/api/v1/users/1

# apartments-api
curl http://localhost:8081/api/v1/apartment-types

# bookings-api
curl http://localhost:8082/api/v1/bookings

# search-api
curl "http://localhost:8083/api/v1/search"
```

### 15.3 Crear usuario administrador

```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username":   "admin",
    "email":      "admin@mail.com",
    "password":   "admin123",
    "first_name": "Admin",
    "last_name":  "User",
    "user_type":  "admin"
  }'
```

Luego ingresar en `http://localhost:3000/admin/login` con `admin` / `admin123`.

### 15.4 Operaciones de mantenimiento

```bash
# Reiniciar un servicio
docker compose restart bookings-api

# Reconstruir un servicio tras cambios de código
docker compose up --build -d bookings-api

# Ver logs en tiempo real
docker compose logs -f

# Acceder a MySQL
docker compose exec mysql mysql -uroot -proot users_db

# Acceder a MongoDB
docker compose exec mongodb mongosh -u root -p root

# Panel de RabbitMQ
http://localhost:15672  (admin/admin)

# Panel de Solr
http://localhost:8983
```

---

## 16. Limitaciones Conocidas

### Seguridad

- Sin validación JWT en el backend (solo en el frontend).
- CORS abierto a todos los orígenes (`*`).
- Credenciales hardcodeadas en `docker-compose.yml`.
- Sin rate limiting ni protección contra fuerza bruta.
- Sin HTTPS (solo HTTP).

### Resiliencia

- Sin circuit breaker: si `apartments-api` cae, `bookings-api` falla al crear reservas.
- Sin retry automático en llamadas HTTP entre servicios.
- Sin observabilidad centralizada (logs, métricas, tracing).

### Búsqueda y caché

- La caché de búsqueda no se invalida activamente cuando cambian apartamentos.
- Los resultados pueden estar desactualizados hasta 15 minutos.

### Negocio

- Sin integración con pasarela de pagos real (los pagos se marcan manualmente).
- Sin envío de emails de confirmación.
- Sin sistema de imágenes propio (solo URLs externas en la BD).
- Sin políticas de cancelación ni reembolso.

---

## 17. Referencia Rápida de Endpoints

### Users-API (puerto 8080)

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| POST | `/api/v1/users` | `{username, email, password, first_name, last_name, user_type?}` | User object |
| POST | `/api/v1/users/login` | `{username, password}` | `{token, user}` |
| GET | `/api/v1/users/:id` | — | User object |
| GET | `/api/v1/internal/users/:id` | — | User object |

### Apartments-API (puerto 8081)

| Método | Endpoint | Params / Body | Respuesta |
|--------|----------|--------------|-----------|
| POST | `/api/v1/apartments` | `{name, description, address, city, max_guests, bedrooms, bathrooms, amenities, price_per_night, owner_id, available}` | Apartment |
| GET | `/api/v1/apartments` | `?city=&available=&max_guests=&page=&size=` | `{data, total, page}` |
| GET | `/api/v1/apartments/:id` | — | Apartment |
| PATCH | `/api/v1/apartments/:id` | Campos a actualizar (parcial) | Apartment |
| DELETE | `/api/v1/apartments/:id` | — | `{message}` |
| GET | `/api/v1/apartment-types` | — | `[ApartmentType]` |
| GET | `/api/v1/apartments/available-by-type` | `?type=&check_in=&check_out=&guests=` | Apartment |

### Bookings-API (puerto 8082)

| Método | Endpoint | Params / Body | Respuesta |
|--------|----------|--------------|-----------|
| POST | `/api/v1/bookings` | `{apartment_type o apartment_id, check_in, check_out, guests, payment_method, guest_info, user_id?}` | Booking |
| GET | `/api/v1/bookings` | `?apartment_id=&status=&user_id=&page=&size=` | `{data, total, page}` |
| GET | `/api/v1/bookings/:id` | — | Booking |
| GET | `/api/v1/bookings/user/:user_id` | — | `[Booking]` |
| PATCH | `/api/v1/bookings/:id` | `{check_in?, check_out?, guests?, payment_method?}` | Booking |
| DELETE | `/api/v1/bookings/:id` | — | `{message}` |
| PATCH | `/api/v1/bookings/:id/complete` | — | Booking |
| PATCH | `/api/v1/bookings/:id/cancel` | — | Booking |
| PATCH | `/api/v1/bookings/:id/paid` | `{dollar_rate}` | Booking |
| POST | `/api/v1/bookings/mark-expired-as-completed` | — | `{message, count}` |
| GET | `/api/v1/config/dollar-rate` | — | `{rate}` |
| PUT | `/api/v1/config/dollar-rate` | `{rate}` | `{rate}` |
| GET | `/api/v1/config/dollar-rate/history` | — | `[{rate, set_at}]` |
| GET | `/api/v1/stats/finance` | — | `{total_revenue, by_method}` |
| GET | `/api/v1/stats/payments` | — | `[Payment]` |

### Search-API (puerto 8083)

| Método | Endpoint | Params | Respuesta |
|--------|----------|--------|-----------|
| GET | `/api/v1/search` | `?q=&city=&min_price=&max_price=&capacity=&check_in=&check_out=&page=&size=&sort_by=&sort_order=` | `{data, total, page, size, total_pages}` |

---

*Proyecto académico — Arquitectura de Software II*  
*Stack: Go + Gin · React + Vite · MySQL · MongoDB · Apache Solr · Memcached · RabbitMQ · Docker Compose*
