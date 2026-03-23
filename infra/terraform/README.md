# CloudBlocks Infrastructure - Terraform

Terraform configurations for deploying CloudBlocks to Azure.

> **Strategy**: See [Environment Strategy](../../docs/guides/ENVIRONMENT_STRATEGY.md) for the full deployment model and [ADR-0007](../../docs/adr/0007-multi-environment-deployment-strategy.md) for the decision record.

## Structure

```text
infra/terraform/
├── modules/
│   └── cloudblocks-stack/          # Shared module (all Azure resources)
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── versions.tf
└── environments/
    ├── dev/                        # Legacy — original monolithic config
    ├── staging/                    # Staging environment wrapper
    │   └── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
    └── production/                 # Production environment wrapper
        └── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
```

## Environments

| Environment  | Directory                  | Purpose                                 | Terraform `var.environment` |
| ------------ | -------------------------- | --------------------------------------- | --------------------------- |
| Staging      | `environments/staging/`    | Pre-production validation, UAT          | `staging`                   |
| Production   | `environments/production/` | Live service                            | `production`                |
| Dev (legacy) | `environments/dev/`        | Original monolithic config (deprecated) | —                           |

> **Note**: `environments/dev/` is the original monolithic Terraform configuration. Use `staging/` or `production/` for new cloud deployments.

## Resources Provisioned

| Resource                  | Azure Service                        | Purpose                                           |
| ------------------------- | ------------------------------------ | ------------------------------------------------- |
| Resource Group            | `azurerm_resource_group`             | Logical grouping for all resources                |
| Log Analytics             | `azurerm_log_analytics_workspace`    | Container logs and metrics                        |
| Container App Environment | `azurerm_container_app_environment`  | Hosting environment for Container Apps            |
| Container Registry        | `azurerm_container_registry`         | Docker image storage (shared, created by staging) |
| PostgreSQL                | `azurerm_postgresql_flexible_server` | Relational metadata                               |
| Redis                     | `azurerm_redis_cache`                | Session cache                                     |
| Container App             | `azurerm_container_app`              | Backend API with auto-scaling                     |
| Static Web App            | `azurerm_static_web_app`             | Frontend SPA hosting                              |

### Environment-Specific SKUs

| Resource           | Staging                            | Production                 |
| ------------------ | ---------------------------------- | -------------------------- |
| PostgreSQL         | B_Standard_B1ms                    | GP_Standard_D2s_v3         |
| Redis              | Basic C0 (250MB)                   | Standard C1                |
| Static Web App     | Free                               | Standard                   |
| Container Registry | Basic (shared, created by staging) | — (references staging ACR) |

## Quick Start

```bash
cd environments/staging  # or environments/production

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize, plan, apply
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

> **Important (remote state)**: Each environment should use a separate Terraform backend (e.g., Azure Storage Account). Storage account names must be globally unique across all of Azure — choose a name that includes your project and environment, e.g., `tfstatecloudblocksstg`.

## Scaling

The Container App scales horizontally based on HTTP concurrent requests. Configure per environment via `terraform.tfvars`:

```hcl
# Staging
container_min_replicas      = 0    # Scale to zero allowed
container_max_replicas      = 3
scaling_concurrent_requests = "50"

# Production
container_min_replicas      = 2    # Always warm
container_max_replicas      = 5
scaling_concurrent_requests = "50"
```

## Required Variables

See `environments/staging/terraform.tfvars.example` for all variables with descriptions. For production, see `environments/production/terraform.tfvars.example` — ACR values must reference staging outputs.

Sensitive values (passwords, secrets) should use a `.tfvars` file excluded from version control or be passed via environment variables (`TF_VAR_*`).

## Resource Naming

All resources follow the pattern `{type}-cloudblocks-{env}`:

| Pattern                    | Staging Example              | Production Example              |
| -------------------------- | ---------------------------- | ------------------------------- |
| `rg-cloudblocks-{env}`     | `rg-cloudblocks-staging`     | `rg-cloudblocks-production`     |
| `psql-cloudblocks-{env}`   | `psql-cloudblocks-staging`   | `psql-cloudblocks-production`   |
| `redis-cloudblocks-{env}`  | `redis-cloudblocks-staging`  | `redis-cloudblocks-production`  |
| `ca-cloudblocks-api-{env}` | `ca-cloudblocks-api-staging` | `ca-cloudblocks-api-production` |
| `swa-cloudblocks-{env}`    | `swa-cloudblocks-staging`    | `swa-cloudblocks-production`    |

Container Registry uses the pattern `{project}{env}acr` (no hyphens — ACR does not allow them).
