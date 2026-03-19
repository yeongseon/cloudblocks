# CloudBlocks Infrastructure — Terraform

Terraform configurations for deploying CloudBlocks to Azure.

## Architecture

```
infra/terraform/
├── modules/
│   └── cloudblocks-stack/       # Shared module — all Azure resources
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── staging/                 # Staging environment (auto-deploy on push to main)
│   │   ├── main.tf              # Thin wrapper → cloudblocks-stack module
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   ├── production/              # Production environment (manual promotion)
│   │   ├── main.tf              # Thin wrapper → cloudblocks-stack module
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   └── dev/                     # ⚠️ DEPRECATED — legacy monolithic config
└── README.md
```

## Environments

| Environment | Purpose | Deployment | Tier |
|-------------|---------|------------|------|
| **staging** | Pre-production validation | Auto-deploy on push to `main` | Basic/Free |
| **production** | Live traffic | Manual promotion from staging | Standard/GP |
| dev (legacy) | Reference only | N/A — local dev uses Docker Compose | N/A |

## Shared Module: `cloudblocks-stack`

All Azure resources are defined in `modules/cloudblocks-stack/`. Environment wrappers are thin `main.tf` files that call the module with environment-specific values.

### Resources Provisioned

| Resource | Azure Service | Staging SKU | Production SKU |
|----------|--------------|-------------|----------------|
| Resource Group | `azurerm_resource_group` | — | — |
| Log Analytics | `azurerm_log_analytics_workspace` | PerGB2018 | PerGB2018 |
| Container App Environment | `azurerm_container_app_environment` | — | — |
| Container Registry | `azurerm_container_registry` | Basic (shared) | _(uses staging ACR)_ |
| PostgreSQL | `azurerm_postgresql_flexible_server` | B_Standard_B1ms | GP_Standard_D2s_v3 |
| Redis | `azurerm_redis_cache` | Basic C0 | Standard C1 |
| Container App | `azurerm_container_app` | 0.5 CPU, 1Gi, 0-3 replicas | 1.0 CPU, 2Gi, 2-10 replicas |
| Static Web App | `azurerm_static_web_app` | Free | Standard |

### ACR Sharing

Staging and production share a single Azure Container Registry. The ACR is created by the staging environment (`create_acr = true`). Production references it via variables (`create_acr = false`, `acr_login_server`, etc.).

## Quick Start

### Staging

```bash
cd environments/staging

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize, plan, apply
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

### Production

```bash
cd environments/production

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set acr_login_server from staging output

# Initialize, plan, apply
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

> **Important**: Deploy staging first. Production needs the ACR login server URL from staging output.

## Scaling

The Container App scales horizontally based on HTTP concurrent requests:

| Parameter | Staging | Production |
|-----------|---------|------------|
| `container_min_replicas` | 0 (scale to zero) | 2 (always running) |
| `container_max_replicas` | 3 | 10 |
| `scaling_concurrent_requests` | 50 | 100 |

## Required Variables

See `terraform.tfvars.example` in each environment directory. Sensitive values (passwords, secrets) should use a `.tfvars` file excluded from version control or be passed via environment variables (`TF_VAR_*`).

### Environment-Specific Secrets

| Variable | Staging | Production |
|----------|---------|------------|
| `postgres_admin_password` | Unique per env | Unique per env |
| `jwt_secret` | Unique per env | Unique per env |
| `session_secret` | Unique per env | Unique per env |
| `github_client_id` | Staging OAuth app | Production OAuth app |
| `github_client_secret` | Staging OAuth app | Production OAuth app |

> ⚠️ **Never** share secrets between staging and production. Each environment must have its own credentials.

## Remote State (Recommended)

Uncomment the `backend "azurerm"` block in each environment's `providers.tf` and create a shared storage account:

```bash
# One-time setup for remote state
az group create -n rg-cloudblocks-tfstate -l koreacentral
az storage account create -n cloudblockstfstate -g rg-cloudblocks-tfstate -l koreacentral --sku Standard_LRS
az storage container create -n tfstate --account-name cloudblockstfstate
```
