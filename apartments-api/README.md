# Apartments API

Microservicio para la gestión de apartamentos amoblados.

## Características

- ✅ CRUD completo de apartamentos
- ✅ Validación de owner mediante users-api
- ✅ Publicación de eventos a RabbitMQ en operaciones de escritura
- ✅ Filtros y paginación en listado
- ✅ Patrón MVC completo

## Endpoints

### POST /api/v1/apartments
Crear nuevo apartamento

### GET /api/v1/apartments/:id
Obtener apartamento por ID

### GET /api/v1/apartments
Listar apartamentos (con filtros opcionales: city, available, max_guests, page, size)

### PATCH /api/v1/apartments/:id
Actualizar apartamento

### DELETE /api/v1/apartments/:id
Eliminar apartamento

## Inicialización de Datos

Para crear los 31 apartamentos iniciales, ejecutar:

```bash
# Asegurarse de que apartments-api está corriendo
# Asegurarse de que users-api tiene un usuario con ID 1 (crear admin primero)

cd apartments-api/scripts
go run seed_apartments.go
```

O desde la raíz del proyecto:

```bash
go run apartments-api/scripts/seed_apartments.go http://localhost:8081/api/v1/apartments
```

## Pruebas

Usar el archivo `requests.http` con la extensión REST Client de VS Code.

