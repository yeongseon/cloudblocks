# ---------- Resource Group ----------

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.this.name
}

# ---------- Container Registry ----------

output "acr_login_server" {
  description = "ACR login server URL"
  value       = local.acr_login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = local.acr_admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = local.acr_admin_password
  sensitive   = true
}

# ---------- Container App ----------

output "container_app_url" {
  description = "Public URL for the API container app"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "container_app_name" {
  description = "Container app name (used by CI/CD)"
  value       = azurerm_container_app.api.name
}

# ---------- Static Web App ----------

output "static_web_app_url" {
  description = "Default hostname for the static web app"
  value       = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "static_web_app_api_key" {
  description = "Static Web App deployment API key"
  value       = azurerm_static_web_app.frontend.api_key
  sensitive   = true
}

# ---------- Database ----------

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

# ---------- Redis ----------

output "redis_hostname" {
  description = "Azure Cache for Redis hostname"
  value       = azurerm_redis_cache.this.hostname
}

output "redis_ssl_port" {
  description = "Azure Cache for Redis SSL port"
  value       = azurerm_redis_cache.this.ssl_port
}

# ---------- Scaling ----------

output "max_replicas" {
  description = "Maximum API container replicas configured"
  value       = var.container_max_replicas
}
