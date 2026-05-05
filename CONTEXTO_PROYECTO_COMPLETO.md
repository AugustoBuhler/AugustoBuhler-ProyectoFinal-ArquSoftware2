# Contexto Completo del Proyecto

Este documento es la fuente de verdad para que cualquier desarrollador pueda retomar y evolucionar este sistema sin depender de conocimiento previo del equipo.

## 1) Que es este sistema

Sistema de reservas de apartamentos amoblados basado en microservicios:

- `users-api`: autenticacion y usuarios (MySQL + JWT)
- `apartments-api`: catalogo de apartamentos (MongoDB)
- `bookings-api`: reservas y disponibilidad (MongoDB + concurrencia en Go)
- `search-api`: busqueda optimizada (Solr + doble cache + consumidor RabbitMQ)
- `frontend`: React + Vite para experiencia publica y panel admin

Integracion principal:

- Comunicacion sincrona HTTP entre servicios para validaciones puntuales
- Comunicacion asincrona por eventos con RabbitMQ para sincronizacion de busqueda

## 2) Arquitectura general

### Componentes y puertos

- `frontend`: `3000`
- `users-api`: `8080`
- `apartments-api`: `8081`
- `bookings-api`: `8082`
- `search-api`: `8083`
- `mysql`: `3306`
- `mongodb`: `27017`
- `rabbitmq`: `5672` (broker), `15672` (management UI)
- `solr`: `8983`
- `memcached`: `11211`

### Responsabilidades por servicio

1. `users-api`
- Registro y login.
- Emite JWT con `user_id`, `user_type`, expiracion 24h.
- Exponde endpoint interno para validar existencia de usuario desde otros servicios.

2. `apartments-api`
- CRUD de departamentos.
- Agrupa por tipos (`quadruple`, `triple`, `double_matrimonial`, `double_twin`).
- Busca disponibilidad por tipo y rango de fechas (consultando `bookings-api` cuando corresponde).
- Publica eventos a RabbitMQ en escrituras.

3. `bookings-api`
- Crea/actualiza/cancela/concluye reservas.
- Valida disponibilidad evitando solapamientos.
- Soporta reserva publica (sin `user_id`) y reserva admin (con `user_id`).
- Publica eventos de reservas.
- Incluye proceso de expiracion: marca reservas vencidas como `concluida`.

4. `search-api`
- Responde busquedas con filtros y paginacion.
- Usa Solr como indice.
- Usa cache local (CCache) + cache distribuida (Memcached).
- Consume eventos de apartamentos desde RabbitMQ para mantener Solr sincronizado.

5. `frontend`
- Sitio publico para exploracion y reserva.
- Flujo de confirmacion de reserva.
- Panel admin con login, CRUD de apartamentos y gestion de reservas.

## 3) Estructura del repositorio

Raiz:

- `docker-compose.yml`: orquestacion completa.
- `README.md`: documentacion general.
- `VERIFICAR_SISTEMA.sh`: script de smoke checks.
- `TIPOS_APARTAMENTOS_IMPLEMENTADO.md`: detalle funcional de tipos.
- `NUEVOS_ESTADOS_RESERVAS.md`: nuevos estados y endpoints de reservas.
- `EXPLICACION_RABBITMQ_SIMPLE.md`: explicacion conceptual de eventos.
- `APARTAMENTOS_CREADOS.md`: inventario inicial y seed.

Carpetas de codigo:

- `users-api/`
- `apartments-api/`
- `bookings-api/`
- `search-api/`
- `frontend/`

## 4) Modelo de datos (lo mas importante)

### Usuario (`users-api`)

Campos clave:

- `id`
- `username` (unico)
- `email` (unico)
- `password` (hashed con bcrypt)
- `first_name`, `last_name`
- `user_type` (`normal` o `admin`)

### Departamento (`apartments-api`)

Campos clave:

- `id`, `name`, `description`
- `address`, `city`
- `max_guests`, `bedrooms`, `bathrooms`
- `amenities []string`
- `price_per_night`
- `images []string`
- `available`
- `owner_id`
- `created_at`, `updated_at`

### Reserva (`bookings-api`)

Campos clave:

- `id`
- `apartment_id`
- `user_id` (opcional en reservas publicas)
- `user_info` (datos del huesped)
  - `first_name`, `last_name`, `dni`, `phone`, `email`
- `check_in`, `check_out`
- `guests`
- `total_price`
- `payment_method` (`transferencia` o `efectivo`)
- `status` (`confirmed`, `cancelled`, `concluida`, `pending`)
- `created_by_admin`, `admin_user_id`
- `created_at`, `updated_at`

Notas de fecha:

- Se almacena en UTC.
- Las respuestas de reservas se serializan como `YYYY-MM-DD` para evitar problemas de zona horaria.

## 5) Flujos funcionales clave

### Flujo A: Reserva publica por tipo (sin login)

1. Frontend muestra tipos desde `GET /api/v1/apartment-types`.
2. Usuario elige tipo (por ejemplo `quadruple`).
3. Frontend envia `POST /api/v1/bookings` con `apartment_type` + fechas + `user_info`.
4. `bookings-api`:
   - Busca apartamento disponible de ese tipo.
   - Valida capacidad y solapamientos.
   - Calcula precio total.
   - Crea reserva con estado inicial `confirmed`.
5. Frontend redirige a pagina de confirmacion.

### Flujo B: Operacion administrativa

1. Login admin via `POST /api/v1/users/login`.
2. Frontend guarda token en `localStorage` (`auth_token`) y usuario en `localStorage` (`user`).
3. `ProtectedRoute` permite acceso solo si `user.user_type === "admin"`.
4. Admin puede:
   - Crear/editar/eliminar apartamentos.
   - Listar reservas.
   - Cancelar reserva (`PATCH /bookings/:id/cancel`).
   - Marcar reserva como concluida (`PATCH /bookings/:id/complete`).
   - Ejecutar proceso automatico (`POST /bookings/mark-expired-as-completed`).

### Flujo C: Sincronizacion de busqueda

1. Escritura en `apartments-api` produce evento (`created`, `updated`, `deleted`) al exchange `apartments.events`.
2. `search-api` consume desde cola `search-api-apartments-events`.
3. Para `created/updated`, recupera el apartamento y lo indexa/actualiza en Solr.
4. Para `deleted`, lo elimina del indice.
5. Busquedas en `search-api` usan cache-aside (local + memcached + Solr).

## 6) Endpoints utiles (resumen practico)

### Users

- `POST /api/v1/users`
- `POST /api/v1/users/login`
- `GET /api/v1/users/:id`
- `GET /api/v1/internal/users/:id`

### Apartments

- `GET /api/v1/apartments`
- `GET /api/v1/apartments/:id`
- `POST /api/v1/apartments` (admin)
- `PATCH /api/v1/apartments/:id` (admin)
- `DELETE /api/v1/apartments/:id` (admin)
- `GET /api/v1/apartment-types`
- `GET /api/v1/apartments/available-by-type?type=...&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD`

### Bookings

- `POST /api/v1/bookings`
- `GET /api/v1/bookings`
- `GET /api/v1/bookings/:id`
- `GET /api/v1/bookings/user/:user_id`
- `PATCH /api/v1/bookings/:id`
- `PATCH /api/v1/bookings/:id/complete`
- `PATCH /api/v1/bookings/:id/cancel`
- `POST /api/v1/bookings/mark-expired-as-completed`
- `DELETE /api/v1/bookings/:id`

### Search

- `GET /api/v1/search`
  - filtros: `q`, `city`, `min_price`, `max_price`, `capacity`, `check_in`, `check_out`, `page`, `size`, `sort_by`, `sort_order`

## 7) Frontend: como esta integrado

### Rutas principales

- `/` Home (tipos de apartamento)
- `/apartment/:id` detalle
- `/booking` y `/booking/:id`
- `/confirmation/:bookingId`
- `/admin/login`
- `/admin/dashboard` (protegida)

### Capa de servicios

- `frontend/src/services/api.js`
  - publico: search, detalle apartamento, crear reserva, traer reserva.
- `frontend/src/services/adminApi.js`
  - admin: CRUD apartamentos + gestion de reservas.
- `frontend/src/services/auth.js`
  - login, token y usuario en `localStorage`.

### Resolucion de URLs en navegador

En servicios del frontend existe logica:

- Si hostname es `localhost`, usa `http://localhost:<puerto>` directamente.
- Si no, intenta usar variables `VITE_*`.

Esto evita el error clasico de intentar resolver nombres internos de Docker desde el navegador.

### Imagenes de habitaciones

El frontend ya renderiza:

- portada con `apartment.images[0]`
- miniaturas en detalle con `apartment.images[1..3]`

Por lo tanto, para mostrar imagenes reales alcanza con persistir URLs validas en `images` al crear/editar apartamentos.

## 8) Docker Compose: como levantar y operar

### Levantar todo

```bash
docker compose up -d --build
```

### Ver estado

```bash
docker compose ps
docker ps
```

### Ver logs

```bash
docker compose logs -f users-api
docker compose logs -f apartments-api
docker compose logs -f bookings-api
docker compose logs -f search-api
docker compose logs -f frontend
```

### Bajar todo

```bash
docker compose down
```

### Reiniciar servicio puntual

```bash
docker compose restart bookings-api
```

### Script de verificacion rapida

```bash
bash VERIFICAR_SISTEMA.sh
```

## 9) Variables de entorno relevantes

### users-api

- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

### apartments-api

- `PORT`
- `MONGODB_URI`
- `USERS_API_URL`
- `RABBITMQ_URL`

### bookings-api

- `PORT`
- `MONGODB_URI`
- `USERS_API_URL`
- `APARTMENTS_API_URL`
- `RABBITMQ_URL`

### search-api

- `PORT`
- `SOLR_URL`
- `MEMCACHED_URL`
- `APARTMENTS_API_URL`
- `RABBITMQ_URL`

### frontend

- `VITE_API_BASE_URL`
- `VITE_USERS_API_URL`
- `VITE_APARTMENTS_API_URL`
- `VITE_BOOKINGS_API_URL`

## 10) Estado funcional conocido (para retomarlo rapido)

Implementado:

- CRUD de usuarios / apartamentos / reservas.
- Login admin y ruta protegida.
- Tipos de apartamento y asignacion automatica.
- Nuevos estados de reserva (`cancelled`, `concluida`, etc.).
- Busqueda via Solr con cache.
- Consumo de eventos RabbitMQ para indexacion.

Pendientes tipicos para evolucion:

- Scheduler real (cron) para `mark-expired-as-completed` automatico diario.
- Endurecer seguridad (CORS abierto, validaciones, secretos).
- Tests automatizados mas completos (unit/integration/e2e).
- Observabilidad (metrics/tracing centralizados).

## 11) Operacion diaria para dev

### Primer arranque recomendado

1. Levantar stack: `docker compose up -d --build`
2. Crear admin:
   - `POST http://localhost:8080/api/v1/users`
3. (Opcional) Seed de apartamentos:
   - `go run apartments-api/scripts/seed_apartments.go http://localhost:8081/api/v1/apartments`
4. Verificar:
   - Frontend: `http://localhost:3000`
   - RabbitMQ UI: `http://localhost:15672` (`admin/admin`)
   - Solr UI: `http://localhost:8983`

### Debug de reserva que falla

Checklist:

1. Validar formato fechas `YYYY-MM-DD`.
2. Verificar que `guests <= max_guests`.
3. Verificar disponibilidad (sin solapamiento).
4. Verificar estado de apartamento y reservas previas.
5. Revisar logs de `bookings-api` y `apartments-api`.

### Debug de busqueda vacia

Checklist:

1. Verificar `search-api` arriba.
2. Verificar Solr core `apartments`.
3. Crear/editar apartamento y confirmar evento en RabbitMQ.
4. Revisar logs de consumidor en `search-api`.
5. Verificar que el documento exista en Solr.

## 12) Riesgos/decisiones tecnicas actuales

- CORS abierto a `*` en todos los servicios (aceptable para desarrollo, no para produccion).
- Secretos hardcodeados/default en compose (ambiente academico).
- Auth en admin basada en `localStorage` + chequeo de `user_type`.
- Existe logica fuerte de fechas para evitar desfasajes por timezone (no romperla sin tests).
- Se usan eventos para sincronizacion de busqueda; si RabbitMQ cae temporalmente puede haber delay de indexacion.

## 13) Documentos de apoyo que conviene leer despues de este

- `README.md` (vision general)
- `TIPOS_APARTAMENTOS_IMPLEMENTADO.md` (flujo por tipo)
- `NUEVOS_ESTADOS_RESERVAS.md` (estado de reservas y endpoints nuevos)
- `EXPLICACION_RABBITMQ_SIMPLE.md` (eventos explicado simple)
- `APARTAMENTOS_CREADOS.md` (inventario inicial)

## 14) Convenciones y patrones del codigo

- Arquitectura por capas en Go:
  - `controllers` -> `services` -> `repositories`
- Inyeccion de dependencias por interfaces.
- DTOs de request/response separados del modelo persistido en partes criticas.
- Manejo de concurrencia explicito en creacion de reservas.
- En frontend: separacion por `pages`, `components`, `services`.

## 15) Mapa rapido para tocar codigo sin perder tiempo

### Si quieres tocar autenticacion

- `users-api/services/user_service.go`
- `frontend/src/services/auth.js`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/pages/AdminLoginPage.jsx`

### Si quieres tocar tipos de apartamento o disponibilidad por tipo

- `apartments-api/services/apartments_service.go`
- `apartments-api/controllers/apartments_controller.go`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/BookingPage.jsx`

### Si quieres tocar estados de reserva

- `bookings-api/domain/booking.go`
- `bookings-api/services/bookings_service.go`
- `bookings-api/controllers/bookings_controller.go`
- `frontend/src/services/adminApi.js`
- `frontend/src/pages/AdminDashboard.jsx`

### Si quieres tocar busqueda e indexacion

- `search-api/services/search_service.go`
- `search-api/consumers/rabbitmq_consumer.go`
- `search-api/repositories/solr_repository.go`
- `frontend/src/services/api.js` (metodo `searchApartments`)

## 16) Resumen ejecutivo

Este proyecto ya tiene una base funcional completa para:

- publicar y administrar apartamentos,
- permitir reservas publicas y administrativas,
- manejar estados de ciclo de vida de reservas,
- buscar con performance y cache,
- mantener indice sincronizado por eventos.

El camino de menor friccion para seguir desarrollando es:

1. mantener `docker compose` como entorno default,
2. validar cambios con `requests.http` y `VERIFICAR_SISTEMA.sh`,
3. reforzar tests y automatizaciones (cron + observabilidad) como siguiente madurez.
