# 🔌 Conexión a Bases de Datos - TablePlus

## 📊 Resumen Rápido

| Servicio | Tipo | Host | Puerto | Usuario | Contraseña | Base de Datos / Colección |
|----------|------|------|--------|---------|------------|---------------------------|
| **MySQL** | MySQL | `localhost` | **3306** | `root` | `root` | `users_db` |
| **MongoDB** | MongoDB | `localhost` | **27017** | `root` | `root` | `apartments_db`, `bookings_db` |
| **RabbitMQ** | AMQP | `localhost` | **5672** | `admin` | `admin` | - |
| **RabbitMQ Management** | HTTP | `http://localhost` | **15672** | `admin` | `admin` | - |
| **Solr** | HTTP | `http://localhost` | **8983** | - | - | Colección: `apartments` |
| **Memcached** | TCP | `localhost` | **11211** | - | - | - |

---

## 🗄️ MySQL (Users-API)

### Configuración para TablePlus

**Tipo de Conexión:** `MySQL`

**Datos de Conexión:**
```
Host: localhost
Puerto: 3306
Usuario: root
Contraseña: root
Base de Datos: users_db
```

**Connection String:**
```
mysql://root:root@localhost:3306/users_db
```

### Tablas

- **`users`** - Usuarios del sistema
  - Campos: `id`, `username`, `email`, `password` (hasheado), `first_name`, `last_name`, `user_type`, `created_at`, `updated_at`

### Comando de Verificación

```bash
mysql -h localhost -P 3306 -u root -proot users_db -e "SHOW TABLES;"
```

---

## 🍃 MongoDB (Apartments-API y Bookings-API)

### Configuración para TablePlus

**Tipo de Conexión:** `MongoDB`

**Datos de Conexión:**
```
Host: localhost
Puerto: 27017
Usuario: root
Contraseña: root
Authentication Database: admin
```

**Connection String:**
```
mongodb://root:root@localhost:27017/?authSource=admin
```

### Bases de Datos y Colecciones

#### 📦 `apartments_db`
**Colección:** `apartments`
- Documentos con información de apartamentos
- **Campos principales:**
  - `id` (int64): ID del apartamento
  - `name` (string): Nombre (ej: "Double Matrimonial 1")
  - `description` (string): Descripción
  - `address` (string): Dirección
  - `city` (string): Ciudad
  - `max_guests` (int): Capacidad máxima
  - `bedrooms` (int): Número de habitaciones
  - `bathrooms` (int): Número de baños
  - `amenities` (array): Comodidades
  - `price_per_night` (float64): Precio por noche
  - `available` (bool): Disponible
  - `owner_id` (int64): ID del dueño
  - `created_at` (datetime): Fecha de creación
  - `updated_at` (datetime): Fecha de actualización

#### 📅 `bookings_db`
**Colección:** `bookings`
- Documentos con información de reservas
- **Campos principales:**
  - `id` (int64): ID de la reserva
  - `apartment_id` (int64): ID del apartamento
  - `user_id` (int64, opcional): ID del usuario (null para reservas públicas)
  - `user_info` (object): Información del huésped
    - `id` (string): DNI del huésped
    - `first_name` (string): Nombre
    - `last_name` (string): Apellido
    - `dni` (string): DNI
    - `phone` (string): Teléfono
    - `email` (string): Email
  - `check_in` (datetime): Fecha de entrada
  - `check_out` (datetime): Fecha de salida
  - `guests` (int): Número de huéspedes
  - `total_price` (float64): Precio total
  - `payment_method` (string): "transferencia" o "efectivo"
  - `status` (string): "confirmed", "cancelled", "pending"
  - `created_by_admin` (bool): Si fue creada por admin
  - `admin_user_id` (int64, opcional): ID del admin que creó la reserva
  - `created_at` (datetime): Fecha de creación
  - `updated_at` (datetime): Fecha de actualización

### Comandos de Verificación

```bash
# Ver bases de datos
docker-compose exec mongodb mongo --quiet -u root -p root --authenticationDatabase admin --eval "show dbs"

# Ver colecciones de apartments_db
docker-compose exec mongodb mongo --quiet -u root -p root --authenticationDatabase admin apartments_db --eval "show collections"

# Ver colecciones de bookings_db
docker-compose exec mongodb mongo --quiet -u root -p root --authenticationDatabase admin bookings_db --eval "show collections"

# Contar documentos en bookings
docker-compose exec mongodb mongo --quiet -u root -p root --authenticationDatabase admin bookings_db --eval "db.bookings.count()"

# Ver reservas de un apartamento específico
docker-compose exec mongodb mongo --quiet -u root -p root --authenticationDatabase admin bookings_db --eval "db.bookings.find({apartment_id: 9}).pretty()"
```

---

## 🐰 RabbitMQ

### Management UI (Navegador Web)

**URL:** `http://localhost:15672`

**Credenciales:**
- **Usuario:** `admin`
- **Contraseña:** `admin`

### Conexión AMQP (para TablePlus o clientes AMQP)

**Host:** `localhost`
**Puerto:** `5672`
**Usuario:** `admin`
**Contraseña:** `admin`
**Virtual Host:** `/` (por defecto)

### Exchanges

- **`apartments.events`** - Eventos de apartamentos
  - Tipo: `fanout`
  - Eventos: `created`, `updated`, `deleted`

- **`bookings.events`** - Eventos de reservas
  - Tipo: `fanout`
  - Eventos: `created`, `updated`, `deleted`

### Queues

- Consumidor de `apartments.events` en `search-api` para indexar/actualizar Solr

### Comando de Verificación

```bash
curl -u admin:admin http://localhost:15672/api/overview
```

---

## 🔍 Solr

### Admin UI (Navegador Web)

**URL:** `http://localhost:8983/solr`

### Colecciones

- **`apartments`** - Índice de apartamentos para búsqueda rápida

### Endpoints Útiles

**Admin Info:**
```
GET http://localhost:8983/solr/admin/info/system?wt=json
```

**Query de Apartamentos (todos):**
```
GET http://localhost:8983/solr/apartments/select?q=*:*&wt=json
```

**Query con filtros:**
```
GET http://localhost:8983/solr/apartments/select?q=city:Buenos Aires&wt=json
```

### Comando de Verificación

```bash
curl http://localhost:8983/solr/admin/info/system?wt=json
```

---

## 💾 Memcached

**Host:** `localhost`
**Puerto:** `11211`

**Uso:** Caché distribuido para `search-api` (optimización de consultas)

**Nota:** TablePlus no soporta Memcached directamente, pero puedes usar herramientas como `telnet` o clientes de línea de comandos.

### Comando de Verificación

```bash
# Verificar que está corriendo
telnet localhost 11211

# Dentro de telnet, escribir:
stats
quit
```

---

## 🔗 URLs y Endpoints de APIs

| Servicio | URL Base | Puerto |
|----------|----------|--------|
| **Users-API** | `http://localhost:8080/api/v1` | 8080 |
| **Apartments-API** | `http://localhost:8081/api/v1` | 8081 |
| **Bookings-API** | `http://localhost:8082/api/v1` | 8082 |
| **Search-API** | `http://localhost:8083/api/v1` | 8083 |
| **Frontend** | `http://localhost:3000` | 3000 |

---

## 📝 Guía Paso a Paso para TablePlus

### 1. Conectar a MySQL

1. Abrir TablePlus
2. Click en "Create a new connection"
3. Seleccionar "MySQL"
4. Llenar:
   - **Name:** `Proyecto Final - MySQL (Users-API)`
   - **Host:** `localhost`
   - **Port:** `3306`
   - **User:** `root`
   - **Password:** `root`
   - **Database:** `users_db`
5. Click "Test" para verificar conexión
6. Click "Connect"

### 2. Conectar a MongoDB

1. Abrir TablePlus
2. Click en "Create a new connection"
3. Seleccionar "MongoDB"
4. Llenar:
   - **Name:** `Proyecto Final - MongoDB`
   - **Host:** `localhost`
   - **Port:** `27017`
   - **User:** `root`
   - **Password:** `root`
   - **Authentication Database:** `admin`
5. Click "Test" para verificar conexión
6. Click "Connect"
7. Seleccionar base de datos (`apartments_db` o `bookings_db`)
8. Las colecciones aparecerán como "tables"

---

## 🧪 Queries Útiles para Verificar Datos

### MySQL - Ver Usuarios

```sql
SELECT * FROM users;
SELECT * FROM users WHERE user_type = 'admin';
```

### MongoDB - Ver Apartamentos

```javascript
// En MongoDB shell o TablePlus
db.apartments.find().pretty()
db.apartments.find({city: "Buenos Aires"})
db.apartments.find({"max_guests": {$gte: 4}})
```

### MongoDB - Ver Reservas

```javascript
// Ver todas las reservas
db.bookings.find().pretty()

// Ver reservas de un apartamento específico
db.bookings.find({apartment_id: 9})

// Ver reservas con solapamiento de fechas (verificar disponibilidad)
db.bookings.find({
  apartment_id: 9,
  status: {$ne: "cancelled"},
  check_in: {$lt: ISODate("2026-01-29T00:00:00Z")},
  check_out: {$gt: ISODate("2026-01-28T00:00:00Z")}
})
```

---

## ⚠️ Solución de Problemas

### Si no puedes conectar a MySQL:

```bash
# Verificar que el contenedor está corriendo
docker ps | grep mysql

# Ver logs
docker-compose logs mysql

# Reiniciar
docker-compose restart mysql
```

### Si no puedes conectar a MongoDB:

```bash
# Verificar que el contenedor está corriendo
docker ps | grep mongodb

# Ver logs
docker-compose logs mongodb

# Reiniciar
docker-compose restart mongodb

# Probar conexión manual
docker-compose exec mongodb mongo -u root -p root --authenticationDatabase admin
```

### Si los puertos están ocupados:

```bash
# Ver qué está usando el puerto
lsof -i :3306  # MySQL
lsof -i :27017 # MongoDB
lsof -i :15672 # RabbitMQ Management
```

---

**✅ Con estos datos podrás conectarte a todas las bases de datos desde TablePlus y verificar que todo esté funcionando correctamente.**
