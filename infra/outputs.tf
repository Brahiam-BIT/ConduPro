output "public_ip" {
  description = "IP pública elástica de la instancia (usar como EC2_HOST en GitHub Secrets)"
  value       = aws_eip.api.public_ip
}

output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.api.id
}

output "ssh_user" {
  description = "Usuario SSH por defecto en Ubuntu"
  value       = "ubuntu"
}

output "app_directory" {
  description = "Directorio de la aplicación en el servidor"
  value       = "/opt/condupro-api"
}

output "health_check_url" {
  description = "URL del endpoint de salud"
  value       = "http://${aws_eip.api.public_ip}/health"
}
