# Sistema de Reserva de Apartamentos Amoblados

Sistema de microservicios en Go para la gestión de reservas de apartamentos temporales.

## Arquitectura

- **users-api** (Puerto 8080): Gestión de usuarios y autenticación JWT
- **apartments-api** (Puerto 8081): CRUD de apartamentos
- **bookings-api** (Puerto 8082): Gestión de reservas con cálculo concurrente
- **search-api** (Puerto 8083): Búsqueda con Solr y doble caché
- **frontend** (Puerto 3000): Interfaz React

## Requisitos Previos

- Docker y Docker Compose instalados
- Go 1.21+ (para desarrollo local)
- VS Code con extensiones: Go, REST Client, Docker

## Inicio Rápido

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` en cada microservicio (si es necesario)
3. Ejecutar: `docker-compose up --build`
4. Acceder a:
   - Frontend: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672 (admin/admin)
   - Solr Admin: http://localhost:8983

## Desarrollo

Ver documentación específica en cada microservicio.

