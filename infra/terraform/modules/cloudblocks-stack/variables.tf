# ---------- General ----------

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "cloudblocks"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "tags" {
  description = "Additional tags to merge with default tags"
  type        = map(string)
  default     = {}
}

# ---------- Container Registry ----------

variable "create_acr" {
  description = "Whether to create a Container Registry (true for staging, false for production which shares staging ACR)"
  type        = bool
  default     = true
}

variable "acr_sku" {
  description = "Azure Container Registry SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "acr_login_server" {
  description = "External ACR login server URL (required when create_acr = false)"
  type        = string
  default     = ""
}

variable "acr_admin_username" {
  description = "External ACR admin username (required when create_acr = false)"
  type        = string
  default     = ""
}

variable "acr_admin_password" {
  description = "External ACR admin password (required when create_acr = false)"
  type        = string
  default     = ""
  sensitive   = true
}

# ---------- PostgreSQL ----------

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
  description = "PostgreSQL SKU (e.g. B_Standard_B1ms, GP_Standard_D2s_v3)"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768
}

variable "postgres_backup_retention_days" {
  description = "PostgreSQL backup retention in days"
  type        = number
  default     = 7
}

variable "postgres_geo_redundant_backup" {
  description = "Enable geo-redundant backup for PostgreSQL"
  type        = bool
  default     = false
}

# ---------- Redis ----------

variable "redis_sku" {
  description = "Azure Cache for Redis SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "redis_capacity" {
  description = "Redis cache capacity (0-6 for Basic/Standard, 1-5 for Premium)"
  type        = number
  default     = 0
}

variable "redis_family" {
  description = "Redis cache family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

# ---------- Auth / Secrets ----------

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

# ---------- Container App ----------

variable "container_image_tag" {
  description = "Docker tag for the cloudblocks-api image"
  type        = string
  default     = "latest"
}

variable "container_cpu" {
  description = "CPU cores per API container replica (0.25, 0.5, 1.0, 2.0)"
  type        = number
  default     = 0.5
}

variable "container_memory" {
  description = "Memory per API container replica (0.5Gi, 1Gi, 2Gi, 4Gi)"
  type        = string
  default     = "1Gi"
}

variable "container_min_replicas" {
  description = "Minimum number of API container replicas (0 = scale to zero)"
  type        = number
  default     = 1
}

variable "container_max_replicas" {
  description = "Maximum number of API container replicas"
  type        = number
  default     = 3
}

variable "scaling_concurrent_requests" {
  description = "Concurrent HTTP requests per replica before scaling out"
  type        = string
  default     = "50"
}

# ---------- Frontend / CORS ----------

variable "frontend_url" {
  description = "Frontend application URL (used for OAuth redirect and CORS)"
  type        = string
}

variable "cors_origins" {
  description = "List of allowed CORS origins for the API"
  type        = list(string)
}

# ---------- Static Web App ----------

variable "swa_sku_tier" {
  description = "Static Web App SKU tier (Free, Standard)"
  type        = string
  default     = "Free"
}

variable "swa_sku_size" {
  description = "Static Web App SKU size (Free, Standard)"
  type        = string
  default     = "Free"
}

# ---------- Log Analytics ----------

variable "log_retention_days" {
  description = "Log Analytics workspace retention in days"
  type        = number
  default     = 30
}
