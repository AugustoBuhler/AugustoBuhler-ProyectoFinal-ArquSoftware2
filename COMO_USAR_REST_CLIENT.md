# 📡 REST Client - Guía Rápida

## ¿Qué es REST Client?

**REST Client** es una extensión de VS Code que te permite hacer peticiones HTTP directamente desde archivos `.http` o `.rest` en tu editor, **sin necesidad de usar la terminal o Postman**.

## Ventajas

✅ **No necesitas salir de VS Code**  
✅ **Puedes guardar tus requests en archivos**  
✅ **Variables reutilizables** (@baseUrl, @token, etc.)  
✅ **Fácil de compartir con tu equipo**  
✅ **Sintaxis simple y clara**

## Instalación

1. Abre VS Code
2. Ve a Extensiones (Cmd+Shift+X en Mac, Ctrl+Shift+X en Windows/Linux)
3. Busca: **"REST Client"** de **Huachao Mao** (humao.rest-client)
4. Haz clic en **Install**

## Cómo usar

### 1. Crear un archivo `.http`

Ya tenemos archivos `.http` creados:
- `users-api/requests.http`
- `apartments-api/requests.http`

### 2. Editar las requests

Los archivos `.http` tienen esta estructura:

```http
### Variables (opcional, pero útil)
@baseUrl = http://localhost:8080/api/v1
@token = tu-jwt-token-aqui

### 1. Crear usuario admin
POST {{baseUrl}}/users
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "first_name": "Admin",
  "last_name": "User",
  "user_type": "admin"
}

### 2. Login
POST {{baseUrl}}/users/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 3. Ejecutar las requests

1. Abre el archivo `.http` en VS Code
2. Verás un botón **"Send Request"** sobre cada request (encima del `###`)
3. Haz clic en **"Send Request"**
4. Se abrirá una nueva pestaña con la respuesta

## Ejemplo Práctico

### Paso 1: Abrir `users-api/requests.http`
- Navega a la carpeta `users-api` en VS Code
- Abre el archivo `requests.http`

### Paso 2: Ejecutar "Crear usuario admin"
- Haz clic en **"Send Request"** sobre la línea que dice `### 1. Crear usuario normal`
- Verás la respuesta en una nueva pestaña

### Paso 3: Ejecutar "Login"
- Copia el token de la respuesta anterior
- Actualiza la variable `@token` en el archivo
- Haz clic en **"Send Request"** sobre la línea de Login

## Sintaxis Básica

```http
### Método HTTP URL
METHOD URL
Headers (opcional)

Body (opcional, para POST/PUT/PATCH)
```

### Ejemplos:

```http
### GET simple
GET http://localhost:8080/api/v1/users/1

### POST con JSON
POST http://localhost:8080/api/v1/users
Content-Type: application/json

{
  "username": "test",
  "email": "test@example.com"
}

### POST con variables
@baseUrl = http://localhost:8080/api/v1
POST {{baseUrl}}/users
Authorization: Bearer {{token}}

### Con headers múltiples
POST http://localhost:8080/api/v1/users
Content-Type: application/json
Authorization: Bearer token123

{
  "name": "test"
}
```

## Alternativa: curl en Terminal

Si prefieres usar la terminal (como estás haciendo), usa `curl`:

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

## Ventajas de REST Client vs curl

| REST Client | curl |
|------------|------|
| ✅ Interfaz visual en VS Code | ✅ Disponible en terminal |
| ✅ Fácil de editar | ⚠️ Difícil de editar comandos largos |
| ✅ Guarda requests en archivos | ⚠️ Tienes que copiar/pegar |
| ✅ Variables reutilizables | ⚠️ Tienes que repetir URLs |
| ✅ Soporte de autocompletado | ❌ Sin autocompletado |

## Próximos Pasos

1. **Instala REST Client** en VS Code
2. **Abre** `users-api/requests.http`
3. **Ejecuta** la primera request para crear usuario admin
4. **Luego** puedes usar curl o REST Client, como prefieras

---

**Recomendación:** Usa REST Client para desarrollo, es más cómodo y rápido. Usa curl solo si prefieres la terminal o estás automatizando scripts.

