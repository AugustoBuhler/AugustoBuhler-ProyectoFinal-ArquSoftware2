# ✅ SOLUCIÓN: Users-API funcionando

## Resumen / Diagnóstico

**Problema:** `users-api` no estaba corriendo, y luego faltaba la tabla en MySQL.

**Solución:** 
1. ✅ Generado `go.sum` correctamente
2. ✅ Construido y levantado `users-api` con Docker
3. ✅ Creada tabla `users` en MySQL manualmente (temporal)

## ¿Qué es REST Client?

**REST Client** es una extensión de VS Code que te permite hacer peticiones HTTP desde archivos `.http` directamente en el editor.

### Ventajas:
- ✅ No necesitas salir de VS Code
- ✅ Puedes guardar tus requests
- ✅ Variables reutilizables (@baseUrl, @token)
- ✅ Más fácil que curl

### Cómo instalarlo:
1. Abre VS Code
2. Ve a Extensiones (Cmd+Shift+X)
3. Busca: **"REST Client"** de **Huachao Mao**
4. Haz clic en Install

### Cómo usarlo:
1. Abre `users-api/requests.http` en VS Code
2. Verás un botón **"Send Request"** sobre cada request
3. Haz clic en **"Send Request"** para ejecutar

**Ver archivo completo:** `COMO_USAR_REST_CLIENT.md`

## Pasos Completados

### ✅ Paso 1: Users-API corriendo

```bash
# Verificar que está corriendo:
docker ps | grep users-api

# Ver logs:
docker-compose logs -f users-api
```

### ✅ Paso 2: Tabla creada

La tabla `users` ya está creada en MySQL. Puedes verificar:

```bash
docker exec mysql mysql -uroot -proot -e "SHOW TABLES FROM users_db;"
```

### ✅ Paso 3: Crear usuario admin

**Opción A: Usando curl (terminal)**

```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User",
    "user_type": "admin"
  }'
```

**Opción B: Usando REST Client (VS Code)**
1. Abre `users-api/requests.http` en VS Code
2. Haz clic en **"Send Request"** sobre `### 1. Crear usuario admin`
3. Verás la respuesta en una nueva pestaña

## Verificar que funcionó

### 1. Usuario creado correctamente

Deberías ver una respuesta como:

```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User",
    "user_type": "admin"
  }
}
```

### 2. Verificar en MySQL

```bash
docker exec mysql mysql -uroot -proot -e "SELECT id, username, email, user_type FROM users_db.users;"
```

### 3. Probar Login

```bash
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Deberías recibir un JWT token.

## Próximos Pasos

Una vez que tengas el usuario admin creado (ID=1):

### 1. Probar Apartments-API

```bash
# Levantar apartments-api
docker-compose up --build -d apartments-api

# Crear un apartamento
curl -X POST http://localhost:8081/api/v1/apartments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quadruple 1",
    "description": "Amplio departamento",
    "address": "Av. Libertador 1234",
    "city": "Buenos Aires",
    "max_guests": 4,
    "bedrooms": 2,
    "bathrooms": 1,
    "amenities": ["WiFi", "AC"],
    "price_per_night": 120.50,
    "available": true,
    "owner_id": 1
  }'
```

### 2. Crear los 31 apartamentos

```bash
go run apartments-api/scripts/seed_apartments.go
```

## Resumen de Comandos Útiles

```bash
# Ver todos los contenedores
docker ps

# Ver logs de un servicio
docker-compose logs -f users-api

# Reiniciar un servicio
docker-compose restart users-api

# Reconstruir y levantar
docker-compose up --build -d users-api

# Detener un servicio
docker-compose stop users-api
```

---

**✅ Users-API está funcionando. Puedes crear usuarios y hacer login. Siguiente paso: probar Apartments-API o crear más usuarios.**

