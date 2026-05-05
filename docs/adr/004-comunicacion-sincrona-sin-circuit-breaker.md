# ADR 004 — Comunicación síncrona HTTP entre servicios sin circuit breaker

**Estado:** Aceptado (con deuda técnica conocida)  
**Fecha:** 2025

## Contexto

Varios servicios necesitan datos de otros servicios durante el procesamiento de un request:

- `bookings-api` valida que el apartamento exista y esté disponible → llama a `apartments-api`
- `bookings-api` valida que el usuario exista → llama a `users-api`
- `apartments-api` busca disponibilidad por tipo → llama a `bookings-api`

Las opciones son: llamadas HTTP síncronas directas, o implementar circuit breakers / retries.

## Decisión

Usar **llamadas HTTP síncronas directas** sin circuit breaker ni retry automático.

## Razones

1. **Contexto académico**: la complejidad de implementar circuit breakers (ej: con `sony/gobreaker`) no justifica el beneficio en un entorno controlado con Docker Compose.
2. **Simplicidad de depuración**: si una llamada falla, el error se propaga directamente al usuario con un mensaje claro. No hay lógica de estado de circuito que debuggear.
3. **Servicios en red interna**: en Docker Compose todos los servicios están en `app-network`. La latencia es <1ms y los fallos son poco frecuentes.

## Consecuencias

- **Acoplamiento temporal**: si `apartments-api` cae, `bookings-api` falla al crear reservas. No hay degradación elegante.
- **Sin retry**: un timeout puntual de red falla la operación completa. El usuario recibe un error 500.
- **Dependencia circular potencial**: `apartments-api` llama a `bookings-api` para disponibilidad por tipo, y `bookings-api` llama a `apartments-api` para validar el apartamento. Esto no genera deadlock porque son llamadas independientes, pero si ambos servicios se reinician simultáneamente puede haber un período de fallo.

## Deuda técnica

Para producción real se recomienda:
- Circuit breaker (sony/gobreaker o hystrix-go)
- Retry con backoff exponencial para llamadas idempotentes (GETs)
- Timeout explícito en cada cliente HTTP (actualmente usan el timeout default)
- Health checks mutuos y startup order estricto
