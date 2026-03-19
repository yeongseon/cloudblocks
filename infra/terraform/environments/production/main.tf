module "cloudblocks" {
  source = "../../modules/cloudblocks-stack"

  location     = var.location
  environment  = "production"
  project_name = var.project_name

  # ACR - production references staging ACR
  create_acr          = false
  acr_login_server    = var.acr_login_server
  acr_admin_username  = var.acr_admin_username
  acr_admin_password  = var.acr_admin_password

  # PostgreSQL - General Purpose tier
  postgres_admin_username        = var.postgres_admin_username
  postgres_admin_password        = var.postgres_admin_password
  postgres_sku_name              = "GP_Standard_D2s_v3"
  postgres_storage_mb            = 65536
  postgres_backup_retention_days = 30
  postgres_geo_redundant_backup  = true

  # Redis - Standard C1
  redis_sku      = "Standard"
  redis_capacity = 1

  # Container App - always warm
  container_image_tag         = var.container_image_tag
  container_cpu               = 0.5
  container_memory            = "1Gi"
  container_min_replicas      = 2
  container_max_replicas      = 5
  scaling_concurrent_requests = "50"

  # Frontend
  swa_sku_tier = "Standard"
  swa_sku_size = "Standard"

  # Auth
  github_client_id     = var.github_client_id
  github_client_secret = var.github_client_secret
  jwt_secret           = var.jwt_secret
  session_secret       = var.session_secret
  frontend_url         = var.frontend_url
  cors_origins         = var.cors_origins
}
