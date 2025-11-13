#!/bin/bash

echo "🔍 Verificando Sistema..."
echo ""

echo "1. Verificando contenedores..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|frontend|search-api|apartments-api|bookings-api|users-api"

echo ""
echo "2. Verificando Search API..."
curl -s http://localhost:8083/api/v1/search?size=1 | python3 -m json.tool | head -5 || echo "❌ Search API no responde"

echo ""
echo "3. Verificando Users API (Login)..."
curl -s -X POST http://localhost:8080/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -m json.tool | head -5 || echo "❌ Users API no responde o credenciales incorrectas"

echo ""
echo "4. Verificando Apartments API..."
curl -s http://localhost:8081/api/v1/apartments?size=1 | python3 -m json.tool | head -5 || echo "❌ Apartments API no responde"

echo ""
echo "5. Verificando Frontend..."
curl -s http://localhost:3000 | grep -q "root" && echo "✅ Frontend respondiendo" || echo "❌ Frontend no responde"

echo ""
echo "6. Verificando Solr (indexación)..."
SOLR_COUNT=$(curl -s "http://localhost:8983/solr/apartments/select?q=*:*&rows=0&wt=json" | python3 -c "import sys, json; print(json.load(sys.stdin)['response']['numFound'])" 2>/dev/null || echo "0")
echo "Apartamentos indexados en Solr: $SOLR_COUNT"

echo ""
echo "✅ Verificación completada"
echo ""
echo "Si algún servicio no responde, ejecuta:"
echo "docker-compose up --build -d [servicio]"

