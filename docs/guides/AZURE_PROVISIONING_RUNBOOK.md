# Azure Staging Provisioning Runbook

Step-by-step guide to provision the CloudBlocks staging environment on Azure using the existing Terraform configs.

## Prerequisites

| Requirement        | How to verify                              |
| ------------------ | ------------------------------------------ |
| Azure subscription | `az account show`                          |
| Azure CLI ≥ 2.50   | `az version`                               |
| Terraform ≥ 1.5    | `terraform version`                        |
| GitHub CLI         | `gh auth status`                           |
| Repo admin access  | Can manage GitHub Environments and Secrets |

## Overview

The staging environment provisions 8 Azure resources via a single Terraform module:

```
rg-cloudblocks-staging                (Resource Group)
├── law-cloudblocks-staging           (Log Analytics Workspace)
├── cae-cloudblocks-staging           (Container App Environment)
├── cloudblocksstagingacr             (Container Registry — Basic)
├── psql-cloudblocks-staging          (PostgreSQL Flexible — B_Standard_B1ms)
├── redis-cloudblocks-staging         (Redis Cache — Basic C0)
├── ca-cloudblocks-api-staging        (Container App — API)
└── swa-cloudblocks-staging           (Static Web App — Free)
```

Estimated monthly cost: **~$80** (mostly PostgreSQL + Redis).

## Step 1: Azure Login and Subscription

```bash
# Login to Azure
az login

# Verify correct subscription
az account show --query "{name:name, id:id, state:state}" -o table

# If wrong subscription, switch:
# az account set --subscription "<subscription-id>"
```

## Step 2: Create Terraform Remote State Backend

Each environment needs a separate storage account for Terraform state. Create one before running `terraform init`.

```bash
# Choose a globally unique name (must be 3-24 lowercase alphanumeric chars)
STATE_RG="rg-cloudblocks-tfstate"
STATE_SA="tfstatecloudblocksstg"    # Must be globally unique across Azure
STATE_CONTAINER="tfstate"
LOCATION="koreacentral"

# Create resource group for state
az group create --name "$STATE_RG" --location "$LOCATION"

# Create storage account
az storage account create \
  --name "$STATE_SA" \
  --resource-group "$STATE_RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --allow-blob-public-access false

# Create blob container
az storage container create \
  --name "$STATE_CONTAINER" \
  --account-name "$STATE_SA"
```

## Step 3: Configure Terraform Backend

Add a backend configuration file in the staging environment directory.

Create `infra/terraform/environments/staging/backend.tf`:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-cloudblocks-tfstate"
    storage_account_name = "tfstatecloudblocksstg"    # Your actual name
    container_name       = "tfstate"
    key                  = "staging.terraform.tfstate"
  }
}
```

> **Do not commit `backend.tf` with real values.** Use `backend.tf.example` and `.gitignore` the real file, or pass backend config via CLI flags.

## Step 4: Generate Secrets

Generate strong secrets for the application before running Terraform.

```bash
# PostgreSQL admin password (32 chars, alphanumeric + special)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo "postgres_admin_password: $POSTGRES_PASSWORD"

# JWT secret (64 chars)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
echo "jwt_secret: $JWT_SECRET"

# Session encryption salt (32 chars)
SESSION_SECRET=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
echo "session_secret: $SESSION_SECRET"
```

Save these values securely — you will need them for `terraform.tfvars` and GitHub Secrets.

## Step 5: Configure terraform.tfvars

```bash
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
location     = "koreacentral"
project_name = "cloudblocks"

# PostgreSQL
postgres_admin_username = "cloudblocksadmin"
postgres_admin_password = "<generated-password>"

# Container App
container_image_tag = "latest"

# Auth (from GitHub OAuth App settings)
github_client_id     = "<your-github-oauth-client-id>"
github_client_secret = "<your-github-oauth-client-secret>"

# Secrets
jwt_secret     = "<generated-jwt-secret>"
session_secret = "<generated-session-secret>"

# Frontend / CORS (update after first apply with actual SWA URL)
frontend_url = "https://swa-cloudblocks-staging.<region>.azurestaticapps.net"
cors_origins = ["https://swa-cloudblocks-staging.<region>.azurestaticapps.net"]
```

> **Note:** After the first `terraform apply`, update `frontend_url` and `cors_origins` with the actual Static Web App URL from Terraform output, then run `terraform apply` again.

## Step 6: Terraform Init, Plan, Apply

```bash
cd infra/terraform/environments/staging

# Initialize with remote backend
terraform init

# Review the plan (should create ~10 resources)
terraform plan -var-file="terraform.tfvars" -out=staging.tfplan

# Apply (requires confirmation)
terraform apply staging.tfplan
```

### Expected Terraform Outputs

After successful apply:

```
container_app_url    = "https://ca-cloudblocks-api-staging.<hash>.<region>.azurecontainerapps.io"
static_web_app_url   = "https://swa-cloudblocks-staging.<region>.azurestaticapps.net"
acr_login_server     = "cloudblocksstagingacr.azurecr.io"
container_app_name   = "ca-cloudblocks-api-staging"
resource_group_name  = "rg-cloudblocks-staging"
postgres_fqdn        = "psql-cloudblocks-staging.postgres.database.azure.com"
redis_hostname       = "redis-cloudblocks-staging.redis.cache.windows.net"
```

Record these values — they are needed for GitHub Secrets in the next step.

### Post-Apply: Update Frontend URL

After the first apply, the SWA URL is known. Update `terraform.tfvars`:

```hcl
frontend_url = "https://<actual-swa-hostname>"
cors_origins = ["https://<actual-swa-hostname>"]
```

Then re-apply:

```bash
terraform plan -var-file="terraform.tfvars" -out=staging-update.tfplan
terraform apply staging-update.tfplan
```

## Step 7: Create Azure AD Service Principal for OIDC

The CI/CD pipeline uses OIDC (federated credentials) — no stored passwords needed.

```bash
# Create service principal
APP_NAME="cloudblocks-staging-cicd"
SUB_ID=$(az account show --query id -o tsv)

az ad app create --display-name "$APP_NAME"
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
az ad sp create --id "$APP_ID"
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

# Assign Contributor role on the staging resource group
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/rg-cloudblocks-staging"

# Also need AcrPush on the container registry
ACR_ID=$(az acr show --name cloudblocksstagingacr --query id -o tsv)
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPush" \
  --scope "$ACR_ID"

# Add federated credential for GitHub Actions
TENANT_ID=$(az account show --query tenantId -o tsv)
REPO="yeongseon/cloudblocks"

az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-staging-main\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${REPO}:environment:staging\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"
```

Record `APP_ID` (Client ID) and `TENANT_ID` for GitHub Secrets.

## Step 8: Configure GitHub Environment and Secrets

```bash
# Get the SWA deployment token
SWA_TOKEN=$(az staticwebapp secrets list \
  --name swa-cloudblocks-staging \
  --query "properties.apiKey" -o tsv)

# Get Terraform outputs
ACR_NAME="cloudblocksstagingacr"
ACR_LOGIN=$(terraform output -raw acr_login_server)
RG_NAME=$(terraform output -raw resource_group_name)
CA_NAME=$(terraform output -raw container_app_name)

# Set GitHub environment secrets (staging environment)
gh secret set AZURE_CLIENT_ID       --env staging --body "$APP_ID"
gh secret set AZURE_TENANT_ID       --env staging --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --env staging --body "$SUB_ID"
gh secret set ACR_NAME              --env staging --body "$ACR_NAME"
gh secret set ACR_LOGIN_SERVER      --env staging --body "$ACR_LOGIN"
gh secret set AZURE_RESOURCE_GROUP  --env staging --body "$RG_NAME"
gh secret set CONTAINER_APP_NAME    --env staging --body "$CA_NAME"
gh secret set AZURE_SWA_TOKEN       --env staging --body "$SWA_TOKEN"
```

> **GitHub Environment**: Create the `staging` environment in GitHub Settings → Environments before setting secrets. No required reviewers needed for staging.

## Step 9: Verify Deployment Pipeline

Test the deploy workflow manually before enabling automatic triggers.

```bash
# Trigger manual deploy
gh workflow run deploy.yml
```

Monitor the workflow in GitHub Actions. All 3 jobs should pass:

1. **Build & Push API Image** — builds Docker image, pushes to ACR
2. **Deploy API to Staging** — updates Container App, waits for healthy revision
3. **Deploy Web to Staging SWA** — builds frontend, deploys to Static Web App

### Smoke Test

```bash
# API health
API_URL=$(terraform output -raw container_app_url)
curl -s "$API_URL/health" | jq .

# Frontend
SWA_URL=$(terraform output -raw static_web_app_url)
curl -sI "$SWA_URL" | head -5
```

## Step 10: Enable Automatic Deploy (Optional)

Once staging is verified, enable automatic deployment on push to `main`:

In `.github/workflows/deploy.yml`, uncomment:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
```

This corresponds to issue #1274.

## Troubleshooting

### Terraform apply fails with "name already taken"

Azure resource names must be globally unique (especially ACR and PostgreSQL). Change `project_name` in `terraform.tfvars` to include a unique suffix.

### Container App shows "Degraded" status

Check container logs:

```bash
az containerapp logs show \
  --name ca-cloudblocks-api-staging \
  --resource-group rg-cloudblocks-staging \
  --follow
```

Common causes:

- Wrong `DATABASE_URL` — check PostgreSQL firewall rules
- ACR pull failure — verify registry credentials
- Port mismatch — API must listen on port 8000

### Static Web App returns 404

SWA needs a fallback route for SPA. Create `apps/web/staticwebapp.config.json`:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

### Redis connection refused

Azure Redis requires TLS. The Terraform config sets `enable_non_ssl_port = false`. Verify the connection string uses `rediss://` (note double-s for TLS).

## Cost Management

| Resource                         | Monthly Cost | Scale-to-zero? |
| -------------------------------- | ------------ | -------------- |
| PostgreSQL B_Standard_B1ms       | ~$13         | No             |
| Redis Basic C0                   | ~$16         | No             |
| Container App (Consumption)      | ~$5          | Yes (min=0)    |
| Static Web App (Free)            | $0           | —              |
| Container Registry (Basic)       | ~$5          | —              |
| Log Analytics (30-day retention) | ~$0-5        | —              |
| **Total**                        | **~$39-44**  |                |

To reduce costs when not actively testing:

- Set Container App `min_replicas = 0` (already default)
- Consider stopping PostgreSQL when not in use: `az postgres flexible-server stop`

## Teardown

To destroy all staging resources:

```bash
cd infra/terraform/environments/staging
terraform destroy -var-file="terraform.tfvars"
```

This removes all resources in `rg-cloudblocks-staging`. The state storage account (`rg-cloudblocks-tfstate`) is separate and preserved.

## Related Documents

- [Environment Strategy](ENVIRONMENT_STRATEGY.md) — Multi-environment deployment model
- [Deployment Guide](DEPLOYMENT.md) — CI/CD pipeline and Docker Compose details
- [Plausible Setup](PLAUSIBLE_SETUP.md) — Analytics self-hosting (separate from Azure staging)
- [Terraform README](../../infra/terraform/README.md) — Module structure and variable reference
