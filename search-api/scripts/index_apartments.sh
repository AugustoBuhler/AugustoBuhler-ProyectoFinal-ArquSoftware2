#!/bin/bash

# Script para indexar todos los apartamentos en Solr

echo "📥 Obteniendo apartamentos desde apartments-api..."
APARTMENTS=$(curl -s "http://localhost:8081/api/v1/apartments?size=50")

# Extraer IDs y datos
echo "$APARTMENTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
apartments = data.get('data', [])

for apt in apartments:
    doc = {
        'id': apt.get('id'),
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
    
    # Indexar en Solr
    import urllib.request
    req = urllib.request.Request(
        'http://localhost:8983/solr/apartments/update?commit=true',
        data=json_payload.encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        resp = urllib.request.urlopen(req)
        if resp.status == 200:
            print(f'✅ Indexado: {apt.get(\"name\")} (ID: {apt.get(\"id\")})')
        else:
            print(f'❌ Error: {apt.get(\"name\")} - Status {resp.status}')
    except Exception as e:
        print(f'❌ Error: {apt.get(\"name\")} - {e}')
"

echo ""
echo "✅ Indexación completada"
echo "🔍 Probando búsqueda..."
curl -s "http://localhost:8083/api/v1/search?size=5" | python3 -m json.tool | head -15

