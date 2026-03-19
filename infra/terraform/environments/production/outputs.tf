output "resource_group_name" {
  description = "Production resource group name"
  value       = module.cloudblocks.resource_group_name
}

output "container_app_url" {
  description = "Production API URL"
  value       = module.cloudblocks.container_app_url
}

output "container_app_name" {
  description = "Production container app name (used by CI/CD)"
  value       = module.cloudblocks.container_app_name
}

output "static_web_app_url" {
  description = "Production frontend URL"
  value       = module.cloudblocks.static_web_app_url
}

output "postgres_fqdn" {
  description = "Production PostgreSQL FQDN"
  value       = module.cloudblocks.postgres_fqdn
}

output "redis_hostname" {
  description = "Production Redis hostname"
  value       = module.cloudblocks.redis_hostname
}

output "redis_ssl_port" {
  description = "Production Redis SSL port"
  value       = module.cloudblocks.redis_ssl_port
}

output "max_replicas" {
  description = "Maximum API replicas"
  value       = module.cloudblocks.max_replicas
}
