variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "environment" {
  description = "Environment name suffix used in resource naming"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "cloudblocks"
}

variable "create_acr" {
  description = "Whether this environment should create its own Azure Container Registry"
  type        = bool
  default     = true
}

variable "acr_login_server" {
  description = "External ACR login server when create_acr is false"
  type        = string
  default     = ""

  validation {
    condition     = var.create_acr || length(var.acr_login_server) > 0
    error_message = "acr_login_server is required when create_acr is false."
  }
}

variable "acr_admin_username" {
  description = "External ACR admin username when create_acr is false"
  type        = string
  default     = ""

  validation {
    condition     = var.create_acr || length(var.acr_admin_username) > 0
    error_message = "acr_admin_username is required when create_acr is false."
  }
}

variable "acr_admin_password" {
  description = "External ACR admin password when create_acr is false"
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.create_acr || length(var.acr_admin_password) > 0
    error_message = "acr_admin_password is required when create_acr is false."
  }
}

variable "postgres_admin_username" {
  description = "Administrator username for PostgreSQL flexible server"
  type        = string
}

variable "postgres_admin_password" {
  description = "Administrator password for PostgreSQL flexible server"
  type        = string
  sensitive   = true
}

variable "postgres_sku_name" {
  description = "PostgreSQL flexible server SKU name"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768
}

variable "postgres_backup_retention_days" {
  description = "PostgreSQL backup retention period in days"
  type        = number
  default     = 7
}

variable "postgres_geo_redundant_backup" {
  description = "Enable geo-redundant backups for PostgreSQL"
  type        = bool
  default     = false
}

variable "redis_sku" {
  description = "Azure Cache for Redis SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "redis_capacity" {
  description = "Azure Cache for Redis capacity (0=C0, 1=C1, etc)"
  type        = number
  default     = 0
}

variable "container_image_tag" {
  description = "Docker tag for the cloudblocks-api image in ACR"
  type        = string
  default     = "latest"
}

variable "container_cpu" {
  description = "CPU cores allocated to each API container replica"
  type        = number
  default     = 0.5
}

variable "container_memory" {
  description = "Memory allocated to each API container replica"
  type        = string
  default     = "1Gi"
}

variable "container_min_replicas" {
  description = "Minimum number of API container replicas (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "container_max_replicas" {
  description = "Maximum number of API container replicas"
  type        = number
  default     = 3
}

variable "scaling_concurrent_requests" {
  description = "Concurrent requests per replica before scaling out"
  type        = string
  default     = "50"
}

variable "swa_sku_tier" {
  description = "Azure Static Web App SKU tier"
  type        = string
  default     = "Free"
}

variable "swa_sku_size" {
  description = "Azure Static Web App SKU size"
  type        = string
  default     = "Free"
}

variable "github_client_id" {
  description = "GitHub OAuth client ID used by API"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth client secret used by API"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret used by API (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Token encryption salt for GitHub OAuth tokens (min 16 chars)"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
}

variable "cors_origins" {
  description = "List of allowed CORS origins for the API"
  type        = list(string)
}
