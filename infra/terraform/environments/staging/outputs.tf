output "resource_group_name" {
  description = "Resource group name for the staging environment"
  value       = module.cloudblocks.resource_group_name
}

output "acr_login_server" {
  description = "ACR login server used for pushing/pulling images"
  value       = module.cloudblocks.acr_login_server
}

output "acr_admin_username" {
  description = "ACR admin username (needed by production environment)"
  value       = module.cloudblocks.acr_admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password (needed by production environment)"
  value       = module.cloudblocks.acr_admin_password
  sensitive   = true
}

output "container_app_url" {
  description = "Public URL for the API container app"
  value       = module.cloudblocks.container_app_url
}

output "container_app_name" {
  description = "Container app name (used by CI/CD for deployments)"
  value       = module.cloudblocks.container_app_name
}

output "static_web_app_url" {
  description = "Default hostname for the static web app"
  value       = module.cloudblocks.static_web_app_url
}

output "postgres_fqdn" {
  description = "PostgreSQL flexible server fully qualified domain name"
  value       = module.cloudblocks.postgres_fqdn
}

output "redis_hostname" {
  description = "Azure Cache for Redis hostname"
  value       = module.cloudblocks.redis_hostname
}

output "redis_ssl_port" {
  description = "Azure Cache for Redis SSL port"
  value       = module.cloudblocks.redis_ssl_port
}

output "max_replicas" {
  description = "Maximum API container replicas configured"
  value       = module.cloudblocks.max_replicas
}
