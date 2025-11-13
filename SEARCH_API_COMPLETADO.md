# ✅ Search-API Completado

## Resumen / Diagnóstico

**Estado:** ✅ Search-API completamente funcional y probado.

**Características implementadas:**
- ✅ Búsqueda con Apache Solr
- ✅ Doble caché (CCache local + Memcached)
- ✅ Consumidor RabbitMQ para sincronización automática
- ✅ Filtros múltiples (ciudad, precio, capacidad, fechas)
- ✅ Paginación y ordenamiento
- ✅ Parsing correcto de respuestas de Solr (arrays y valores simples)
- ✅ 31 apartamentos indexados correctamente

## Características Verificadas

### 1. Búsqueda Básica
```bash
curl "http://localhost:8083/api/v1/search?size=5"
```
✅ Devuelve apartamentos con todos los campos correctamente parseados

### 2. Filtros por Ciudad y Capacidad
```bash
curl "http://localhost:8083/api/v1/search?city=Buenos Aires&capacity=4&size=5"
```
✅ Filtra correctamente por ciudad y capacidad mínima

### 3. Filtros por Rango de Precio
```bash
curl "http://localhost:8083/api/v1/search?min_price=100&max_price=130&sort_by=price&sort_order=asc"
```
✅ Filtra por precio y ordena correctamente

### 4. Búsqueda por Texto Libre
```bash
curl "http://localhost:8083/api/v1/search?q=Triple&size=3"
```
✅ Busca en nombre, descripción y ciudad

### 5. Paginación
```bash
curl "http://localhost:8083/api/v1/search?page=2&size=5"
```
✅ Paginación funcionando correctamente

## Estructura de la Respuesta

```json
{
  "data": [
    {
      "id": 10,
      "name": "Double Matrimonial 2",
      "description": "Cálido y acogedor",
      "address": "Av. Corrientes 2222",
      "city": "Buenos Aires",
      "max_guests": 2,
      "bedrooms": 1,
      "bathrooms": 1,
      "amenities": ["WiFi", "Calefacción", "Cocina"],
      "price_per_night": 82.5,
      "images": null,
      "available": true
    }
  ],
  "total": 31,
  "page": 1,
  "size": 5,
  "total_pages": 7
}
```

## Doble Caché Implementada

### Nivel 1: CCache Local (5 minutos TTL)
- Cache hit rápido en la misma instancia
- LRU eviction automática

### Nivel 2: Memcached (15 minutos TTL)
- Cache distribuida entre instancias
- Cache hit más lento pero compartido

### Estrategia: Cache-Aside
1. Buscar en caché local
2. Si no está, buscar en Memcached
3. Si no está, buscar en Solr
4. Guardar en ambas cachés para próximas búsquedas

## Sincronización con RabbitMQ

El consumidor está corriendo y escucha el exchange `apartments.events`:
- ✅ `created`: Indexa nuevo apartamento
- ✅ `updated`: Actualiza apartamento en Solr
- ✅ `deleted`: Elimina apartamento de Solr

**Verificación:**
```bash
docker logs search-api | grep "RabbitMQ consumer"
# Output: RabbitMQ consumer started, waiting for messages...
```

## Indexación

**Total indexado:** 31/31 apartamentos ✅

Para re-indexar todos los apartamentos:
```bash
python3 << 'EOF'
import urllib.request, json

resp = urllib.request.urlopen('http://localhost:8081/api/v1/apartments?size=50')
data = json.loads(resp.read())
apartments = data.get('data', [])

for apt in apartments:
    doc = {
        'id': str(apt.get('id')),
        'name': apt.get('name', ''),
        'description': apt.get('description', ''),
        'address': apt.get('address', ''),
        'city': apt.get('city', ''),
        'max_guests': apt.get('max_guests', 0),
        'bedrooms': apt.get('bedrooms', 0),
        'bathrooms': apt.get('bathrooms', 0),
        'amenities': apt.get('amenities', []),
        'price_per_night': apt.get('price_per_night', 0),
        'images': apt.get('images', []),
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
EOF
```

## Parsing Corregido

El parsing ahora maneja correctamente:
- ✅ Campos como arrays (comportamiento normal de Solr)
- ✅ Campos como valores simples
- ✅ ID como string o número
- ✅ Arrays de amenities e images

## Endpoints Disponibles

### GET /api/v1/search

**Parámetros de consulta:**
- `q` (opcional): Búsqueda de texto libre
- `city` (opcional): Filtrar por ciudad
- `min_price` (opcional): Precio mínimo
- `max_price` (opcional): Precio máximo
- `capacity` (opcional): Capacidad mínima (max_guests)
- `check_in` (opcional): Fecha de entrada
- `check_out` (opcional): Fecha de salida
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Tamaño de página (default: 10, max: 100)
- `sort_by` (opcional): Campo para ordenar ("price", "name", default: "id")
- `sort_order` (opcional): Orden ("asc", "desc", default: "asc")

## Pruebas con REST Client

Abre `search-api/requests.http` en VS Code con REST Client:
- ✅ Todos los requests funcionan correctamente
- ✅ Filtros múltiples funcionando
- ✅ Paginación funcionando
- ✅ Ordenamiento funcionando

## Posibles Fallos y Cómo Debuggear

### Error: "undefined field available"
**Causa:** Filtro por `available:true` pero el campo no está indexado
**Solución:** Ya corregido - no se filtra por available en Solr, se valida después

### Error: ID = 0 en resultados
**Causa:** Parsing de ID fallando
**Solución:** Ya corregido - maneja ID como string o número

### Error: Campos vacíos
**Causa:** Solr devuelve arrays pero el código esperaba valores simples
**Solución:** Ya corregido - helpers `getString()`, `getInt()`, `getFloat()`, `getBool()` manejan ambos casos

### No se indexan nuevos apartamentos
**Causa:** Consumidor RabbitMQ no está corriendo o no recibe eventos
**Solución:** 
```bash
# Verificar logs
docker logs search-api | grep "RabbitMQ"

# Verificar conexión
docker exec search-api ping -c 1 rabbitmq
```

---

**✅ Search-API está completamente funcional y listo para producción.**

