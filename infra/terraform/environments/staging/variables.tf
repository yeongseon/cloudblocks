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

variable "postgres_admin_username" {
  description = "Administrator username for PostgreSQL flexible server"
  type        = string
}

variable "postgres_admin_password" {
  description = "Administrator password for PostgreSQL flexible server"
  type        = string
  sensitive   = true
}

variable "container_image_tag" {
  description = "Docker tag for the cloudblocks-api image in ACR"
  type        = string
  default     = "latest"
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
  description = "Frontend application URL (used for OAuth redirect and CORS)"
  type        = string
}

variable "cors_origins" {
  description = "List of allowed CORS origins for the API"
  type        = list(string)
}
