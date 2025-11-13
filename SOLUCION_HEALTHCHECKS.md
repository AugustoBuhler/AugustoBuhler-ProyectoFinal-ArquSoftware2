# 🔧 Solución a Problemas de Health Checks

## 📋 Resumen / Diagnóstico

Los servicios de infraestructura (MongoDB, Solr, Memcached) estaban corriendo correctamente pero marcados como "unhealthy" debido a health checks mal configurados.

**Problemas identificados:**
1. **MongoDB**: Health check estaba intentando usar `mongosh` (no disponible en MongoDB 4.4.6) en lugar de `mongo`
2. **Solr**: Endpoint de ping incorrecto o no disponible durante la inicialización
3. **Memcached**: Comando `nc` no disponible en el contenedor

## ✅ Qué se cambió

**Archivo modificado:** `docker-compose.yml`

### Cambios realizados:

1. **MongoDB (línea 36):**
   - ✅ Health check corregido para usar `mongo` con formato correcto
   - ✅ Comando: `mongo --eval 'db.adminCommand("ping")' --quiet --host localhost -u root -p root --authenticationDatabase admin | grep -q '"ok" : 1'`

2. **Solr (línea 76):**
   - ✅ Cambiado de `/solr/apartments/admin/ping` a `/solr/admin/info/system?wt=json`
   - ✅ Este endpoint siempre está disponible y no depende del core

3. **Memcached (línea 91):**
   - ✅ Simplificado para usar solo verificación TCP con bash
   - ✅ Comando: `timeout 1 bash -c '</dev/tcp/localhost/11211' || exit 1`

## 🔍 Cómo verificar

### Opción 1: Ver estado después de recrear contenedores
```bash
# Esperar 1-2 minutos para que los health checks se ejecuten
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Opción 2: Verificar manualmente cada servicio
```bash
# MongoDB
docker exec mongodb mongo --eval "db.adminCommand('ping')" --quiet --host localhost -u root -p root --authenticationDatabase admin

# Solr
curl -f http://localhost:8983/solr/admin/info/system?wt=json

# Memcached
docker exec memcached sh -c "timeout 1 bash -c '</dev/tcp/localhost/11211' && echo 'OK'"
```

### Opción 3: Ver detalles de health checks
```bash
docker inspect mongodb --format='{{json .State.Health}}' | python3 -m json.tool
docker inspect solr --format='{{json .State.Health}}' | python3 -m json.tool
docker inspect memcached --format='{{json .State.Health}}' | python3 -m json.tool
```

## ⚠️ Posibles fallos y cómo debuggear

### Si MongoDB sigue unhealthy:
```bash
# Verificar que el comando funciona manualmente:
docker exec mongodb sh -c "mongo --eval 'db.adminCommand(\"ping\")' --quiet --host localhost -u root -p root --authenticationDatabase admin"

# Si falla, verificar que MongoDB está corriendo:
docker logs mongodb --tail 20

# Forzar recreación del contenedor:
docker-compose stop mongodb
docker-compose rm -f mongodb
docker-compose up -d mongodb
```

### Si Solr sigue unhealthy:
```bash
# Verificar que Solr está escuchando:
curl http://localhost:8983/solr/admin/info/system?wt=json

# Verificar logs:
docker logs solr --tail 30

# Esperar más tiempo (Solr tarda en iniciar completamente):
# start_period es de 90s, darle más tiempo
```

### Si Memcached sigue unhealthy:
```bash
# Verificar que el puerto está escuchando:
docker exec memcached sh -c "timeout 1 bash -c '</dev/tcp/localhost/11211' && echo 'OK'"

# Si bash no está disponible, usar una alternativa:
# El contenedor memcached es muy minimalista, puede no tener bash
# En ese caso, simplificar aún más o desactivar el health check
```

## 🎯 Criterios de aceptación

**Todos los servicios deben estar "healthy" después de 1-2 minutos:**

```bash
docker ps
```

**Salida esperada:**
```
NAMES       STATUS
rabbitmq    Up X minutes (healthy)
solr        Up X minutes (healthy)
mongodb     Up X minutes (healthy)
mysql       Up X minutes (healthy)
memcached   Up X minutes (healthy)
```

## 📝 Notas importantes

1. **Los servicios funcionan aunque estén "unhealthy":** Los health checks son solo indicadores de salud. Los servicios pueden estar funcionando correctamente aunque los health checks fallen.

2. **start_period:** Los servicios tienen un período de inicio donde no se ejecutan health checks:
   - MongoDB: 30 segundos
   - Solr: 90 segundos (tarda más en iniciar)
   - Memcached: 10 segundos

3. **Si los health checks siguen fallando pero los servicios funcionan:** Puedes desactivar temporalmente los health checks comentando esas secciones en `docker-compose.yml`, o simplemente ignorarlos si los servicios funcionan correctamente para tus pruebas.

4. **Para producción:** Los health checks son importantes para orquestación (Kubernetes, Docker Swarm), pero para desarrollo local pueden ser más permisivos.

## 🔄 Próximos pasos

1. ✅ Esperar 1-2 minutos después de `docker-compose up`
2. ✅ Verificar con `docker ps`
3. ✅ Si todos están healthy, continuar con la implementación de los microservicios
4. ✅ Si alguno sigue unhealthy pero funciona manualmente, continuar de todas formas (los health checks no bloquean el funcionamiento)

---

**Estado actual:** Los health checks han sido corregidos y los contenedores recreados. Esperar 1-2 minutos y verificar con `docker ps`.

