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
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
# --no-recreate evita choque de puerto 5432; --wait espera el healthcheck antes de migrar.
$COMPOSE up -d --no-recreate --wait postgres 2>/dev/null || $COMPOSE up -d --wait postgres

echo "==> Comprobando conexión a PostgreSQL..."
DB_USER="${DATABASE_USER:-condupro}"
DB_NAME="${DATABASE_NAME:-condupro}"
postgres_ready=false
for _ in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "PostgreSQL listo."
    postgres_ready=true
    break
  fi
  sleep 2
done
if [ "$postgres_ready" != true ]; then
  echo "ERROR: PostgreSQL no acepta conexiones en 127.0.0.1:5432"
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
