variable "aws_region" {
  description = "Región de AWS donde se despliega la EC2"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombres de recursos"
  type        = string
  default     = "condupro-api"
}

variable "instance_type" {
  description = "Tipo de instancia EC2 (t3.micro entra en free tier)"
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key" {
  description = "Contenido de la clave pública SSH (ej. contenido de id_rsa.pub)"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR permitido para SSH (puerto 22). Usa 0.0.0.0/0 solo si GitHub Actions debe conectar sin IP fija."
  type        = string
  default     = "0.0.0.0/0"
}

variable "volume_size_gb" {
  description = "Tamaño del volumen raíz en GB (30 GB entra en free tier)"
  type        = number
  default     = 30
}

variable "github_repo_url" {
  description = "URL del repositorio para clonar en el bootstrap"
  type        = string
  default     = "https://github.com/Brahiam-BIT/ConduPro_api.git"
}

variable "github_branch" {
  description = "Rama a clonar en el primer arranque"
  type        = string
  default     = "main"
}
