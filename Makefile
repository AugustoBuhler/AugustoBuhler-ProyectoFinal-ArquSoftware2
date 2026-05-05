# ─── Apartamentos Temporales — Comandos de desarrollo y examen ────────────────
#
# Uso:
#   make dev      → solo infra (DB, RabbitMQ, Solr, Memcached). Las APIs se corren localmente.
#   make up       → stack completo en Docker (modo examen / demo)
#   make down     → bajar todo
#   make rebuild  → rebuild completo de imágenes y levantar
#   make restart  → reiniciar servicios que crashearon sin rebuild
#   make logs     → ver logs de todos los servicios
#   make status   → estado de todos los contenedores
#   make clean    → bajar todo y borrar volúmenes (DESTRUCTIVO)

.PHONY: dev up down rebuild restart logs status clean

# ── Modo desarrollo: solo infraestructura ────────────────────────────────────
# Las APIs se corren localmente (go run . / npm run dev) para hot-reload rápido.
dev:
	docker compose up -d mysql mongodb rabbitmq solr memcached
	@echo ""
	@echo "Infraestructura lista. Corre las APIs localmente:"
	@echo "  cd users-api         && go run ."
	@echo "  cd apartments-api    && go run ."
	@echo "  cd bookings-api      && go run ."
	@echo "  cd search-api        && go run ."
	@echo "  cd notifications-api && go run ."
	@echo "  cd frontend          && npm run dev"

# ── Modo examen / demo: stack completo ───────────────────────────────────────
up:
	docker compose up -d

# ── Bajar todo ───────────────────────────────────────────────────────────────
down:
	docker compose down

# ── Rebuild completo (usar cuando cambiaste codigo de una API) ───────────────
rebuild:
	docker compose up -d --build

# ── Reiniciar solo los servicios que crashearon (sin rebuild) ────────────────
restart:
	docker compose restart users-api apartments-api bookings-api search-api notifications-api frontend

# ── Ver logs en tiempo real (Ctrl+C para salir) ──────────────────────────────
logs:
	docker compose logs -f

# ── Estado de todos los contenedores ─────────────────────────────────────────
status:
	docker compose ps

# ── Limpiar TODO incluyendo volumenes — BORRA LOS DATOS ─────────────────────
clean:
	@echo "ADVERTENCIA: esto borra todos los volumenes (datos de DB, etc.)"
	@read -p "Estas seguro? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v
