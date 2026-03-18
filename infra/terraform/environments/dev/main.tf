locals {
  resource_group_name = "rg-${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "this" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "law-${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = "cae-${var.project_name}-${var.environment}"
  location                   = azurerm_resource_group.this.location
  resource_group_name        = azurerm_resource_group.this.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  tags                       = local.tags
}

resource "azurerm_container_registry" "this" {
  name                = "${var.project_name}${var.environment}acr"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "Basic"
  admin_enabled       = true
  tags                = local.tags
}

# ---------- PostgreSQL ----------

resource "azurerm_postgresql_flexible_server" "this" {
  name                   = "psql-${var.project_name}-${var.environment}"
  resource_group_name    = azurerm_resource_group.this.name
  location               = azurerm_resource_group.this.location
  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password
  version                = "16"
  sku_name               = "B_Standard_B1ms"
  storage_mb             = 32768

  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  tags = local.tags
}

resource "azurerm_postgresql_flexible_server_database" "cloudblocks" {
  name      = "cloudblocks"
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "require_secure_transport" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "ON"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ---------- Azure Cache for Redis ----------

resource "azurerm_redis_cache" "this" {
  name                = "redis-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  capacity            = 0
  family              = "C"
  sku_name            = var.redis_sku
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  tags = local.tags
}

# ---------- Container App (API) ----------

resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project_name}-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = azurerm_resource_group.this.name
  revision_mode                = "Single"
  tags                         = local.tags

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.this.admin_password
  }

  secret {
    name  = "database-url"
    value = "postgresql+asyncpg://${var.postgres_admin_username}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/${azurerm_postgresql_flexible_server_database.cloudblocks.name}?ssl=require"
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.this.primary_access_key}@${azurerm_redis_cache.this.hostname}:${azurerm_redis_cache.this.ssl_port}/0"
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "session-secret"
    value = var.session_secret
  }

  secret {
    name  = "github-client-id"
    value = var.github_client_id
  }

  secret {
    name  = "github-client-secret"
    value = var.github_client_secret
  }

  registry {
    server               = azurerm_container_registry.this.login_server
    username             = azurerm_container_registry.this.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.container_min_replicas
    max_replicas = var.container_max_replicas

    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = var.scaling_concurrent_requests
    }

    container {
      name   = "cloudblocks-api"
      image  = "${azurerm_container_registry.this.login_server}/cloudblocks-api:${var.container_image_tag}"
      cpu    = var.container_cpu
      memory = var.container_memory

      # --- Database ---
      env {
        name        = "CLOUDBLOCKS_DATABASE_URL"
        secret_name = "database-url"
      }

      # --- Redis / Sessions ---
      env {
        name  = "CLOUDBLOCKS_SESSION_BACKEND"
        value = "redis"
      }

      env {
        name        = "CLOUDBLOCKS_REDIS_URL"
        secret_name = "redis-url"
      }

      # --- Auth ---
      env {
        name        = "CLOUDBLOCKS_JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name        = "CLOUDBLOCKS_TOKEN_ENCRYPTION_SALT"
        secret_name = "session-secret"
      }

      env {
        name        = "CLOUDBLOCKS_GITHUB_CLIENT_ID"
        secret_name = "github-client-id"
      }

      env {
        name        = "CLOUDBLOCKS_GITHUB_CLIENT_SECRET"
        secret_name = "github-client-secret"
      }

      env {
        name  = "CLOUDBLOCKS_GITHUB_REDIRECT_URI"
        value = "https://${azurerm_container_app.api.ingress[0].fqdn}/api/v1/auth/github/callback"
      }

      # --- CORS & Frontend ---
      env {
        name  = "CLOUDBLOCKS_CORS_ORIGINS"
        value = jsonencode(var.cors_origins)
      }

      env {
        name  = "CLOUDBLOCKS_FRONTEND_URL"
        value = var.frontend_url
      }

      # --- Application ---
      env {
        name  = "CLOUDBLOCKS_APP_ENV"
        value = var.environment == "production" ? "production" : "staging"
      }

      env {
        name  = "CLOUDBLOCKS_APP_DEBUG"
        value = var.environment == "production" ? "false" : "true"
      }

      # --- Cookie security ---
      env {
        name  = "CLOUDBLOCKS_SESSION_COOKIE_SECURE"
        value = "true"
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8000

        initial_delay    = 10
        interval_seconds = 30
        timeout          = 5
        failure_count_threshold = 3
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/health/ready"
        port      = 8000

        initial_delay    = 5
        interval_seconds = 15
        timeout          = 5
        failure_count_threshold = 3
      }

      startup_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 8000

        initial_delay    = 3
        interval_seconds = 5
        timeout          = 5
        failure_count_threshold = 10
      }
    }
  }
}

# ---------- Static Web App (Frontend) ----------

resource "azurerm_static_web_app" "frontend" {
  name                = "swa-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}
