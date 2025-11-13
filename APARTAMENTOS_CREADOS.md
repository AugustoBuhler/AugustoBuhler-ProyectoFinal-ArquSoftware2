# ✅ 31 Apartamentos Creados Exitosamente

## Resumen / Diagnóstico

**Estado:** ✅ Todos los 31 apartamentos del inventario inicial han sido creados correctamente.

**Resultado del script:**
- ✅ 31 apartamentos creados
- ❌ 0 fallos
- ✅ Todos los eventos publicados a RabbitMQ

## Distribución del Inventario

### 7 Quadruples (capacidad 4)
- Quadruple 1 - ID: 2 (o siguiente disponible)
- Quadruple 2 - ID: 3
- Quadruple 3 - ID: 4
- Quadruple 4 - ID: 5
- Quadruple 5 - ID: 6
- Quadruple 6 - ID: 7
- Quadruple 7 - ID: 8

### 10 Doubles Matrimoniales (capacidad 2)
- Double Matrimonial 1 - ID: 9
- Double Matrimonial 2 - ID: 10
- Double Matrimonial 3 - ID: 11
- Double Matrimonial 4 - ID: 12
- Double Matrimonial 5 - ID: 13
- Double Matrimonial 6 - ID: 14
- Double Matrimonial 7 - ID: 15
- Double Matrimonial 8 - ID: 16
- Double Matrimonial 9 - ID: 17
- Double Matrimonial 10 - ID: 18

### 4 Doubles Twin (capacidad 2)
- Double Twin 1 - ID: 19
- Double Twin 2 - ID: 20
- Double Twin 3 - ID: 21
- Double Twin 4 - ID: 22

### 10 Triples (capacidad 3)
- Triple 1 - ID: 23
- Triple 2 - ID: 24
- Triple 3 - ID: 25
- Triple 4 - ID: 26
- Triple 5 - ID: 27
- Triple 6 - ID: 28
- Triple 7 - ID: 29
- Triple 8 - ID: 30
- Triple 9 - ID: 31
- Triple 10 - ID: 32

**Nota:** Los IDs pueden variar si ya existían apartamentos (por ejemplo, si creaste uno manualmente antes).

## Verificación

### 1. Ver todos los apartamentos

```bash
curl http://localhost:8081/api/v1/apartments?size=50
```

### 2. Buscar por capacidad

```bash
# Apartamentos para 4 personas
curl "http://localhost:8081/api/v1/apartments?max_guests=4"

# Apartamentos para 2 personas
curl "http://localhost:8081/api/v1/apartments?max_guests=2"

# Apartamentos para 3 personas
curl "http://localhost:8081/api/v1/apartments?max_guests=3"
```

### 3. Buscar por ciudad

```bash
curl "http://localhost:8081/api/v1/apartments?city=Buenos Aires"
```

### 4. Ver un apartamento específico

```bash
curl http://localhost:8081/api/v1/apartments/1
```

## Eventos RabbitMQ

Todos los 31 apartamentos generaron eventos `created` en RabbitMQ:
- Exchange: `apartments.events`
- Routing Key: `apartments.events`
- Acción: `created`

### Verificar en RabbitMQ Management UI

1. Abre http://localhost:15672
2. Login: `admin` / `admin`
3. Ve a **Exchanges** → `apartments.events`
4. Verás los mensajes publicados

## Próximos Pasos

### 1. Probar Search-API (cuando esté implementado)
Los apartamentos deberían ser indexados en Solr para búsquedas rápidas.

### 2. Implementar Bookings-API
Ahora puedes crear reservas para estos apartamentos.

### 3. Crear Frontend
Interfaz para buscar y reservar apartamentos.

## Comandos Útiles

```bash
# Listar todos los apartamentos
curl http://localhost:8081/api/v1/apartments

# Listar con paginación
curl "http://localhost:8081/api/v1/apartments?page=1&size=10"

# Buscar apartamento por ID
curl http://localhost:8081/api/v1/apartments/1

# Actualizar un apartamento
curl -X PATCH http://localhost:8081/api/v1/apartments/1 \
  -H "Content-Type: application/json" \
  -d '{"price_per_night": 130.00}'

# Eliminar un apartamento
curl -X DELETE http://localhost:8081/api/v1/apartments/1
```

---

**✅ Inventario completo: 31 apartamentos listos para reservas.**

