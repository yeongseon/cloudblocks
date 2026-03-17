output "resource_group_name" {
  description = "Resource group name for the dev environment"
  value       = azurerm_resource_group.this.name
}

output "acr_login_server" {
  description = "ACR login server used for pushing/pulling images"
  value       = azurerm_container_registry.this.login_server
}

output "container_app_url" {
  description = "Public URL for the API container app"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "static_web_app_url" {
  description = "Default hostname for the static web app"
  value       = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "postgres_fqdn" {
  description = "PostgreSQL flexible server fully qualified domain name"
  value       = azurerm_postgresql_flexible_server.this.fqdn
}
