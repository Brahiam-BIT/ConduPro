# Infraestructura ConduPro API (AWS EC2 + Terraform)

Provisiona una instancia **EC2 t3.micro** (free tier) con IP elástica, Docker (PostgreSQL), Node.js 20, PM2 y Nginx.

## Requisitos previos

- Cuenta AWS con credenciales configuradas (`aws configure`)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- Par de claves SSH local

## 1. Generar clave SSH

```bash
ssh-keygen -t ed25519 -f ~/.ssh/condupro-deploy -N ""
```

La clave **privada** (`condupro-deploy`) irá al secreto de GitHub `EC2_SSH_KEY`.  
La clave **pública** (`condupro-deploy.pub`) va en Terraform.

## 2. Configurar variables de Terraform

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edita `terraform.tfvars`:

```hcl
aws_region       = "us-east-1"
ssh_public_key   = "contenido completo de condupro-deploy.pub"
allowed_ssh_cidr = "0.0.0.0/0"   # o tu IP: "203.0.113.10/32"
```

> **SSH y GitHub Actions:** el workflow de deploy se conecta por SSH desde runners de GitHub (IPs dinámicas). Para CI/CD necesitas `allowed_ssh_cidr = "0.0.0.0/0"` o un bastion/SSM en una fase posterior.

## 3. Crear la infraestructura

```bash
terraform init
terraform plan
terraform apply
```

Anota los outputs:

```bash
terraform output public_ip
terraform output health_check_url
```

## 4. Secretos en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**

| Secreto       | Valor                                              |
|---------------|----------------------------------------------------|
| `EC2_HOST`    | IP de `terraform output public_ip`                 |
| `EC2_SSH_KEY` | Contenido completo de la clave privada SSH        |

El usuario SSH es siempre `ubuntu` (AMI Ubuntu 22.04).

Opcional: crea un **environment** `production` en GitHub y asocia los secretos ahí (el workflow `deploy.yml` lo usa).

## 5. Bootstrap manual en el servidor (primera vez)

Espera 2–5 minutos tras `terraform apply` para que termine `user-data`, luego:

```bash
ssh -i ~/.ssh/condupro-deploy ubuntu@<PUBLIC_IP>
```

### 5.1 Clonar el repositorio (si user-data no lo hizo)

```bash
sudo mkdir -p /opt/condupro-api
sudo chown ubuntu:ubuntu /opt/condupro-api
git clone https://github.com/Brahiam-BIT/ConduPro_api.git /opt/condupro-api
cd /opt/condupro-api
git checkout main
```

### 5.2 Crear `.env` de producción

```bash
cp .env.example .env
nano .env
```

Valores mínimos recomendados:

```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=condupro
DATABASE_USER=condupro
DATABASE_PASSWORD=<contraseña-fuerte>
JWT_SECRET=<secreto-largo-aleatorio>
JWT_REFRESH_SECRET=<otro-secreto-largo>
```

Generar secretos:

```bash
openssl rand -base64 48
```

### 5.3 PostgreSQL y primera build

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres
npm ci
npm run build
npm run migration:run:prod
```

### 5.4 PM2

```bash
sudo mkdir -p /var/log/condupro-api
sudo chown ubuntu:ubuntu /var/log/condupro-api
pm2 start ecosystem.config.js --env production
pm2 save
```

### 5.5 Nginx (opcional si user-data ya lo configuró)

```bash
sudo cp deploy/nginx/condupro.conf /etc/nginx/sites-available/condupro-api
sudo ln -sf /etc/nginx/sites-available/condupro-api /etc/nginx/sites-enabled/condupro-api
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Verificar

```bash
curl http://<PUBLIC_IP>/health
curl http://<PUBLIC_IP>/api/docs   # Swagger
```

## 7. CI/CD automático

| Evento              | Workflow              | Acción                          |
|---------------------|-----------------------|---------------------------------|
| PR hacia `main`     | `.github/workflows/ci.yml`     | lint, tests, build   |
| Push/merge en `main`| `.github/workflows/deploy.yml` | SSH + `scripts/deploy.sh` |

El workflow de deploy **compila en GitHub Actions**, sube un `deploy.tar.gz` a la EC2 y ejecuta `scripts/deploy-remote.sh` (solo `npm ci --omit=dev`, migraciones y PM2). El script `scripts/deploy.sh` queda para despliegue manual vía `git pull` en el servidor.

## 8. HTTPS (cuando tengas dominio)

1. Apunta un registro **A** de tu dominio a la Elastic IP.
2. Edita `server_name` en `/etc/nginx/sites-available/condupro-api`.
3. `sudo apt install certbot python3-certbot-nginx`
4. `sudo certbot --nginx -d api.tudominio.com`
5. En AWS, elimina la regla del puerto **3000** del security group.

## 9. Destruir recursos

```bash
cd infra
terraform destroy
```

## Costos

- **t3.micro:** ~750 h/mes gratis el primer año (cuentas nuevas).
- **Elastic IP:** gratis mientras esté asociada a una instancia encendida.
- Tras el free tier, presupuesta ~USD 8–12/mes con la instancia 24/7.
