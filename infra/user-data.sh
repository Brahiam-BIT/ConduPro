#!/bin/bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

APP_DIR="/opt/condupro-api"
GITHUB_REPO="${github_repo_url}"
GITHUB_BRANCH="${github_branch}"

# --- Paquetes base ---
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git nginx ufw

# --- Docker ---
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# --- Node.js 20 ---
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# --- Directorio de la app ---
mkdir -p "$APP_DIR"
chown ubuntu:ubuntu "$APP_DIR"

# Clonar repo (falla silenciosamente si aún no hay acceso público; el deploy manual lo completará)
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u ubuntu git clone --branch "$GITHUB_BRANCH" "$GITHUB_REPO" "$APP_DIR" || true
fi

# --- Nginx ---
cat > /etc/nginx/sites-available/condupro-api <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/condupro-api /etc/nginx/sites-enabled/condupro-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

# --- Firewall básico ---
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3000/tcp
echo "y" | ufw enable || true

# --- PM2 startup para ubuntu ---
env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu
systemctl enable pm2-ubuntu || true

# Postgres con docker-compose (si el repo ya está clonado)
if [ -f "$APP_DIR/docker-compose.yml" ]; then
  cd "$APP_DIR"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres || true
fi

echo "user-data bootstrap completed" > /var/log/condupro-bootstrap.log
