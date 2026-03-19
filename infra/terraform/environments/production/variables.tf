variable "location" {
  description = "Azure region for production resources"
  type        = string
  default     = "koreacentral"
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "cloudblocks"
}

# ---------- ACR (shared from staging) ----------

variable "acr_login_server" {
  description = "ACR login server URL from staging (e.g. cloudblocksstagingacr.azurecr.io)"
  type        = string
}

variable "acr_admin_username" {
  description = "ACR admin username from staging"
  type        = string
}

variable "acr_admin_password" {
  description = "ACR admin password from staging"
  type        = string
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

# ---------- Auth / Secrets ----------

variable "github_client_id" {
  description = "GitHub OAuth client ID for production"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth client secret for production"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Token encryption salt (min 16 chars)"
  type        = string
  sensitive   = true
}

# ---------- Container App ----------

variable "container_image_tag" {
  description = "Docker image tag to deploy (promoted from staging)"
  type        = string
}

# ---------- Frontend / CORS ----------

variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
  default     = "https://cloudblocks.example.com"
}

variable "cors_origins" {
  description = "Allowed CORS origins for the API"
  type        = list(string)
  default     = ["https://cloudblocks.example.com"]
}
