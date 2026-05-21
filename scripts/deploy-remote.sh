#!/usr/bin/env bash
# Ejecutado en la EC2 tras subir el bundle compilado desde GitHub Actions.
# No compila ni hace git pull: solo dependencias de producción, migraciones y PM2.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/condupro-api}"
PM2_APP_NAME="${PM2_APP_NAME:-condupro-api}"

cd "$APP_DIR"

if [ ! -f dist/main.js ]; then
  echo "ERROR: dist/main.js no existe. El bundle de deploy no se extrajo bien."
  exit 1
fi

echo "==> Asegurando PostgreSQL..."
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
if docker ps --filter "name=condupro-postgres" --filter "status=running" -q | grep -q .; then
  echo "PostgreSQL ya está en ejecución (no se recrea el contenedor)."
else
  $COMPOSE up -d postgres
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
