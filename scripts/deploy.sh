#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/condupro-api}"
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-condupro-api}"

cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "ERROR: $APP_DIR no es un repositorio git. Ejecuta el bootstrap manual (ver infra/README.md)."
  exit 1
fi

echo "==> Actualizando código (${BRANCH})..."
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/${BRANCH}"

echo "==> Instalando dependencias..."
npm ci --omit=dev

echo "==> Compilando..."
npm run build

echo "==> Asegurando PostgreSQL..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres

sudo mkdir -p /var/log/condupro-api
sudo chown "$(whoami):$(whoami)" /var/log/condupro-api
mkdir -p uploads/theory-materials

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
