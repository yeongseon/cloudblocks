# CloudBlocks — Production Environment
#
# Production deploys via manual promotion from staging.
# Uses Standard/GP tier resources. Shares ACR from staging.

module "cloudblocks" {
  source = "../../modules/cloudblocks-stack"

  environment  = "production"
  location     = var.location
  project_name = var.project_name

  # ACR — not created in production; uses staging ACR
  create_acr         = false
  acr_login_server   = var.acr_login_server
  acr_admin_username = var.acr_admin_username
  acr_admin_password = var.acr_admin_password

  # PostgreSQL — GP tier for production
  postgres_admin_username    = var.postgres_admin_username
  postgres_admin_password    = var.postgres_admin_password
  postgres_sku_name          = "GP_Standard_D2s_v3"
  postgres_storage_mb        = 65536
  postgres_backup_retention_days = 14
  postgres_geo_redundant_backup  = true

  # Redis — Standard tier for production
  redis_sku      = "Standard"
  redis_capacity = 1
  redis_family   = "C"

  # Auth / Secrets
  github_client_id     = var.github_client_id
  github_client_secret = var.github_client_secret
  jwt_secret           = var.jwt_secret
  session_secret       = var.session_secret

  # Container App — always running in production
  container_image_tag         = var.container_image_tag
  container_cpu               = 1.0
  container_memory            = "2Gi"
  container_min_replicas      = 2
  container_max_replicas      = 10
  scaling_concurrent_requests = "100"

  # Frontend / CORS
  frontend_url = var.frontend_url
  cors_origins = var.cors_origins

  # Static Web App — Standard tier for production
  swa_sku_tier = "Standard"
  swa_sku_size = "Standard"

  # Log Analytics
  log_retention_days = 90
}
