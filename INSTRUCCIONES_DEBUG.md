# 🔧 Instrucciones para Debuggear el Frontend

## Paso 1: Verificar en el Navegador

1. **Abre http://localhost:3000 en tu navegador**
2. **Abre la consola del navegador (F12)**
3. **Ve a la pestaña "Console"**
4. **Copia todos los errores que veas (en rojo)**

## Paso 2: Verificar que los Servicios Estén Corriendo

Ejecuta el script de verificación:

```bash
./VERIFICAR_SISTEMA.sh
```

O manualmente:

```bash
# Ver todos los servicios
docker ps | grep -E "frontend|search-api|apartments-api|bookings-api|users-api"

# Ver logs del frontend
docker logs frontend --tail 50

# Verificar APIs
curl http://localhost:8083/api/v1/search?size=1
curl -X POST http://localhost:8080/api/v1/users/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

## Paso 3: Problemas Específicos

### Si el frontend no carga nada (página en blanco):

1. Abre la consola del navegador (F12)
2. Busca errores en la pestaña "Console"
3. Busca errores en la pestaña "Network" (peticiones fallidas)

### Si no se muestran apartamentos:

1. Verifica que Search-API esté funcionando:
   ```bash
   curl http://localhost:8083/api/v1/search?size=5
   ```

2. Verifica que haya apartamentos indexados en Solr:
   ```bash
   curl "http://localhost:8983/solr/apartments/select?q=*:*&rows=0&wt=json"
   ```

3. Si está vacío, indexa los apartamentos (ver SOLUCION_FRONTEND.md)

### Si el login de admin no funciona:

1. Verifica que el usuario admin exista:
   ```bash
   curl http://localhost:8080/api/v1/users/1
   ```

2. Si no existe, créalo:
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

3. Prueba el login:
   ```bash
   curl -X POST http://localhost:8080/api/v1/users/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

### Si el dashboard no carga:

1. Verifica que estés logueado (abre la consola del navegador)
2. Verifica localStorage:
   - Abre DevTools (F12)
   - Ve a "Application" → "Local Storage"
   - Debe haber un `auth_token` y un `user`

3. Si no hay token, haz login nuevamente

## Paso 4: Reiniciar Todo

Si nada funciona, reinicia todos los servicios:

```bash
# Detener todo
docker-compose down

# Limpiar (opcional, borra datos)
# docker-compose down -v

# Levantar todo
docker-compose up --build -d

# Ver logs del frontend
docker-compose logs -f frontend
```

## Paso 5: Información a Proporcionar

Si el problema persiste, proporciona:

1. **Errores de la consola del navegador** (F12 → Console)
2. **Errores de la pestaña Network** (F12 → Network → buscar peticiones en rojo)
3. **Logs del frontend:**
   ```bash
   docker logs frontend --tail 100
   ```
4. **Resultado del script de verificación:**
   ```bash
   ./VERIFICAR_SISTEMA.sh
   ```

## URLs para Probar

- **Frontend Principal:** http://localhost:3000
- **Admin Login:** http://localhost:3000/admin/login
- **Admin Dashboard:** http://localhost:3000/admin/dashboard (requiere login)

## Estado Actual del Sistema

Según el script de verificación:
- ✅ Todos los servicios están corriendo
- ✅ Search API responde correctamente
- ✅ Users API responde correctamente (login funciona)
- ✅ Apartments API responde correctamente
- ✅ Frontend responde correctamente
- ✅ 31 apartamentos indexados en Solr

**El sistema debería estar funcionando.** Si no, el problema está en el navegador o en la conexión entre el navegador y las APIs.

---

**¿Qué error específico ves en la consola del navegador?**

