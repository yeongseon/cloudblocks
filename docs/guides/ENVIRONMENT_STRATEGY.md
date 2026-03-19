# CloudBlocks — Environment Strategy

> **Decision record**: [ADR-0007](../adr/0007-multi-environment-deployment-strategy.md)

## Overview

CloudBlocks uses a **two-cloud-environment model** with local development via Docker Compose. Only staging and production are deployed to Azure.

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Local (dev)   │     │   Staging (Azure)    │     │  Production (Azure)  │
│                 │     │                      │     │                      │
│ Docker Compose  │     │ Container Apps       │     │ Container Apps       │
│ PostgreSQL 16   │     │ Azure PostgreSQL     │     │ Azure PostgreSQL     │
│ Redis 7         │     │ Azure Cache Redis    │     │ Azure Cache Redis    │
│ Vite dev server │     │ Static Web Apps      │     │ Static Web Apps      │
│                 │     │                      │     │                      │
│ Cost: $0        │     │ Cost: ~$39/mo        │     │ Cost: ~$150/mo       │
└─────────────────┘     └──────────────────────┘     └──────────────────────┘
        ↑                        ↑                            ↑
   docker compose up      Push to main               Manual promotion
                          (auto-deploy)              (approval required)
```

## Environment Definitions

### Local Development

| Attribute | Value |
|-----------|-------|
| Type | Docker Compose (`docker-compose.yml` + `docker-compose.dev.yml`) |
| `CLOUDBLOCKS_APP_ENV` | `development` |
| Purpose | Feature development, debugging, unit/integration testing |
| Database | PostgreSQL 16 container |
| Cache | Redis 7 container |
| Frontend | Vite dev server with HMR (`localhost:5173`) |
| Backend | FastAPI with `--reload` (`localhost:8000`) |
| Secret strength | Relaxed (weak secrets allowed) |
| Debug mode | `true` |
| Cost | $0 |

**Start local dev:**

```bash
# Full stack (with backend services)
docker compose up -d

# Dev mode with hot-reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend only (no backend needed for visual builder)
cd apps/web && pnpm dev
```

### Staging

| Attribute | Value |
|-----------|-------|
| Type | Azure Cloud |
| Terraform `var.environment` | `staging` |
| `CLOUDBLOCKS_APP_ENV` | `staging` |
| Purpose | Pre-production validation, integration testing, UAT |
| Deployment trigger | Automatic on push to `main` (after CI passes) |
| Approval | None (auto-deploy) |
| Resource Group | `rg-cloudblocks-staging` |
| Database | Azure PostgreSQL Flexible Server (B_Standard_B1ms) |
| Cache | Azure Cache for Redis (Basic C0) |
| Frontend | Azure Static Web Apps (Free tier) |
| Backend | Azure Container Apps (1–2 replicas) |
| Secret strength | Strict (strong secrets required, app refuses to start otherwise) |
| Debug mode | `false` |
| SSL | Required |
| Estimated cost | ~$39/mo |

### Production

| Attribute | Value |
|-----------|-------|
| Type | Azure Cloud |
| Terraform `var.environment` | `production` |
| `CLOUDBLOCKS_APP_ENV` | `production` |
| Purpose | Live user-facing service |
| Deployment trigger | Manual promotion from staging |
| Approval | Required (GitHub Environment protection, 1+ reviewer) |
| Resource Group | `rg-cloudblocks-production` |
| Database | Azure PostgreSQL Flexible Server (GP_Standard_D2s_v3) |
| Cache | Azure Cache for Redis (Standard C1) |
| Frontend | Azure Static Web Apps (Standard tier) |
| Backend | Azure Container Apps (1–3 replicas, HTTP auto-scaling) |
| Secret strength | Strict |
| Debug mode | `false` |
| SSL | Required |
| Geo-redundant backup | Yes |
| Estimated cost | ~$150/mo |

## Environment Name Standard

Every layer in the system uses consistent environment identifiers:

| Context | Local | Staging | Production |
|---------|-------|---------|------------|
| `CLOUDBLOCKS_APP_ENV` | `development` | `staging` | `production` |
| Terraform `var.environment` | N/A (not Terraform-managed) | `staging` | `production` |
| Docker Compose | `docker-compose.yml` | N/A | N/A |
| Resource name suffix | N/A | `-staging` | `-production` |
| GitHub Environment | N/A | `staging` | `production` |

**Rule**: Local dev NEVER uses Terraform. Cloud environments NEVER use Docker Compose for deployment.

## Deployment Flow

### Code to Staging (Automatic)

```
Developer pushes to main
        ↓
CI pipeline runs (ci.yml)
  ├── web-lint
  ├── web-build
  ├── web-test
  ├── api-lint
  └── api-test
        ↓ (all pass)
Deploy pipeline triggers (deploy.yml)
  ├── Build API Docker image → ACR (tag: git SHA)
  ├── Deploy API → Container Apps (staging)
  │     └── Wait for healthy revision
  │     └── Verify /health endpoint
  └── Build & deploy frontend → Static Web Apps (staging)
        ↓
Staging is live with latest main
```

### Staging to Production (Manual Promotion)

> **Note**: The `promote.yml` workflow described below is created in Phase C. See the [Implementation Checklist](#implementation-checklist) for phase status.

```
Verify staging is healthy
        ↓
Trigger promote.yml (manual dispatch)
  Input: image tag (git SHA from staging)
        ↓
GitHub Environment protection check
  └── Required reviewer approves
        ↓
Deploy same image → Container Apps (production)
  └── Wait for healthy revision
  └── Verify /health endpoint
Deploy frontend → Static Web Apps (production)
        ↓
Production is live with promoted image
```

**Key principle**: Production uses the **exact same Docker image** that was validated in staging. No rebuild. This eliminates "works in staging but not in production" failures.

## Infrastructure Layout

### Terraform Structure

> **Note**: The shared module and environment wrappers below are the target layout created in Phase B. See the [Implementation Checklist](#implementation-checklist) for phase status.

```
infra/terraform/
├── modules/
│   └── cloudblocks-stack/          # Shared module — all Azure resources
│       ├── main.tf                 # Resource definitions
│       ├── variables.tf            # Parameterized inputs
│       └── outputs.tf              # Exported values
└── environments/
    ├── staging/                    # Thin wrapper → calls shared module
    │   ├── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
    │   ├── providers.tf            # Azure provider + backend config
    │   ├── variables.tf            # Environment-specific variable overrides
    │   ├── outputs.tf              # Re-export module outputs
    │   └── terraform.tfvars        # Staging-specific values (git-ignored)
    └── production/                 # Same structure as staging
        ├── main.tf
        ├── providers.tf
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tfvars
```

Each environment directory is a thin wrapper that calls the shared module with environment-specific variables. This prevents configuration drift.

### Azure Resources per Environment

| Resource | Staging | Production |
|----------|---------|------------|
| Resource Group | `rg-cloudblocks-staging` | `rg-cloudblocks-production` |
| Log Analytics | `law-cloudblocks-staging` | `law-cloudblocks-production` |
| Container App Env | `cae-cloudblocks-staging` | `cae-cloudblocks-production` |
| Container Registry | Shared: `cloudblocksacr` | Shared: `cloudblocksacr` |
| PostgreSQL Server | `psql-cloudblocks-staging` | `psql-cloudblocks-production` |
| Redis Cache | `redis-cloudblocks-staging` | `redis-cloudblocks-production` |
| Container App (API) | `ca-cloudblocks-api-staging` | `ca-cloudblocks-api-production` |
| Static Web App | `swa-cloudblocks-staging` | `swa-cloudblocks-production` |

**Container Registry is shared** — both environments pull from the same ACR. Images are promoted by tag, not duplicated.

## Scaling

| Parameter | Staging | Production |
|-----------|---------|------------|
| Min replicas | 1 | 1 |
| Max replicas | 2 | 3 |
| CPU per replica | 0.5 cores | 0.5 cores |
| Memory per replica | 1 Gi | 1 Gi |
| Scale trigger | 50 concurrent requests | 50 concurrent requests |

Production can scale higher and uses more resilient database/cache SKUs. Staging is intentionally constrained to minimize cost.

## Data Isolation

| Concern | Staging | Production |
|---------|---------|------------|
| Database | Separate PostgreSQL server | Separate PostgreSQL server |
| Cache | Separate Redis instance | Separate Redis instance |
| User sessions | Isolated | Isolated |
| GitHub OAuth App | Separate app (staging callback URL) | Separate app (production callback URL) |
| Container images | Shared ACR | Shared ACR |

**No data flows between environments.** Each has its own database, cache, and OAuth configuration. The only shared resource is the container registry (read-only for deployments).

## Secret Management

### GitHub Repository Secrets (shared)

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure AD service principal client ID (OIDC) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

### GitHub Environment Secrets

| Secret | Staging Value | Production Value |
|--------|--------------|-----------------|
| `ACR_NAME` | `cloudblocksacr` | `cloudblocksacr` (shared) |
| `ACR_LOGIN_SERVER` | `cloudblocksacr.azurecr.io` | `cloudblocksacr.azurecr.io` (shared) |
| `AZURE_RESOURCE_GROUP` | `rg-cloudblocks-staging` | `rg-cloudblocks-production` |
| `CONTAINER_APP_NAME` | `ca-cloudblocks-api-staging` | `ca-cloudblocks-api-production` |
| `AZURE_SWA_TOKEN` | Staging SWA deployment token | Production SWA deployment token |

### Application Secrets (set in Terraform, stored in Container App secrets)

| Secret | Source |
|--------|--------|
| `CLOUDBLOCKS_JWT_SECRET` | `var.jwt_secret` (min 32 chars) |
| `CLOUDBLOCKS_TOKEN_ENCRYPTION_SALT` | `var.session_secret` (min 16 chars) |
| `CLOUDBLOCKS_GITHUB_CLIENT_ID` | `var.github_client_id` |
| `CLOUDBLOCKS_GITHUB_CLIENT_SECRET` | `var.github_client_secret` |
| `CLOUDBLOCKS_DATABASE_URL` | Auto-generated from PostgreSQL outputs |
| `CLOUDBLOCKS_REDIS_URL` | Auto-generated from Redis outputs |

## Cost Breakdown

### Staging (~$39/month)

| Service | SKU | Est. Cost |
|---------|-----|-----------|
| Static Web Apps | Free | $0/mo |
| Container Apps (Consumption) | 1–2 replicas | ~$5/mo |
| Azure PostgreSQL | B_Standard_B1ms | ~$13/mo |
| Azure Cache for Redis | Basic C0 | ~$16/mo |
| Container Registry (shared) | Basic | ~$5/mo |

### Production (~$150/month)

| Service | SKU | Est. Cost |
|---------|-----|-----------|
| Static Web Apps | Standard | ~$9/mo |
| Container Apps (Consumption) | 1–3 replicas | ~$10/mo |
| Azure PostgreSQL | GP_Standard_D2s_v3 | ~$100/mo |
| Azure Cache for Redis | Standard C1 | ~$26/mo |
| Container Registry (shared) | — | $0 (shared with staging) |

### Total: ~$189/month

## Health Checks

Both staging and production use the same health probe configuration:

| Probe | Path | Interval | Purpose |
|-------|------|----------|---------|
| Startup | `/health` | 5s | Wait for app to start (up to 50s) |
| Liveness | `/health` | 30s | Restart unhealthy containers |
| Readiness | `/health/ready` | 15s | Remove from load balancer if DB unavailable |

The deploy pipeline verifies health after every deployment:
1. Wait for revision to become active and healthy (up to 5 min)
2. Curl `/health` endpoint and verify HTTP 200

## Monitoring

| Tool | Staging | Production |
|------|---------|------------|
| Azure Log Analytics | Container logs, request metrics | Container logs, request metrics |
| Health endpoint | `/health`, `/health/ready` | `/health`, `/health/ready` |
| Uptime monitoring | Optional (UptimeRobot free) | Recommended (UptimeRobot or Better Uptime) |
| Error tracking | Optional (Sentry free: 5K events/mo) | Recommended (Sentry) |
| Alerts | None | Azure Monitor alerts on 5xx rate, high latency |

## Implementation Checklist

- [ ] **Phase A**: Documentation — ADR-0007 + this guide
- [ ] **Phase B**: Terraform — extract shared module, create staging + production configs
- [ ] **Phase C**: CI/CD — update `deploy.yml` for staging, create `promote.yml` for production
- [ ] **Phase D**: Azure setup — create service principal, configure OIDC, register GitHub Secrets
- [ ] **Phase E**: Staging deploy — `terraform apply` staging, verify auto-deploy pipeline
- [ ] **Phase F**: Production deploy — `terraform apply` production, test manual promotion flow
- [ ] **Phase G**: Monitoring — configure uptime checks, error tracking, alerts
