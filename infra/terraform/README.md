# CloudBlocks Infrastructure - Terraform

Terraform configurations for deploying CloudBlocks to Azure.

> **Strategy**: See [Environment Strategy](../../docs/guides/ENVIRONMENT_STRATEGY.md) for the full deployment model and [ADR-0007](../../docs/adr/0007-multi-environment-deployment-strategy.md) for the decision record.

## Environments

CloudBlocks uses two cloud environments. Local development uses Docker Compose (not Terraform).

| Environment | Directory | Purpose | Terraform `var.environment` |
|---|---|---|---|
| Staging | `environments/staging/` | Pre-production validation, UAT | `staging` |
| Production | `environments/production/` | Live service | `production` |

> **Note**: The `environments/dev/` directory contains the original monolithic Terraform configuration that will be refactored into the shared module during Phase B of the implementation plan.

## Structure

```
infra/terraform/
├── modules/
│   └── cloudblocks-stack/          # Shared module (all Azure resources)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    ├── dev/                        # Legacy — basis for shared module extraction
    ├── staging/                    # Staging environment
    │   └── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
    └── production/                 # Production environment
        └── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
```

## Resources Provisioned

| Resource | Azure Service | Purpose |
|----------|--------------|---------|
| Resource Group | `azurerm_resource_group` | Logical grouping for all resources |
| Log Analytics | `azurerm_log_analytics_workspace` | Container logs and metrics |
| Container App Environment | `azurerm_container_app_environment` | Hosting environment for Container Apps |
| Container Registry | `azurerm_container_registry` | Docker image storage (shared across environments) |
| PostgreSQL | `azurerm_postgresql_flexible_server` | Relational metadata |
| Redis | `azurerm_redis_cache` | Session cache |
| Container App | `azurerm_container_app` | Backend API with auto-scaling |
| Static Web App | `azurerm_static_web_app` | Frontend SPA hosting |

### Environment-Specific SKUs

| Resource | Staging | Production |
|----------|---------|------------|
| PostgreSQL | B_Standard_B1ms | GP_Standard_D2s_v3 |
| Redis | Basic C0 (250MB) | Standard C1 |
| Static Web App | Free | Standard |
| Container Registry | Basic (shared) | Basic (shared) |

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

## Scaling

The Container App scales horizontally based on HTTP concurrent requests. Configure via `terraform.tfvars`:

```hcl
container_min_replicas      = 1    # Minimum replicas
container_max_replicas      = 3    # Maximum replicas (staging: 2, production: 3)
scaling_concurrent_requests = "50" # Requests/replica threshold
```

## Required Variables

See `environments/staging/terraform.tfvars.example` for all variables with descriptions. Sensitive values (passwords, secrets) should use a `.tfvars` file excluded from version control or be passed via environment variables (`TF_VAR_*`).

## Resource Naming

All resources follow the pattern `{type}-cloudblocks-{env}`:

| Pattern | Staging Example | Production Example |
|---------|----------------|-------------------|
| `rg-cloudblocks-{env}` | `rg-cloudblocks-staging` | `rg-cloudblocks-prod` |
| `psql-cloudblocks-{env}` | `psql-cloudblocks-staging` | `psql-cloudblocks-prod` |
| `redis-cloudblocks-{env}` | `redis-cloudblocks-staging` | `redis-cloudblocks-prod` |
| `ca-cloudblocks-api-{env}` | `ca-cloudblocks-api-staging` | `ca-cloudblocks-api-prod` |
| `swa-cloudblocks-{env}` | `swa-cloudblocks-staging` | `swa-cloudblocks-prod` |
