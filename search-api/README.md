# Search API

Microservicio de búsqueda rápida de apartamentos usando Solr con doble caché.

## Características

- ✅ Búsqueda con Apache Solr
- ✅ **Doble caché:**
  - CCache local (TTL: 5 minutos)
  - Memcached distribuida (TTL: 15 minutos)
- ✅ Consumidor RabbitMQ que sincroniza Solr automáticamente
- ✅ Filtros múltiples: ciudad, precio, capacidad, fechas
- ✅ Paginación y ordenamiento
- ✅ Cache-aside pattern

## Endpoints

### GET /api/v1/search

Búsqueda de apartamentos con filtros opcionales.

**Parámetros de consulta:**
- `q` (opcional): Búsqueda de texto libre
- `city` (opcional): Filtrar por ciudad
- `min_price` (opcional): Precio mínimo
- `max_price` (opcional): Precio máximo
- `capacity` (opcional): Capacidad mínima (max_guests)
- `check_in` (opcional): Fecha de entrada (para validar disponibilidad)
- `check_out` (opcional): Fecha de salida (para validar disponibilidad)
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Tamaño de página (default: 10, max: 100)
- `sort_by` (opcional): Campo para ordenar ("price", "name", default: "id")
- `sort_order` (opcional): Orden ("asc", "desc", default: "asc")

**Ejemplo:**
```
GET /api/v1/search?city=Buenos Aires&capacity=4&min_price=100&max_price=130&page=1&size=10
```

## Estrategia de Caché

1. **Primer nivel (Local - CCache):**
   - TTL: 5 minutos
   - LRU eviction
   - Cache hit rápido en la misma instancia

2. **Segundo nivel (Distribuida - Memcached):**
   - TTL: 15 minutos
   - Compartida entre instancias
   - Cache hit más lento pero distribuido

3. **Cache-aside:**
   - Si no está en caché, busca en Solr
   - Guarda resultado en ambas cachés
   - Actualización de caché manual (invalidación)

## Sincronización con RabbitMQ

El consumidor escucha el exchange `apartments.events` y sincroniza Solr:
- `created`: Indexa nuevo apartamento
- `updated`: Actualiza apartamento en Solr
- `deleted`: Elimina apartamento de Solr

Para obtener datos completos, llama a `apartments-api GET /apartments/:id`.

## Indexación Inicial

Para indexar todos los apartamentos existentes:

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
        'city': apt.get('city', ''),
        'max_guests': apt.get('max_guests', 0),
        'price_per_night': apt.get('price_per_night', 0),
        # ... otros campos
    }
    payload = {'add': {'doc': doc}}
    # POST a http://localhost:8983/solr/apartments/update?commit=true
EOF
```

## Verificar Sincronización

1. Crear un apartamento en apartments-api
2. Verificar que aparece en Solr Admin: http://localhost:8983
3. Buscar en search-api para verificar que está indexado

