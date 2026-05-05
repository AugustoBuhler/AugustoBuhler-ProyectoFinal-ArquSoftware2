# ADR 003 — Cache-aside de dos niveles en search-api

**Estado:** Aceptado  
**Fecha:** 2025

## Contexto

Las búsquedas de apartamentos son la operación más frecuente del sistema. Solr es rápido pero
agrega latencia de red. Se necesita reducir la carga sobre Solr y mejorar el tiempo de respuesta.

## Decisión

Implementar **cache-aside de dos niveles** en search-api:

1. **CCache local** (in-process, Go): TTL 5 minutos. Hit → respuesta inmediata sin red.
2. **Memcached distribuido**: TTL 15 minutos. Hit → 1 llamada de red a Memcached (mucho más rápida que Solr).
3. **Solr**: fuente de verdad. Miss en ambas cachés.

Flujo: request → caché local → Memcached → Solr → guardar en ambas cachés → respuesta.

La invalidación de caché ocurre cuando apartments-api publica eventos a RabbitMQ
(`created`, `updated`, `deleted`). search-api consume esos eventos y actualiza Solr.
Las cachés expiran por TTL naturalmente.

## Razones

- **Caché local**: elimina completamente la latencia de red para queries repetidas en el mismo pod. Útil en ráfagas de tráfico.
- **Memcached**: permite que múltiples instancias de search-api compartan caché. Si escala horizontalmente, no hay cache stampede.
- **Invalidación por eventos**: desacopla search-api de apartments-api. No hay polling ni consultas directas.

## Consecuencias

- **Consistencia eventual**: después de crear/editar un apartamento, puede haber hasta 5-15 minutos de datos desactualizados en búsquedas si el evento de RabbitMQ falla o se retrasa.
- **Disponibilidad de reservas**: las reservas NO invalidan la caché. Un apartamento puede aparece "disponible" en búsqueda aunque tenga una reserva reciente. La verificación real de disponibilidad ocurre en bookings-api al crear la reserva.
- Si RabbitMQ cae temporalmente, Solr puede quedar desincronizado hasta que se restaure la conexión (search-api reconecta automáticamente).
- La caché local se pierde al reiniciar el contenedor (aceptable: se reconstruye de Memcached/Solr).
