#!/usr/bin/env bash
# Ejecutado en la EC2 tras subir el bundle compilado desde GitHub Actions.
# No compila ni hace git pull: solo dependencias de producción, migraciones y PM2.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/condupro-api}"
PM2_APP_NAME="${PM2_APP_NAME:-condupro-api}"

cd "$APP_DIR"

if [ -f .env ]; then
  while IFS= read -r line; do
    case "$line" in
      DATABASE_*)
        export "$line"
        ;;
    esac
  done < <(grep -E '^DATABASE_' .env | grep -v '^#')
fi

if [ ! -f dist/main.js ]; then
  echo "ERROR: dist/main.js no existe. El bundle de deploy no se extrajo bien."
  exit 1
fi

echo "==> Asegurando PostgreSQL..."
# Mismo compose del bootstrap (sin prod override de puertos, evita conflictos al recrear).
COMPOSE="docker compose -f docker-compose.yml"
DB_USER="${DATABASE_USER:-condupro}"
DB_NAME="${DATABASE_NAME:-condupro}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_HOST="${DATABASE_HOST:-127.0.0.1}"

host_port_open() {
  if command -v nc >/dev/null 2>&1; then
    nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null
    return
  fi
  (echo >"/dev/tcp/${DB_HOST}/${DB_PORT}") >/dev/null 2>&1
}

container_ready() {
  docker ps --filter "name=condupro-postgres" --filter "status=running" -q | grep -q . \
    && $COMPOSE exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
}

postgres_accessible() {
  host_port_open && container_ready
}

wait_for_postgres() {
  local attempt
  for attempt in $(seq 1 30); do
    if postgres_accessible; then
      echo "PostgreSQL listo (${DB_HOST}:${DB_PORT})."
      return 0
    fi
    sleep 2
  done
  return 1
}

free_port_5432() {
  echo "Liberando puerto ${DB_PORT}..."
  $COMPOSE stop postgres 2>/dev/null || true
  docker rm -f condupro-postgres 2>/dev/null || true
  local cid
  for cid in $(docker ps -q --filter "publish=${DB_PORT}" 2>/dev/null); do
    docker rm -f "$cid" 2>/dev/null || true
  done
  sleep 3
}

echo "==> Comprobando conexión a PostgreSQL..."
if ! postgres_accessible; then
  free_port_5432
  $COMPOSE up -d --wait postgres
fi

if ! wait_for_postgres; then
  echo "ERROR: no hay conexión a ${DB_HOST}:${DB_PORT} desde el host."
  echo "¿Qué usa el puerto ${DB_PORT}?"
  sudo ss -tlnp | grep ":${DB_PORT} " || true
  docker port condupro-postgres 2>/dev/null || true
  $COMPOSE ps
  $COMPOSE logs postgres --tail 40
  exit 1
fi

sudo mkdir -p /var/log/condupro-api
sudo chown "$(whoami):$(whoami)" /var/log/condupro-api
mkdir -p uploads/theory-materials

echo "==> Instalando dependencias de producción..."
npm ci --omit=dev

echo "==> Ejecutando migraciones..."
npm run migration:run:prod

echo "==> Reiniciando aplicación..."
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi

pm2 save

echo "==> Despliegue completado."
pm2 status "$PM2_APP_NAME"
