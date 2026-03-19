variable "location" {
  description = "Azure region for staging resources"
  type        = string
  default     = "koreacentral"
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

# ---------- Auth / Secrets ----------

variable "github_client_id" {
  description = "GitHub OAuth client ID for staging"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth client secret for staging"
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
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# ---------- Frontend / CORS ----------

variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
  default     = "https://staging.cloudblocks.example.com"
}

variable "cors_origins" {
  description = "Allowed CORS origins for the API"
  type        = list(string)
  default     = ["https://staging.cloudblocks.example.com"]
}
