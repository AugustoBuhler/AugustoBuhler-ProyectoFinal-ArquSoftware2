# 🔧 Solución: Frontend y Admin Panel

## Diagnóstico Rápido

### Verificar que todos los servicios estén corriendo:

```bash
docker ps | grep -E "frontend|search-api|apartments-api|bookings-api|users-api"
```

Todos deben estar en estado "Up" o "healthy".

### Verificar que las APIs respondan:

```bash
# Search API
curl http://localhost:8083/api/v1/search?size=1

# Users API (Login)
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Apartments API
curl http://localhost:8081/api/v1/apartments?size=1

# Bookings API
curl http://localhost:8082/api/v1/bookings/1
```

## Problemas Comunes y Soluciones

### 1. Frontend no carga / Página en blanco

**Causa:** Error de JavaScript o rutas incorrectas

**Solución:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Si ves "Cannot GET /", verifica que estés en `http://localhost:3000`

### 2. No se muestran apartamentos

**Causa:** Search-API no está funcionando o no hay apartamentos indexados

**Solución:**
```bash
# Verificar que Search-API esté corriendo
docker logs search-api --tail 20

# Verificar que haya apartamentos indexados
curl http://localhost:8983/solr/apartments/select?q=*:*&rows=1&wt=json

# Si está vacío, indexar apartamentos
python3 << 'EOF'
import urllib.request, json

resp = urllib.request.urlopen('http://localhost:8081/api/v1/apartments?size=50')
data = json.loads(resp.read())
apartments = data.get('data', [])

for apt in apartments:
    doc = {
        'id': str(apt.get('id')),
        'name': apt.get('name', ''),
        'city': apt.get('city', ''),
        'max_guests': apt.get('max_guests', 0),
        'price_per_night': apt.get('price_per_night', 0),
        'amenities': apt.get('amenities', []),
        'available': apt.get('available', True)
    }
    payload = {'add': {'doc': doc}}
    json_payload = json.dumps(payload)
    
    req = urllib.request.Request(
        'http://localhost:8983/solr/apartments/update?commit=true',
        data=json_payload.encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)
    
print(f'✅ Indexados {len(apartments)} apartamentos')
EOF
```

### 3. Login de Admin no funciona

**Causa:** Usuario admin no existe o credenciales incorrectas

**Solución:**
```bash
# Verificar que el usuario admin exista
curl http://localhost:8080/api/v1/users/1

# Si no existe, crearlo
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

# Probar login
curl -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 4. CORS Error

**Causa:** Las APIs no tienen CORS configurado

**Solución:** Ya está configurado en todas las APIs. Si persiste:
- Verifica que uses `http://localhost:3000` (no `http://127.0.0.1:3000`)
- Verifica que las URLs de las APIs en el código sean correctas

### 5. Error "Cannot read property 'data' of undefined"

**Causa:** La respuesta de la API no tiene la estructura esperada

**Solución:**
- Abre la consola del navegador (F12)
- Ve a la pestaña "Network"
- Busca la petición que falla
- Verifica la respuesta de la API

## Pasos para Reiniciar Todo

Si nada funciona, reinicia todos los servicios:

```bash
# Detener todo
docker-compose down

# Limpiar volúmenes (opcional, borra datos)
# docker-compose down -v

# Levantar todo nuevamente
docker-compose up --build -d

# Ver logs
docker-compose logs -f frontend
```

## URLs Importantes

- **Frontend:** http://localhost:3000
- **Admin Login:** http://localhost:3000/admin/login
- **Admin Dashboard:** http://localhost:3000/admin/dashboard
- **Search API:** http://localhost:8083/api/v1/search
- **Users API:** http://localhost:8080/api/v1/users/login
- **Apartments API:** http://localhost:8081/api/v1/apartments
- **Bookings API:** http://localhost:8082/api/v1/bookings

## Credenciales por Defecto

- **Usuario:** admin
- **Contraseña:** admin123

## Verificar que Funcione

1. **Frontend Principal:**
   - Abre http://localhost:3000
   - Deberías ver la página de búsqueda
   - Haz clic en "Buscar Apartamentos" (sin filtros)
   - Deberías ver apartamentos

2. **Admin Login:**
   - Abre http://localhost:3000/admin/login
   - Ingresa: admin / admin123
   - Deberías ver el dashboard

3. **Admin Dashboard:**
   - Deberías ver la pestaña "Apartamentos"
   - Haz clic en "Reservas" para ver las reservas
   - Deberías poder buscar y eliminar

## Si Nada Funciona

1. Abre la consola del navegador (F12)
2. Copia todos los errores
3. Verifica los logs de Docker:
   ```bash
   docker logs frontend --tail 50
   docker logs search-api --tail 50
   docker logs users-api --tail 50
   ```

---

**¿Aún no funciona?** Copia los errores de la consola del navegador y los logs de Docker para diagnosticar mejor.

