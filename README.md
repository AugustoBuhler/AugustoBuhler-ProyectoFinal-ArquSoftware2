# 🏢 Sistema de Reserva de Apartamentos Amoblados

Sistema completo de microservicios en Go para la gestión de reservas de apartamentos temporales. Arquitectura basada en microservicios con comunicación asíncrona mediante RabbitMQ, búsqueda optimizada con Solr y doble caché.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Características Principales](#características-principales)
- [Microservicios](#microservicios)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Endpoints Principales](#endpoints-principales)
- [Frontend](#frontend)
- [Panel Administrativo](#panel-administrativo)
- [Conexión a Bases de Datos](#conexión-a-bases-de-datos)
- [Documentación Adicional](#documentación-adicional)

## 🏗️ Arquitectura

El sistema está compuesto por 4 microservicios principales y un frontend React:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Users-API  │     │ Apartments- │     │ Bookings-   │     │ Search-API  │
│  (Port 8080)│     │    API      │     │    API      │     │  (Port 8083)│
│             │     │  (Port 8081)│     │  (Port 8082)│     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                      │
                              ┌───────▼────────┐
                              │    RabbitMQ    │
                              │  (Event Bus)   │
                              └────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
┌──────▼──────┐              ┌───────▼────────┐              ┌──────▼──────┐
│   MySQL     │              │    MongoDB     │              │    Solr     │
│  (Users)    │              │ (Apartments,   │              │  (Search)   │
│             │              │   Bookings)    │              │             │
└─────────────┘              └────────────────┘              └─────────────┘
                                     │
                              ┌──────▼────────┐
                              │   Memcached   │
                              │    (Cache)    │
                              └───────────────┘
                                     │
                            ┌────────▼─────────┐
                            │   Frontend       │
                            │  React (Port 3K) │
                            └──────────────────┘
```

## ✨ Características Principales

### 🔐 Autenticación y Autorización
- Autenticación JWT (JSON Web Tokens)
- Roles de usuario (normal, admin)
- Hash de contraseñas con bcrypt
- Rutas protegidas en frontend y backend

### 🏠 Gestión de Apartamentos
- CRUD completo de apartamentos
- 31 apartamentos iniciales (7 cuadruples, 10 dobles matrimoniales, 4 dobles twin, 10 triples)
- Gestión por tipos de apartamentos
- Asignación automática de apartamentos disponibles por tipo
- Validación de propietario mediante users-api

### 📅 Gestión de Reservas
- **Cálculo concurrente** usando goroutines, channels y WaitGroup
- Validación de disponibilidad atómica (previene race conditions)
- Reservas públicas (sin login requerido)
- Reservas administrativas (creadas por admin para usuarios)
- Todos los datos del huésped (nombre, apellido, DNI, teléfono, email, método de pago)
- DNI usado como identificador del huésped
- Validación de solapamiento de fechas por apartamento

### 🔍 Búsqueda Optimizada
- Búsqueda rápida con Apache Solr
- **Doble caché:**
  - CCache local (TTL: 5 minutos)
  - Memcached distribuida (TTL: 15 minutos)
- Filtros múltiples: ciudad, precio, capacidad, fechas
- Paginación y ordenamiento
- Cache-aside pattern
- Sincronización automática con RabbitMQ

### 🎨 Frontend React
- Interfaz limpia y moderna con animaciones
- Página pública para reservas (sin login)
- Panel administrativo completo
- Gestión de apartamentos y reservas desde el frontend
- Búsqueda y filtrado de apartamentos
- Página de confirmación de reservas

### 📊 Mensajería Asíncrona
- Comunicación entre microservicios mediante RabbitMQ
- Eventos publicados para sincronización:
  - `apartments.events` (crear, actualizar, eliminar apartamentos)
  - `bookings.events` (crear, actualizar, eliminar reservas)
- Consumidor RabbitMQ en search-api para indexación automática en Solr

## 🚀 Microservicios

### 1. Users-API (Puerto 8080)
**Base de datos:** MySQL con GORM

**Funcionalidades:**
- ✅ CRUD de usuarios
- ✅ Autenticación JWT
- ✅ Roles (normal, admin)
- ✅ Bcrypt para passwords
- ✅ Endpoint interno para validación de usuarios

**Endpoints principales:**
- `POST /api/v1/users` - Crear usuario
- `POST /api/v1/users/login` - Login (retorna JWT)
- `GET /api/v1/users/:id` - Obtener usuario por ID
- `GET /api/v1/users/internal/:id` - Validación interna (para otros servicios)

### 2. Apartments-API (Puerto 8081)
**Base de datos:** MongoDB

**Funcionalidades:**
- ✅ CRUD completo de apartamentos
- ✅ Validación de owner vía users-api
- ✅ Publicación de eventos a RabbitMQ
- ✅ Endpoint de tipos de apartamentos
- ✅ Asignación automática de apartamento disponible por tipo

**Endpoints principales:**
- `GET /api/v1/apartments` - Listar apartamentos (con filtros: city, available, max_guests, page, size)
- `GET /api/v1/apartments/:id` - Obtener apartamento por ID
- `POST /api/v1/apartments` - Crear apartamento (requiere auth admin)
- `PATCH /api/v1/apartments/:id` - Actualizar apartamento (requiere auth admin)
- `DELETE /api/v1/apartments/:id` - Eliminar apartamento (requiere auth admin)
- `GET /api/v1/apartment-types` - Obtener tipos de apartamentos agrupados
- `GET /api/v1/apartments/available-by-type` - Buscar apartamento disponible por tipo y fechas
- `GET /api/v1/apartments/type/:type` - Obtener todos los apartamentos de un tipo

### 3. Bookings-API (Puerto 8082)
**Base de datos:** MongoDB

**Funcionalidades:**
- ✅ CRUD completo de reservas
- ✅ **Cálculo concurrente** (goroutines + channels + WaitGroup)
- ✅ Validación de disponibilidad atómica
- ✅ Todos los datos del huésped (nombre, apellido, DNI, teléfono, email, método de pago)
- ✅ DNI usado como ID del huésped
- ✅ Soporte para reservas públicas (sin login) y reservas de admin
- ✅ Publicación de eventos a RabbitMQ
- ✅ Validación de usuario y apartamento vía HTTP

**Endpoints principales:**
- `POST /api/v1/bookings` - Crear reserva (con cálculo concurrente)
  - Acepta `apartment_id` (admin) o `apartment_type` (público)
  - Asignación automática de apartamento disponible si se usa `apartment_type`
- `GET /api/v1/bookings/:id` - Obtener reserva por ID
- `GET /api/v1/bookings/user/:user_id` - Obtener todas las reservas de un usuario
- `GET /api/v1/bookings` - Obtener todas las reservas (admin)
- `PATCH /api/v1/bookings/:id` - Actualizar reserva (con validación de disponibilidad)
- `DELETE /api/v1/bookings/:id` - Eliminar reserva

**Cálculo concurrente:**
- Goroutine 1: Validar y obtener información del apartamento
- Goroutine 2: Validar usuario (si se proporciona user_id)
- WaitGroup: Sincronizar todas las goroutines
- Channels: Comunicar resultados y errores
- Validación atómica: Verificar disponibilidad antes de crear la reserva

### 4. Search-API (Puerto 8083)
**Motor de búsqueda:** Apache Solr

**Funcionalidades:**
- ✅ Búsqueda rápida con Apache Solr
- ✅ Doble caché (CCache local 5min + Memcached 15min)
- ✅ Consumidor RabbitMQ para sincronizar Solr automáticamente
- ✅ Filtros: ciudad, precio, capacidad, fechas
- ✅ Paginación y ordenamiento
- ✅ Cache-aside pattern

**Endpoints principales:**
- `GET /api/v1/search` - Búsqueda de apartamentos
  - Parámetros: `q`, `city`, `min_price`, `max_price`, `capacity`, `check_in`, `check_out`, `page`, `size`, `sort_by`, `sort_order`

## 🛠️ Tecnologías

### Backend
- **Go 1.21+** - Lenguaje principal
- **Gin** - Framework web
- **GORM** - ORM para MySQL
- **MongoDB Driver** - Driver oficial para MongoDB
- **JWT-Go** - JSON Web Tokens
- **Bcrypt** - Hash de contraseñas
- **RabbitMQ** - Mensajería asíncrona

### Frontend
- **React 18** - Framework de interfaz
- **React Router** - Enrutamiento
- **Tailwind CSS** - Estilos
- **Framer Motion** - Animaciones
- **Axios** - Cliente HTTP
- **Vite** - Build tool

### Infraestructura
- **Docker & Docker Compose** - Contenedores
- **MySQL 8.0** - Base de datos relacional
- **MongoDB 4.4.6** - Base de datos NoSQL
- **Apache Solr** - Motor de búsqueda
- **Memcached** - Caché distribuida
- **RabbitMQ 3-management** - Message broker
- **CCache** - Caché local (Go)

## 📦 Requisitos Previos

- **Docker** y **Docker Compose** instalados
- **Go 1.21+** (para desarrollo local, opcional)
- **Node.js 18+** (para desarrollo frontend local, opcional)
- **VS Code** con extensiones recomendadas:
  - REST Client (para probar endpoints)
  - Go (para desarrollo backend)
  - Docker (para gestión de contenedores)

## 🔧 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <repository-url>
   cd Proyecto-Final-ArquSoftWare2
   ```

2. **Iniciar todos los servicios:**
   ```bash
   docker-compose up --build
   ```

   Este comando iniciará:
   - MySQL (puerto 3306)
   - MongoDB (puerto 27017)
   - RabbitMQ (puerto 5672, UI en 15672)
   - Solr (puerto 8983)
   - Memcached (puerto 11211)
   - Todos los microservicios (puertos 8080-8083)
   - Frontend (puerto 3000)

3. **Verificar que todos los servicios estén saludables:**
   ```bash
   docker-compose ps
   ```

## 🎯 Uso

### Acceso a la Aplicación

- **Frontend:** http://localhost:3000
- **RabbitMQ Management:** http://localhost:15672 (admin/admin)
- **Solr Admin:** http://localhost:8983

### Crear Usuario Administrador

Para crear un usuario administrador, usar el endpoint de users-api:

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

### Crear Reserva Pública (sin login)

```bash
curl -X POST http://localhost:8082/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "apartment_type": "quadruple",
    "check_in": "2025-12-01",
    "check_out": "2025-12-05",
    "guests": 4,
    "user_info": {
      "first_name": "Juan",
      "last_name": "Perez",
      "dni": "12345678",
      "phone": "+5491123456789",
      "email": "juan@example.com"
    },
    "payment_method": "transferencia"
  }'
```

El sistema asignará automáticamente un apartamento disponible del tipo "quadruple" para las fechas solicitadas.

### Buscar Apartamentos

```bash
# Búsqueda simple
curl "http://localhost:8083/api/v1/search"

# Por ciudad y capacidad
curl "http://localhost:8083/api/v1/search?city=Buenos Aires&capacity=4"

# Con rango de precios
curl "http://localhost:8083/api/v1/search?min_price=100&max_price=130"
```

## 📡 Endpoints Principales

### Users-API
- `POST /api/v1/users` - Crear usuario
- `POST /api/v1/users/login` - Login
- `GET /api/v1/users/:id` - Obtener usuario
- `GET /api/v1/users/internal/:id` - Validación interna

### Apartments-API
- `GET /api/v1/apartments` - Listar apartamentos
- `GET /api/v1/apartments/:id` - Obtener apartamento
- `POST /api/v1/apartments` - Crear apartamento (admin)
- `PATCH /api/v1/apartments/:id` - Actualizar apartamento (admin)
- `DELETE /api/v1/apartments/:id` - Eliminar apartamento (admin)
- `GET /api/v1/apartment-types` - Obtener tipos de apartamentos
- `GET /api/v1/apartments/available-by-type` - Buscar disponible por tipo

### Bookings-API
- `POST /api/v1/bookings` - Crear reserva
- `GET /api/v1/bookings/:id` - Obtener reserva
- `GET /api/v1/bookings/user/:user_id` - Reservas de usuario
- `GET /api/v1/bookings` - Todas las reservas (admin)
- `PATCH /api/v1/bookings/:id` - Actualizar reserva
- `DELETE /api/v1/bookings/:id` - Eliminar reserva

### Search-API
- `GET /api/v1/search` - Búsqueda con filtros

Para más detalles sobre los endpoints, consultar los archivos `requests.http` en cada microservicio.

## 💻 Frontend

El frontend React ofrece:

### Páginas Públicas
- **HomePage** (`/`) - Muestra los 4 tipos de apartamentos disponibles
- **ApartmentDetailPage** (`/apartment/:id`) - Detalles de un apartamento
- **BookingPage** (`/booking?type=quadruple` o `/booking/:id`) - Formulario de reserva
- **ConfirmationPage** (`/confirmation/:id`) - Confirmación de reserva

### Panel Administrativo
- **AdminLoginPage** (`/admin/login`) - Login para administradores
- **AdminDashboard** (`/admin/dashboard`) - Dashboard con:
  - Gestión de Apartamentos (ver, editar, eliminar)
  - Gestión de Reservas (ver, editar, eliminar)
  - Búsqueda y filtrado

### Características del Frontend
- Interfaz limpia y moderna con Tailwind CSS
- Animaciones suaves con Framer Motion
- Responsive design
- Validación de formularios
- Manejo de errores y estados de carga
- Autenticación JWT
- Rutas protegidas

## 🔑 Panel Administrativo

Acceso: http://localhost:3000/admin/login

**Credenciales por defecto (si ya se creó el usuario admin):**
- Usuario: `admin`
- Contraseña: `admin123`

**Funcionalidades:**
- ✅ Login con autenticación JWT
- ✅ Gestión completa de apartamentos (CRUD)
- ✅ Gestión completa de reservas (CRUD)
- ✅ Búsqueda y filtrado
- ✅ Edición de datos desde el frontend
- ✅ Organización de apartamentos por tipo

## 🗄️ Conexión a Bases de Datos

### MySQL (Users-API)
```
Host: localhost
Puerto: 3306
Usuario: root
Contraseña: root
Base de datos: users_db
Tabla: users
```

**Connection String:**
```
mysql://root:root@localhost:3306/users_db
```

### MongoDB (Apartments-API y Bookings-API)
```
Host: localhost
Puerto: 27017
Usuario: root
Contraseña: root
Authentication Database: admin
```

**Connection String:**
```
mongodb://root:root@localhost:27017/?authSource=admin
```

**Bases de datos:**
- `apartments_db` - Colección: `apartments`
- `bookings_db` - Colección: `bookings`

### Solr (Search-API)
```
URL: http://localhost:8983
Core: apartments
```

### Memcached
```
Host: localhost
Puerto: 11211
```

## 📚 Documentación Adicional

- **[TIPOS_APARTAMENTOS_IMPLEMENTADO.md](./TIPOS_APARTAMENTOS_IMPLEMENTADO.md)** - Documentación sobre el sistema de tipos de apartamentos y asignación automática
- **[APARTAMENTOS_CREADOS.md](./APARTAMENTOS_CREADOS.md)** - Inventario de los 31 apartamentos iniciales

## 🧪 Testing

Cada microservicio incluye un archivo `requests.http` para probar los endpoints usando la extensión REST Client de VS Code:

- `users-api/requests.http`
- `apartments-api/requests.http`
- `bookings-api/requests.http`
- `search-api/requests.http`

## 📝 Notas de Desarrollo

### Patrones Implementados
- **MVC** en todos los microservicios
- **Repository Pattern** para acceso a datos
- **Service Layer** para lógica de negocio
- **Dependency Injection** mediante interfaces
- **Concurrency** en bookings-api (goroutines, channels, WaitGroup)
- **Cache-aside Pattern** en search-api
- **Event-driven Architecture** con RabbitMQ

### Manejo de Fechas
- Todas las fechas se almacenan en UTC en las bases de datos
- El backend devuelve fechas en formato `YYYY-MM-DD` (string)
- El frontend formatea las fechas localmente sin conversiones de zona horaria

## 🐛 Solución de Problemas

### Verificar estado de servicios
```bash
docker-compose ps
```

### Ver logs de un servicio
```bash
docker-compose logs [servicio]
# Ejemplo: docker-compose logs bookings-api
```

### Reiniciar un servicio
```bash
docker-compose restart [servicio]
```

### Reconstruir un servicio
```bash
docker-compose up --build -d [servicio]
```

## 📄 Licencia

Este es un proyecto académico desarrollado para el curso de Arquitectura de Software II.

---

**Desarrollado con ❤️ usando Go, React y tecnologías modernas de microservicios.**
