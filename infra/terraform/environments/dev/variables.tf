variable "location" {
  description = "Azure region for dev resources"
  type        = string
  default     = "koreacentral"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "cloudblocks"
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

# ---------- Redis ----------

variable "redis_sku" {
  description = "Azure Cache for Redis SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
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
  default     = 1
}

variable "container_max_replicas" {
  description = "Maximum number of API container replicas"
  type        = number
  default     = 3
}

variable "scaling_concurrent_requests" {
  description = "Number of concurrent HTTP requests per replica before scaling out"
  type        = string
  default     = "50"
}

# ---------- Frontend / CORS ----------

variable "frontend_url" {
  description = "Frontend application URL (used for OAuth redirect and CORS)"
  type        = string
  default     = "https://cloudblocks.example.com"
}

variable "cors_origins" {
  description = "List of allowed CORS origins for the API"
  type        = list(string)
  default     = ["https://cloudblocks.example.com"]
}
