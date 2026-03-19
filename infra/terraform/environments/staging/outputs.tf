output "resource_group_name" {
  description = "Staging resource group name"
  value       = module.cloudblocks.resource_group_name
}

output "acr_login_server" {
  description = "Shared ACR login server (used by production too)"
  value       = module.cloudblocks.acr_login_server
}

output "container_app_url" {
  description = "Staging API URL"
  value       = module.cloudblocks.container_app_url
}

output "container_app_name" {
  description = "Staging container app name (used by CI/CD)"
  value       = module.cloudblocks.container_app_name
}

output "static_web_app_url" {
  description = "Staging frontend URL"
  value       = module.cloudblocks.static_web_app_url
}

output "postgres_fqdn" {
  description = "Staging PostgreSQL FQDN"
  value       = module.cloudblocks.postgres_fqdn
}

output "redis_hostname" {
  description = "Staging Redis hostname"
  value       = module.cloudblocks.redis_hostname
}

output "redis_ssl_port" {
  description = "Staging Redis SSL port"
  value       = module.cloudblocks.redis_ssl_port
}

output "max_replicas" {
  description = "Maximum API replicas"
  value       = module.cloudblocks.max_replicas
}
