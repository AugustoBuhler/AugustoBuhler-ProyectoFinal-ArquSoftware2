# ADR 002 — Manejo de fechas en UTC con serialización YYYY-MM-DD

**Estado:** Aceptado  
**Fecha:** 2025

## Contexto

Las reservas tienen `check_in` y `check_out`. El sistema corre en Docker (donde el timezone del
contenedor puede diferir del host) y el frontend está en el navegador del usuario (con su timezone local).

El problema inicial observado: MongoDB devuelve `time.Time` con zona horaria UTC. Si Go la interpreta
en zona horaria local (ej: UTC-3), `2026-01-14T00:00:00Z` se mostraba como `2026-01-13` en el frontend.

## Decisión

1. **Almacenar siempre en UTC**: al parsear fechas del request se usa `time.Date(y, m, d, 0,0,0,0, time.UTC)`.
2. **Serializar como string `"YYYY-MM-DD"`**: no como `time.Time` (que incluye hora y zona). El struct `BookingResponse` usa `string` para `check_in`/`check_out`.
3. **Normalizar al leer de MongoDB**: en cada `GetByID`, `GetAll`, etc. se re-construye la fecha con `.UTC()` + extracción de componentes.
4. **Frontend no convierte fechas**: axios tiene configurado `transformResponse` para parsear JSON sin convertir strings a objetos `Date`.

## Razones

- Elimina ambigüedad: una fecha de reserva es un concepto de "día calendario", no un instante.
- Evita bugs silenciosos por timezone que son difíciles de reproducir y debuggear.
- El formato `YYYY-MM-DD` es universalmente entendido y compatible con `<input type="date">` en HTML.

## Consecuencias

- **No romper esta lógica sin tests**: cualquier cambio en la serialización de fechas debe verificarse con los tests unitarios (`go test ./services/...`).
- Si en el futuro se necesitan horas exactas (check-in a las 14:00), hay que rediseñar el modelo y migrar datos existentes.
- La comparación de disponibilidad en MongoDB usa `time.Time` (no strings), por lo que la normalización UTC es crítica para que el query de solapamiento funcione correctamente.
