module "cloudblocks" {
  source = "../../modules/cloudblocks-stack"

  location    = var.location
  environment = "staging"
  project_name = var.project_name

  # ACR - staging provisions shared ACR
  create_acr = true

  # PostgreSQL - Basic tier
  postgres_admin_username       = var.postgres_admin_username
  postgres_admin_password       = var.postgres_admin_password
  postgres_sku_name             = "B_Standard_B1ms"
  postgres_storage_mb           = 32768
  postgres_backup_retention_days = 7
  postgres_geo_redundant_backup = false

  # Redis - Basic C0
  redis_sku      = "Basic"
  redis_capacity = 0

  # Container App - scale to zero allowed
  container_image_tag         = var.container_image_tag
  container_cpu               = 0.5
  container_memory            = "1Gi"
  container_min_replicas      = 0
  container_max_replicas      = 3
  scaling_concurrent_requests = "50"

  # Frontend
  swa_sku_tier = "Free"
  swa_sku_size = "Free"

  # Auth
  github_client_id     = var.github_client_id
  github_client_secret = var.github_client_secret
  jwt_secret           = var.jwt_secret
  session_secret       = var.session_secret
  frontend_url         = var.frontend_url
  cors_origins         = var.cors_origins
}
