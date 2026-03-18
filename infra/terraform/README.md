# CloudBlocks Infrastructure - Terraform

Terraform configurations for deploying CloudBlocks to Azure.

## Environments

- `environments/dev/` — Development environment

## Resources Provisioned

| Resource | Azure Service | Purpose |
|----------|--------------|---------|
| Resource Group | `azurerm_resource_group` | Logical grouping for all resources |
| Log Analytics | `azurerm_log_analytics_workspace` | Container logs and metrics |
| Container App Environment | `azurerm_container_app_environment` | Hosting environment for Container Apps |
| Container Registry | `azurerm_container_registry` | Docker image storage (Basic SKU) |
| PostgreSQL | `azurerm_postgresql_flexible_server` | Relational metadata (B_Standard_B1ms) |
| Redis | `azurerm_redis_cache` | Session cache (Basic C0, 250MB) |
| Container App | `azurerm_container_app` | Backend API with auto-scaling |
| Static Web App | `azurerm_static_web_app` | Frontend SPA hosting (Free tier) |

## Quick Start

```bash
cd environments/dev

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize, plan, apply
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## Scaling

The Container App scales horizontally based on HTTP concurrent requests. Configure via `terraform.tfvars`:

```hcl
container_min_replicas      = 1    # Minimum replicas
container_max_replicas      = 5    # Maximum replicas
scaling_concurrent_requests = "50" # Requests/replica threshold
```

## Required Variables

See `environments/dev/terraform.tfvars.example` for all variables with descriptions. Sensitive values (passwords, secrets) should use a `.tfvars` file excluded from version control or be passed via environment variables (`TF_VAR_*`).
