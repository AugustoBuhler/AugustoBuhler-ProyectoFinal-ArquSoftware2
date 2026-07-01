# CLAUDE.md — Briefing del proyecto para Claude Code

Este archivo es el punto de entrada para retomar el proyecto en cualquier sesión futura.
**Leerlo completo antes de hacer cualquier cambio de código.**

---

## Qué es este proyecto

Sistema de reservas de apartamentos amoblados basado en microservicios Go + React.
Proyecto académico (Arquitectura de Software II) con integración real de Mercado Pago.
Nombre comercial: **Docta Suites**.

---

## Stack y puertos

| Servicio           | Puerto           | BD                  |
|--------------------|------------------|---------------------|
| frontend           | 3000             | —                   |
| users-api          | 8080             | MySQL               |
| apartments-api     | 8081             | MongoDB             |
| bookings-api       | 8082             | MongoDB + MySQL     |
| search-api         | 8083             | Solr + Memcached    |
| notifications-api  | interno (no HTTP)| —                   |
| mysql              | 3306             |                     |
| mongodb            | 27017            |                     |
| rabbitmq           | 5672 / 15672 UI  |                     |
| solr               | 8983             |                     |
| memcached          | 11211            |                     |

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

### Re-indexar Solr manualmente (si los precios o datos están desactualizados)

```bash
# 1. Borrar todos los docs
curl -X POST "http://localhost:8983/solr/apartments/update?commit=true" \
  -H "Content-Type: application/json" -d '{"delete": {"query": "*:*"}}'

# 2. Re-indexar desde apartments-api
curl -s "http://localhost:8081/api/v1/apartments?size=100" | python3 -c "
import json, sys, urllib.request
data = json.load(sys.stdin)
docs = [{'id': str(a['id']), 'name': a.get('name',''), 'description': a.get('description',''),
         'address': a.get('address',''), 'city': a.get('city',''),
         'price_per_night': a.get('price_per_night',0), 'max_guests': a.get('max_guests',1),
         'bedrooms': a.get('bedrooms',1), 'bathrooms': a.get('bathrooms',1),
         'available': a.get('available',True), 'amenities': a.get('amenities') or [],
         'images': a.get('images') or []} for a in (data.get('data') or [])]
req = urllib.request.Request('http://localhost:8983/solr/apartments/update/json/docs?commit=true',
      data=json.dumps(docs).encode(), headers={'Content-Type': 'application/json'}, method='POST')
resp = urllib.request.urlopen(req)
print(json.loads(resp.read()))
"

# 3. Limpiar caché
echo "flush_all" | nc -w1 localhost 11211
docker restart search-api
```

---

## Flujos principales

### Reserva pública (sin login) — flujo completo con MP
1. Frontend: `GET /api/v1/apartment-types` → muestra tipos disponibles
2. Usuario llena el formulario en `/booking?type=<tipo>`
3. `POST /api/v1/bookings` → bookings-api asigna apartamento libre del tipo, valida disponibilidad
4. `POST /api/v1/bookings/:id/checkout` → crea preferencia en Mercado Pago, devuelve `init_point`
5. Frontend navega a `/reserva/pago/esperando?id=X&mp=<init_point>&type=<tipo>` y abre MP en nueva pestaña
6. Usuario paga en la pestaña de MP → MP redirige a `localhost:3000/reserva/pago/resultado?status=approved&payment_id=XXX`
7. `PaymentResultPage` llama `POST /api/v1/payments/confirm` localmente → bookings-api procesa, pone `deposit_paid=true`
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
- Filtros disponibles: `capacity`, `check_in`, `check_out` (nombre/ciudad/precio eliminados del frontend)
- Cache-aside: caché local Go (5 min) → Memcached (15 min) → Solr
- Solr siempre filtra `available:true` — apartamentos marcados no disponibles no aparecen nunca
- Cuando se busca con fechas, se filtra además por disponibilidad real consultando bookings-api
- Al actualizar o eliminar un apartamento vía RabbitMQ, ambas cachés se invalidan inmediatamente
- El frontend agrega `_t=Date.now()` a cada request para evitar caché del browser

### Disponibilidad de apartamentos (admin)
El admin puede marcar un apartamento como "no disponible" (ej: refacciones).
El cambio se propaga: admin panel → apartments-api → RabbitMQ `updated` → search-api consumer
→ re-indexa en Solr con `available=false` + flushea caché → desaparece de búsqueda inmediatamente.

---

## Mapa de archivos por área de cambio

### Pagos con Mercado Pago
- [bookings-api/clients/mercadopago_client.go](bookings-api/clients/mercadopago_client.go) — SDK MP, creación de preferencia, verificación de pago
- [bookings-api/services/bookings_service.go](bookings-api/services/bookings_service.go) — `CreateCheckout`, `ConfirmPaymentFromWebhook`
- [bookings-api/controllers/bookings_controller.go](bookings-api/controllers/bookings_controller.go) — handlers `CreateCheckout`, `HandlePaymentWebhook`, `ConfirmPaymentFromBrowser`
- [bookings-api/middleware/mp_webhook.go](bookings-api/middleware/mp_webhook.go) — validación HMAC-SHA256 firma x-signature de MP
- [frontend/src/pages/PaymentWaitingPage.jsx](frontend/src/pages/PaymentWaitingPage.jsx) — pantalla de espera con polling
- [frontend/src/pages/PaymentResultPage.jsx](frontend/src/pages/PaymentResultPage.jsx) — página en pestaña MP, dispara webhook local y cierra pestaña
- [frontend/src/services/api.js](frontend/src/services/api.js) — `createCheckout`, `triggerPaymentWebhook`, `verifyPayment`

### Reservas (lógica crítica)
- [bookings-api/domain/booking.go](bookings-api/domain/booking.go) — modelos, DateOnly, CheckoutResponse, AvailabilityBatchRequest
- [bookings-api/services/bookings_service.go](bookings-api/services/bookings_service.go) — lógica de negocio, concurrencia, validaciones, cancelación por huésped
- [bookings-api/repositories/bookings_repository.go](bookings-api/repositories/bookings_repository.go) — queries MongoDB, CheckAvailability, GetBookedApartmentIDs, CancelWithReason
- [bookings-api/main.go](bookings-api/main.go) — setup, scheduler diario (00:05 UTC), scheduler pendientes (cada 5 min), rutas

### Autenticación y autorización
- [users-api/services/user_service.go](users-api/services/user_service.go) — genera JWT (HS256) con `user_id`, `email`, `user_type`
- [bookings-api/middleware/auth.go](bookings-api/middleware/auth.go) — `AdminRequired`: valida JWT, verifica `user_type == "admin"`, inyecta `admin_user_id` en contexto Gin
- [apartments-api/middleware/auth.go](apartments-api/middleware/auth.go) — mismo middleware `AdminRequired`
- [frontend/src/services/auth.js](frontend/src/services/auth.js) — `isAdmin()` verifica `user_type` en localStorage
- [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx) — protege rutas `/admin/*`

### Email de confirmación
- [notifications-api/clients/email_client.go](notifications-api/clients/email_client.go) — templates HTML: confirmación de reserva + cancelación al admin
- [notifications-api/clients/bookings_client.go](notifications-api/clients/bookings_client.go) — fetcha datos de la reserva desde bookings-api
- [notifications-api/consumers/rabbitmq_consumer.go](notifications-api/consumers/rabbitmq_consumer.go) — escucha `created`, `payment_confirmed`, `guest_cancelled`; retry con backoff (3 reintentos: 5s/10s/15s para fetch, 10s/20s/30s para email)

### Apartamentos y tipos
- [apartments-api/services/apartments_service.go](apartments-api/services/apartments_service.go)
- [apartments-api/controllers/apartments_controller.go](apartments-api/controllers/apartments_controller.go)
- [frontend/src/pages/HomePage.jsx](frontend/src/pages/HomePage.jsx) — banner post-pago, stats strip, tipos de habitación, sección "Por qué Docta"

### Búsqueda e indexación
- [search-api/services/search_service.go](search-api/services/search_service.go) — doble caché + filtrado por bookings-api + flush en updates
- [search-api/consumers/rabbitmq_consumer.go](search-api/consumers/rabbitmq_consumer.go) — usa `SearchService.UpdateApartment` (incluye flush de caché)
- [search-api/repositories/solr_repository.go](search-api/repositories/solr_repository.go) — siempre agrega `fq=available:true` a la query
- [search-api/repositories/cache_local.go](search-api/repositories/cache_local.go) — interfaz con método `Flush()`
- [search-api/repositories/cache_memcached.go](search-api/repositories/cache_memcached.go) — interfaz con método `Flush()`
- [search-api/repositories/bookings_client.go](search-api/repositories/bookings_client.go) — filtra disponibilidad real por fechas via bookings-api

### Panel admin (frontend)
- [frontend/src/pages/AdminDashboard.jsx](frontend/src/pages/AdminDashboard.jsx) — gestión apartamentos, reservas, finanzas (tipo de cambio, stats, pagos, cotizaciones)
- [frontend/src/services/adminApi.js](frontend/src/services/adminApi.js) — todas las llamadas admin incluyendo `markBookingAsPaid`, `getDollarRate`, `getMarketRates`

### Estado de reserva (frontend público)
- [frontend/src/pages/BookingStatusPage.jsx](frontend/src/pages/BookingStatusPage.jsx) — búsqueda por ID o DNI+email, cancelación con motivo
- [frontend/src/pages/BookingPage.jsx](frontend/src/pages/BookingPage.jsx) — formulario de reserva con check de disponibilidad en tiempo real (debounce 500ms)

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
- notifications-api escucha: `created`, `payment_confirmed`, `guest_cancelled`.
- search-api escucha: `created`, `updated`, `deleted` de apartments.events — al recibir `updated`, re-indexa en Solr Y flushea ambas cachés.

### Filtro de disponibilidad en búsqueda
`solr_repository.go` siempre agrega `fq=available:true`. Nunca eliminar este filtro.
La invalidación de caché ocurre en `search_service.UpdateApartment` y `DeleteApartment`.
El consumer de RabbitMQ llama `searchService.UpdateApartment` (no `solrRepo.IndexApartment` directamente).

---

## Estado actual de autenticación JWT

| Servicio        | Estado |
|-----------------|--------|
| users-api       | ✅ Genera y firma JWT (HS256) con `user_id`, `email`, `user_type` |
| bookings-api    | ✅ `AdminRequired` middleware en todas las rutas admin; `admin_user_id` se lee del contexto Gin |
| apartments-api  | ✅ `AdminRequired` middleware en POST/PATCH/DELETE; rutas GET son públicas |
| frontend        | ⚠️ `isAdmin()` solo verifica `user_type` en localStorage — no valida firma ni expiración del JWT |

---

## Mercado Pago — decisiones importantes

### Por qué el webhook lo dispara el frontend (no MP directamente)
En desarrollo, ngrok tuneliza solo al puerto 8082 (bookings-api). Si se usan URLs de ngrok en los `back_urls` de MP, la pestaña de MP redirige al ngrok URL que: (a) muestra advertencia de ngrok en modo incógnito, (b) no lleva al frontend.

**Solución implementada:** `PaymentResultPage` llama directamente a `POST localhost:8082/api/v1/payments/confirm`. No necesita ngrok ni red pública.

**En producción:** El webhook real de MP llega automáticamente al servidor público. `PaymentResultPage` seguirá funcionando como fallback pero no será necesario.

### Por qué se usa polling y no WebSockets
Simplicidad. El polling cada 3 segundos tiene latencia aceptable (<3s) y no requiere cambios en la arquitectura de ningún microservicio Go.

### Por qué MP abre en nueva pestaña
Si se redirige el tab principal a MP, después del pago MP redirige al `back_url` en esa misma pestaña. Con `localhost` como back_url, MP no hace auto-redirect. Abrir en nueva pestaña y usar polling en el tab principal resuelve el problema.

### Variables de entorno MP
```env
MP_ACCESS_TOKEN=APP_USR-...        # credencial del seller (test o producción)
MP_PUBLIC_KEY=APP_USR-...          # clave pública
MP_WEBHOOK_SECRET=...              # secret para validar firma x-signature (vacío = validación desactivada)
NGROK_URL=https://xxx.ngrok-free.dev   # solo para webhook en dev (vacío en producción)
FRONTEND_BASE_URL=http://localhost:3000  # usado para back_urls de MP
```
- `auto_return: "approved"` se activa automáticamente si `FRONTEND_BASE_URL` empieza con `https://`
- En dev (localhost), MP no hace auto-redirect — el flujo de polling lo reemplaza

### Usuarios de prueba MP (sandbox)
- **Seller:** credenciales en `MP_ACCESS_TOKEN` (user ID 3383093038)
- **Buyer:** crear en developers.mercadopago.com → Cuentas de prueba
- Usar Chrome normal (no incógnito) para evitar la advertencia de ngrok repetida

---

## Schedulers automáticos (bookings-api)

| Scheduler | Frecuencia | Función |
|-----------|-----------|---------|
| `runDailyScheduler` | Diario a las 00:05 UTC | `MarkExpiredBookingsAsCompleted` — cierra reservas con checkout pasado |
| `runPendingPaymentScheduler` | Cada 5 minutos | `CancelExpiredPendingBookings` — cancela reservas en `pendiente_pago` con más de 30 min |

Endpoint manual: `POST /api/v1/bookings/mark-expired-as-completed`

---

## Emails con Resend

- **Restricción free tier:** solo se puede enviar a `augusto.buhler03@gmail.com` sin verificar dominio.
- **Para producción:** verificar dominio en resend.com/domains y cambiar `FROM_EMAIL`.
- Templates en `notifications-api/clients/email_client.go`:
  - `buildConfirmationHTML` — datos del huésped, fechas, total, seña (30%), saldo al ingreso, comprobante MP, Google Maps
  - `buildCancellationHTML` — alerta al admin con datos de la reserva cancelada y plazo de devolución (48hs)

---

## Tests

```bash
cd bookings-api && go test ./services/... -v
```

13 tests unitarios con mocks. Cubren: fechas pasadas, solapamientos, capacidad,
ciclo de vida de reservas, scheduler de vencimiento. No requieren MongoDB ni red.
Al agregar métodos a las interfaces, agregar el mock correspondiente en `bookings_service_test.go`.

---

## Diseño del frontend

**Stack visual:** Tailwind CSS + Framer Motion. Fuentes: Space Grotesk (display) + Instrument Sans (body) vía Google Fonts.

**Design tokens (tailwind.config.js):**
```
primary-600: #b0532e  (acento rust/óxido — CTAs, kickers)
paper:       #f7f5f2  (fondo principal cálido)
ink:         #2b2b28  (texto principal)
ink-soft:    #55524b  (texto secundario)
muted:       #8a857c  (metadata, captions)
hairline:    #ddd8cf  (todos los bordes)
```

**Principios de diseño:**
- Sin sombras — hairlines en lugar de `shadow-*`
- Botones e inputs: `border-radius: 999px` (pills)
- Cards e imágenes: `border-radius: 4px`
- Animaciones: Framer Motion con `duration: 150ms`, `hover: translateY(-1px)` en CTAs
- Cards con cascade stagger (45ms por card) en la grilla de búsqueda

---

## Convenciones de código

- Arquitectura en capas: `controllers` → `services` → `repositories`
- Interfaces para inyección de dependencias (facilita mocks en tests)
- Errores de negocio como `errors.New("mensaje")` desde el service; el controller mapea al HTTP status correcto
- No usar `500` para errores de negocio esperados
- Frontend: URLs hardcodeadas a `http://localhost:<puerto>` en dev — funciona sin Docker y sin env vars
- `searchApartments` siempre agrega `_t: Date.now()` para evitar caché del browser

---

## Pendientes antes de producción

| Prioridad | Item |
|-----------|------|
| 🔴 Crítico | Rotar JWT_SECRET (actualmente `"your-secret-key-change-in-production"` en docker-compose) |
| 🔴 Crítico | Rotar contraseñas BD (`root/root` en MySQL y MongoDB) |
| 🔴 Crítico | HTTPS + cerrar CORS (hoy abierto a `*` en los 4 servicios Go) |
| 🔴 Crítico | `isAdmin()` en frontend solo verifica localStorage — cualquiera puede inyectar `user_type: "admin"` en devtools |
| 🔴 Crítico | `MP_WEBHOOK_SECRET` vacío en docker-compose — validación de firma x-signature desactivada |
| 🟡 Importante | Cambiar credenciales MP de sandbox a producción |
| 🟡 Importante | Verificar dominio en Resend para enviar emails a cualquier destinatario |
| 🟡 Importante | Implementar paginación real en admin (hoy usa `size=1000` y `size=100` como workaround) |
| 🟢 Recomendado | Rate limiting en endpoints públicos (`POST /bookings`, `GET /search`) |
| 🟢 Recomendado | Circuit breaker entre servicios (si apartments-api cae, bookings-api falla) |
| 🟢 Recomendado | Observabilidad centralizada (Prometheus + Grafana + Loki) |

---

## Deuda técnica conocida

- `ProtectedRoute` del frontend solo verifica `user_type` en localStorage, no valida firma ni expiración del JWT
- Sin paginación real en admin (workaround con size=1000 / size=100)
- Retry tracker de notifications-api en memoria (`sync.Map`) — se pierde si el contenedor se reinicia, puede reenviar emails duplicados
- Search-api no invalida caché cuando se crea/cancela una reserva (solo por eventos de apartamentos). Búsquedas sin fechas pueden mostrar datos de capacidad desactualizados hasta 5 min. Búsquedas con fechas ya filtran correctamente vía bookings-api.

---

## Archivos de referencia adicional

- [docs/adr/](docs/adr/) — Architecture Decision Records
- `.env.example` — todas las variables de entorno con descripción
- `requests.http` en cada microservicio — pruebas manuales con VS Code REST Client
- [VERIFICAR_SISTEMA.sh](VERIFICAR_SISTEMA.sh) — smoke checks del sistema completo
- [tarjetas_de_prueba.md](tarjetas_de_prueba.md) — tarjetas de crédito para testing en sandbox MP
