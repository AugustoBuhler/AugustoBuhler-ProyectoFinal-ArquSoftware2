# ADR 001 — MongoDB para reservas y apartamentos

**Estado:** Aceptado  
**Fecha:** 2025

## Contexto

El sistema necesita almacenar dos tipos de entidades principales:
- **Apartamentos**: datos semi-estructurados (amenities como array, imágenes como array, campos que pueden variar por tipo).
- **Reservas**: datos flexibles (user_info anidado, campos opcionales según si la reserva es pública o admin).

Las alternativas consideradas fueron MySQL (ya en uso para usuarios) y MongoDB.

## Decisión

Usar **MongoDB** para apartamentos (`apartments_db`) y reservas (`bookings_db`), y **MySQL** únicamente para usuarios.

## Razones

1. **Esquema flexible**: amenities, images y user_info son arrays/objetos anidados que requieren múltiples tablas join en SQL pero son naturales en documentos BSON.
2. **Velocidad de desarrollo**: no hay migraciones de esquema al agregar campos opcionales (ej: `admin_user_id` es nullable y se omite si no existe).
3. **Separación de bases de datos por servicio**: cada microservicio tiene su propia base de datos (principio de autonomía). Unificar en MySQL requeriría compartir instancia.
4. **MySQL para usuarios**: los usuarios sí tienen un esquema rígido y relaciones simples (un único usuario por email/username). GORM + MySQL es apropiado para eso.

## Consecuencias

- No hay joins entre apartamentos y reservas a nivel de BD; la consistencia se mantiene por validación HTTP entre servicios.
- `GetNextID` usa un query de mayor ID + 1 (no hay autoincrement nativo como en MySQL). Esto puede tener race conditions en alta concurrencia extrema; en el contexto académico es aceptable.
- Si se necesita consistencia transaccional entre reservas y apartamentos en el futuro, se requeriría sagas o two-phase commit.
