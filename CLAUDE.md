# CLAUDE.md — Briefing del proyecto para Claude Code

Este archivo es el punto de entrada para retomar el proyecto en cualquier sesión futura.
Léelo antes de hacer cualquier cambio de código.

## Qué es este proyecto

Sistema de reservas de apartamentos amoblados basado en microservicios Go + React.
Proyecto académico (Arquitectura de Software II).

## Stack y puertos

| Servicio        | Puerto | BD           |
|-----------------|--------|--------------|
| frontend        | 3000   | —            |
| users-api       | 8080   | MySQL        |
| apartments-api  | 8081   | MongoDB      |
| bookings-api    | 8082   | MongoDB      |
| search-api      | 8083   | Solr + Memcached |
| mysql           | 3306   |              |
| mongodb         | 27017  |              |
| rabbitmq        | 5672 / 15672 (UI) | |
| solr            | 8983   |              |
| memcached       | 11211  |              |

Credenciales por defecto (desarrollo): usuario `root`, contraseña `root` para MySQL/MongoDB.
RabbitMQ: `admin/admin`. JWT_SECRET en `docker-compose.yml` (cambiar en producción).

## Levantar el stack

```bash
docker compose up -d --build   # primer arranque
docker compose ps               # verificar estado
docker compose logs -f bookings-api   # ver logs de un servicio
bash VERIFICAR_SISTEMA.sh       # smoke checks rápidos
```

## Flujos principales

### Reserva pública (sin login)
1. `GET /api/v1/apartment-types` → frontend muestra tipos
2. `POST /api/v1/bookings` con `apartment_type` + fechas + `user_info`
3. bookings-api asigna un apartamento libre del tipo, verifica disponibilidad y crea la reserva

### Reserva admin
1. Login: `POST /api/v1/users/login` → JWT en `localStorage` (`auth_token`)
2. Panel: `http://localhost:3000/admin/dashboard`
3. Admin puede crear reservas con `apartment_id` directo (bypassa la asignación por tipo)

### Búsqueda
- `GET /api/v1/search` en search-api (8083)
- Usa cache-aside: caché local (5 min) → Memcached (15 min) → Solr
- Solr se sincroniza automáticamente via eventos RabbitMQ de apartments-api

## Mapa de archivos por área de cambio

### Reservas (la parte más crítica)
- [bookings-api/domain/booking.go](bookings-api/domain/booking.go) — modelos, DateOnly, serialización de fechas
- [bookings-api/services/bookings_service.go](bookings-api/services/bookings_service.go) — lógica de negocio, concurrencia, validaciones
- [bookings-api/repositories/bookings_repository.go](bookings-api/repositories/bookings_repository.go) — queries MongoDB, CheckAvailability
- [bookings-api/controllers/bookings_controller.go](bookings-api/controllers/bookings_controller.go) — HTTP handlers
- [bookings-api/main.go](bookings-api/main.go) — setup, scheduler diario

### Autenticación
- [users-api/services/user_service.go](users-api/services/user_service.go)
- [frontend/src/services/auth.js](frontend/src/services/auth.js)
- [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)

### Apartamentos y tipos
- [apartments-api/services/apartments_service.go](apartments-api/services/apartments_service.go)
- [apartments-api/controllers/apartments_controller.go](apartments-api/controllers/apartments_controller.go)
- [frontend/src/pages/HomePage.jsx](frontend/src/pages/HomePage.jsx)

### Búsqueda e indexación
- [search-api/services/search_service.go](search-api/services/search_service.go)
- [search-api/consumers/rabbitmq_consumer.go](search-api/consumers/rabbitmq_consumer.go)
- [search-api/repositories/solr_repository.go](search-api/repositories/solr_repository.go)

### Panel admin (frontend)
- [frontend/src/pages/AdminDashboard.jsx](frontend/src/pages/AdminDashboard.jsx)
- [frontend/src/services/adminApi.js](frontend/src/services/adminApi.js)

## Invariantes críticas — NO romper sin tests

### Manejo de fechas (bookings-api)
Las fechas se almacenan en UTC en MongoDB y se serializan como `"YYYY-MM-DD"` (sin hora).
El código construye fechas explícitamente con `time.Date(y, m, d, 0,0,0,0, time.UTC)` para
evitar desfasajes de zona horaria. Cualquier cambio en esta lógica requiere verificar que
las fechas que llegan del frontend (`"2026-03-15"`) se guarden y devuelvan con el mismo día.

### Concurrencia en CreateBooking
`bookings_service.go` usa goroutines + WaitGroup para validar apartamento y usuario en paralelo,
luego hace `CheckAvailability` de forma atómica antes del `Create`. No reordenar estas etapas.

### Disponibilidad
`CheckAvailability` en MongoDB usa:
```
check_in < requested.check_out  AND  check_out > requested.check_in
```
Y excluye reservas con status `cancelled` o `concluida`. Modificar esta query puede crear
solapamientos reales de reservas.

## Tests

```bash
cd bookings-api && go test ./services/... -v
```

Cubre: validación de fechas pasadas, solapamientos, capacidad, ciclo de vida de reservas,
scheduler de vencimiento. Los tests son unitarios con mocks (no requieren MongoDB ni red).

## Scheduler automático

`bookings-api/main.go` lanza una goroutine (`runDailyScheduler`) que a las 00:05 UTC
llama a `MarkExpiredBookingsAsCompleted`. También existe el endpoint manual:
`POST /api/v1/bookings/mark-expired-as-completed`.

## Convenciones de código

- Arquitectura en capas: `controllers` → `services` → `repositories`
- Interfaces para inyección de dependencias (facilita mocks en tests)
- Todos los errores de negocio se retornan como `errors.New("mensaje")` desde el service
- El controller mapea el mensaje al status HTTP correcto (no usar `500` para errores de negocio)
- Frontend: si `window.location.hostname === 'localhost'` usa `http://localhost:<puerto>` directamente
  (no las variables VITE_*) para que funcione en dev sin Docker

## Pendientes conocidos

- CORS abierto a `*` (aceptable en desarrollo, cerrar antes de producción)
- Secretos hardcodeados en `docker-compose.yml` (mover a `.env` con `.gitignore`)
- Sin circuit breaker entre servicios (si apartments-api cae, bookings-api falla)
- Sin validación del JWT en el backend de bookings-api (el `isAdmin` se determina por presencia de `user_id` en el body)
- Invalidación de caché en search-api solo se activa por eventos de apartamentos, no de reservas
- Sin observabilidad centralizada (métricas, tracing)

## Archivos de documentación adicional

- [docs/adr/](docs/adr/) — Architecture Decision Records (por qué se tomó cada decisión técnica)
- [CONTEXTO_PROYECTO_COMPLETO.md](CONTEXTO_PROYECTO_COMPLETO.md) — contexto detallado del sistema
- `requests.http` en cada microservicio — pruebas manuales de endpoints con VS Code REST Client
- [VERIFICAR_SISTEMA.sh](VERIFICAR_SISTEMA.sh) — smoke checks del sistema completo
