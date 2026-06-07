# CLAUDE.md — Briefing del proyecto para Claude Code

Este archivo es el punto de entrada para retomar el proyecto en cualquier sesión futura.
**Leerlo completo antes de hacer cualquier cambio de código.**

---

## Qué es este proyecto

Sistema de reservas de apartamentos amoblados basado en microservicios Go + React.
Proyecto académico (Arquitectura de Software II) con integración real de Mercado Pago.

---

## Stack y puertos

| Servicio           | Puerto          | BD                  |
|--------------------|-----------------|---------------------|
| frontend           | 3000            | —                   |
| users-api          | 8080            | MySQL               |
| apartments-api     | 8081            | MongoDB             |
| bookings-api       | 8082            | MongoDB + MySQL     |
| search-api         | 8083            | Solr + Memcached    |
| notifications-api  | interno (no HTTP)| —                  |
| mysql              | 3306            |                     |
| mongodb            | 27017           |                     |
| rabbitmq           | 5672 / 15672 UI |                     |
| solr               | 8983            |                     |
| memcached          | 11211           |                     |

Credenciales dev: `root/root` MySQL y MongoDB. RabbitMQ: `admin/admin`.
JWT_SECRET en `docker-compose.yml` (cambiar en producción).
bookings-api usa **dos** bases de datos: MongoDB (reservas) y MySQL (finanzas/pagos).

---

## Levantar el stack

```bash
docker compose up -d --build   # primer arranque o después de cambios en Go
docker compose up -d            # arranque normal (sin rebuild)
docker compose ps               # verificar estado de los 11 contenedores
docker compose logs -f bookings-api   # logs en tiempo real de un servicio
cd bookings-api && go test ./services/... -v   # correr tests
```

> Si al levantar hay error de puerto ocupado, verificar contenedores de otros proyectos:
> `docker ps` y hacer `docker stop <nombre>` de los que estén usando el puerto.

---

## Flujos principales

### Reserva pública (sin login) — flujo completo con MP
1. Frontend: `GET /api/v1/apartment-types` → muestra tipos disponibles
2. Usuario llena el formulario en `/booking?type=<tipo>`
3. `POST /api/v1/bookings` → bookings-api asigna apartamento libre del tipo, valida disponibilidad
4. `POST /api/v1/bookings/:id/checkout` → crea preferencia en Mercado Pago, devuelve `init_point`
5. Frontend navega a `/reserva/pago/esperando?id=X&mp=<init_point>&type=<tipo>` y abre MP en nueva pestaña
6. Usuario paga en la pestaña de MP → MP redirige a `localhost:3000/reserva/pago/resultado?status=approved&payment_id=XXX`
7. `PaymentResultPage` llama `POST /api/v1/payments/webhook` localmente (sin ngrok) → bookings-api procesa, pone `deposit_paid=true`
8. `PaymentResultPage` cierra la pestaña con `window.close()`
9. `PaymentWaitingPage` (tab principal) detecta `deposit_paid=true` via polling cada 3s → muestra confirmación con datos de la reserva
10. RabbitMQ publica evento `payment_confirmed` → notifications-api envía email via Resend

### Reserva admin (con login)
1. Login: `POST /api/v1/users/login` → JWT en `localStorage` (`auth_token`)
2. Panel: `http://localhost:3000/admin/dashboard`
3. Admin crea reserva con `apartment_id` directo (bypassa asignación por tipo)
4. Al crear reserva admin, se publica evento `created` → email inmediato (sin pasar por MP)

### Búsqueda
- `GET /api/v1/search` en search-api (8083)
- Cache-aside: caché local Go (5 min) → Memcached (15 min) → Solr
- Solr se sincroniza via eventos RabbitMQ de apartments-api (creación/edición/eliminación)

---

## Mapa de archivos por área de cambio

### Pagos con Mercado Pago
- [bookings-api/clients/mercadopago_client.go](bookings-api/clients/mercadopago_client.go) — SDK MP, creación de preferencia, verificación de pago
- [bookings-api/services/bookings_service.go](bookings-api/services/bookings_service.go) — `CreateCheckout`, `ConfirmPaymentFromWebhook`
- [bookings-api/controllers/bookings_controller.go](bookings-api/controllers/bookings_controller.go) — handlers `CreateCheckout`, `HandlePaymentWebhook`
- [frontend/src/pages/PaymentWaitingPage.jsx](frontend/src/pages/PaymentWaitingPage.jsx) — pantalla de espera con polling
- [frontend/src/pages/PaymentResultPage.jsx](frontend/src/pages/PaymentResultPage.jsx) — página en pestaña MP, dispara webhook local y cierra pestaña
- [frontend/src/services/api.js](frontend/src/services/api.js) — `createCheckout`, `triggerPaymentWebhook`

### Reservas (lógica crítica)
- [bookings-api/domain/booking.go](bookings-api/domain/booking.go) — modelos, DateOnly, CheckoutResponse
- [bookings-api/services/bookings_service.go](bookings-api/services/bookings_service.go) — lógica de negocio, concurrencia, validaciones
- [bookings-api/repositories/bookings_repository.go](bookings-api/repositories/bookings_repository.go) — queries MongoDB, CheckAvailability, SaveMPPreferenceID, MarkDepositPaid
- [bookings-api/main.go](bookings-api/main.go) — setup, scheduler diario, rutas, redirect handler `/api/v1/payments/return`

### Email de confirmación
- [notifications-api/clients/email_client.go](notifications-api/clients/email_client.go) — template HTML completo con seña, comprobante MP y Google Maps
- [notifications-api/clients/bookings_client.go](notifications-api/clients/bookings_client.go) — fetcha datos de la reserva desde bookings-api
- [notifications-api/consumers/rabbitmq_consumer.go](notifications-api/consumers/rabbitmq_consumer.go) — escucha eventos `created` y `payment_confirmed`

### Autenticación
- [users-api/services/user_service.go](users-api/services/user_service.go) — genera JWT (único servicio que lo hace)
- [frontend/src/services/auth.js](frontend/src/services/auth.js)
- [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)

### Apartamentos y tipos
- [apartments-api/services/apartments_service.go](apartments-api/services/apartments_service.go)
- [apartments-api/controllers/apartments_controller.go](apartments-api/controllers/apartments_controller.go)
- [frontend/src/pages/HomePage.jsx](frontend/src/pages/HomePage.jsx) — incluye banner de confirmación post-pago

### Búsqueda e indexación
- [search-api/services/search_service.go](search-api/services/search_service.go)
- [search-api/consumers/rabbitmq_consumer.go](search-api/consumers/rabbitmq_consumer.go)
- [search-api/repositories/solr_repository.go](search-api/repositories/solr_repository.go)

### Panel admin (frontend)
- [frontend/src/pages/AdminDashboard.jsx](frontend/src/pages/AdminDashboard.jsx)
- [frontend/src/services/adminApi.js](frontend/src/services/adminApi.js)

---

## Invariantes críticas — NO romper sin tests

### Manejo de fechas (bookings-api)
Fechas almacenadas en UTC en MongoDB, serializadas como `"YYYY-MM-DD"` (sin hora).
Se construyen con `time.Date(y, m, d, 0,0,0,0, time.UTC)` para evitar desfasajes de zona horaria.
Cualquier cambio requiere verificar que las fechas del frontend se guarden y devuelvan con el mismo día.

### Concurrencia en CreateBooking
`bookings_service.go` usa goroutines + WaitGroup para validar apartamento y usuario en paralelo,
luego hace `CheckAvailability` de forma atómica antes del `Create`. No reordenar estas etapas.

### Disponibilidad
`CheckAvailability` en MongoDB usa:
```
check_in < requested.check_out  AND  check_out > requested.check_in
```
Excluye reservas con status `cancelled` o `concluida`. Modificar esta query puede crear solapamientos reales.

### Eventos RabbitMQ
- Reserva pública: NO publica `created` al crear. Publica `payment_confirmed` cuando el webhook de MP confirma el pago.
- Reserva admin: publica `created` al crear (email inmediato, sin pasar por MP).
- notifications-api escucha ambos eventos: `created` y `payment_confirmed`.

---

## Mercado Pago — decisiones importantes

### Por qué el webhook lo dispara el frontend (no MP directamente)
En desarrollo, ngrok tuneliza solo al puerto 8082 (bookings-api). Si se usan URLs de ngrok en los `back_urls` de MP, la pestaña de MP redirige al ngrok URL que: (a) muestra advertencia de ngrok en modo incógnito, (b) no lleva al frontend.

**Solución implementada:** `PaymentResultPage` (que corre en el browser del usuario en `localhost:3000`) llama directamente a `POST localhost:8082/api/v1/payments/webhook`. No necesita ngrok ni red pública.

**En producción:** El webhook real de MP llega automáticamente al servidor público. `PaymentResultPage` seguirá funcionando como fallback pero no será necesario.

### Por qué se usa polling y no WebSockets
Simplicidad. El polling cada 3 segundos tiene latencia aceptable (<3s) y no requiere cambios en la arquitectura de ningún microservicio Go.

### Por qué MP abre en nueva pestaña
Si se redirige el tab principal a MP (`window.location.href`), después del pago MP redirige al `back_url` en esa misma pestaña. Con `localhost` como back_url, MP no muestra botón de retorno ni hace auto-redirect. Con ngrok como back_url, la pestaña queda en ngrok (no en el frontend). Abrir en nueva pestaña y usar polling en el tab principal resuelve ambos problemas.

### Variables de entorno MP
```env
MP_ACCESS_TOKEN=APP_USR-...       # credencial del seller (test o producción)
MP_PUBLIC_KEY=APP_USR-...         # clave pública (usada en frontend si se necesita)
NGROK_URL=https://xxx.ngrok-free.dev  # solo para webhook en dev (vacío en producción)
FRONTEND_BASE_URL=http://localhost:3000  # usado para back_urls de MP
```
- `auto_return: "approved"` se activa automáticamente si `FRONTEND_BASE_URL` empieza con `https://`
- En dev (localhost), MP no hace auto-redirect — el flujo de polling lo reemplaza

### Usuarios de prueba MP (sandbox)
- **Seller:** credenciales en `MP_ACCESS_TOKEN` (user ID 3383093038)
- **Buyer:** crear en developers.mercadopago.com → Cuentas de prueba
- Usar Chrome normal (no incógnito) para evitar la advertencia de ngrok repetida

---

## Estado actual de autenticación JWT

| Servicio        | Estado                                                           |
|-----------------|------------------------------------------------------------------|
| users-api       | ✅ Genera y firma JWT (HS256) con `user_id`, `email`, `is_admin` |
| frontend        | ⚠️ Verifica presencia del token, no la firma                    |
| bookings-api    | ❌ `isAdmin` se determina por presencia de `user_id` en el body  |
| apartments-api  | ❌ Sin ninguna validación                                        |

**Bug de seguridad conocido** (`bookings_controller.go:42`):
```go
// Cualquiera puede enviar user_id en el body y obtener privilegios admin
if req.UserID != nil {
    isAdmin = true
}
```
Para implementar JWT real: crear middleware `AdminRequired(jwtSecret)` que valide el token del header `Authorization: Bearer <token>` y extraiga `is_admin` de los claims.

---

## Tests

```bash
cd bookings-api && go test ./services/... -v
```

13 tests unitarios con mocks. Cubren: fechas pasadas, solapamientos, capacidad,
ciclo de vida de reservas, scheduler de vencimiento. No requieren MongoDB ni red.
Al agregar métodos a las interfaces, agregar el mock correspondiente en `bookings_service_test.go`.

---

## Scheduler automático

`bookings-api/main.go` lanza `runDailyScheduler` (goroutine) que a las 00:05 UTC
llama a `MarkExpiredBookingsAsCompleted`. Endpoint manual:
`POST /api/v1/bookings/mark-expired-as-completed`.

---

## Emails con Resend

- **Restricción free tier:** solo se puede enviar a `augusto.buhler03@gmail.com` sin verificar dominio.
- **Para producción:** verificar dominio en resend.com/domains y cambiar `FROM_EMAIL`.
- El template HTML está en `notifications-api/clients/email_client.go` → `buildConfirmationHTML`.
- Muestra: datos del huésped, fechas, total, seña pagada (30%), comprobante MP, saldo al ingreso, botón Google Maps.

---

## Convenciones de código

- Arquitectura en capas: `controllers` → `services` → `repositories`
- Interfaces para inyección de dependencias (facilita mocks en tests)
- Errores de negocio como `errors.New("mensaje")` desde el service; el controller mapea al HTTP status correcto
- No usar `500` para errores de negocio esperados
- Frontend: URLs hardcodeadas a `http://localhost:<puerto>` en dev (no usar variables VITE_*) — funciona sin Docker y sin env vars

---

## Pendientes antes de producción

| Prioridad | Item |
|-----------|------|
| 🔴 Crítico | Implementar validación JWT en bookings-api y apartments-api |
| 🔴 Crítico | Rotar todos los secretos (JWT_SECRET, MP tokens, contraseñas BD) |
| 🔴 Crítico | HTTPS + cerrar CORS (hoy abierto a `*`) |
| 🟡 Importante | Verificar dominio en Resend para enviar emails a cualquier destinatario |
| 🟡 Importante | Cambiar credenciales MP a producción (hoy en sandbox) |
| 🟡 Importante | Validar firma `x-signature` del webhook real de MP |
| 🟢 Recomendado | Rate limiting en endpoints públicos (especialmente `POST /bookings`) |
| 🟢 Recomendado | Circuit breaker entre servicios (si apartments-api cae, bookings-api falla) |
| 🟢 Recomendado | Observabilidad centralizada (Prometheus + Grafana + Loki) |

---

## Deuda técnica conocida

- Sin invalidación de caché en search-api por eventos de reservas (solo por eventos de apartamentos)
- `ProtectedRoute` del frontend verifica presencia del token pero no su firma ni expiración
- Sin paginación en `GET /api/v1/bookings` (puede ser lento con muchas reservas)
- `notifications-api` no tiene retry si el email falla (el evento se pierde)

---

## Archivos de referencia adicional

- [docs/adr/](docs/adr/) — 4 Architecture Decision Records (MongoDB, fechas UTC, cache-aside, sin circuit breaker)
- `.env.example` — todas las variables de entorno con descripción
- `requests.http` en cada microservicio — pruebas manuales con VS Code REST Client
- [VERIFICAR_SISTEMA.sh](VERIFICAR_SISTEMA.sh) — smoke checks del sistema completo
- [tarjetas_de_prueba.md](tarjetas_de_prueba.md) — tarjetas de crédito para testing en sandbox MP
