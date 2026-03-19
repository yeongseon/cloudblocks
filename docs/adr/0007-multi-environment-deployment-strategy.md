# ADR-0007: Multi-Environment Deployment Strategy

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks has production-ready infrastructure code (Docker, Terraform, GitHub Actions CI/CD) but has never been deployed to a live environment. As we prepare for actual deployment, we need a clear strategy for managing multiple environments with consistent naming, security policies, and promotion workflows.

### Current State

The codebase has partial multi-environment support scattered across layers:

| Layer | Current Behavior | Gap |
|-------|-----------------|-----|
| Docker Compose | Sets `CLOUDBLOCKS_APP_ENV: development` for local dev | Development only — local environment |
| Terraform | `infra/terraform/environments/` has `dev/`, `staging/`, `production/` directories | Only `dev/` has configuration; `staging/` and `production/` are empty |
| Backend | `CLOUDBLOCKS_APP_ENV` controls secret strength validation (`development` = relaxed, others = strict) | No documentation of expected values or their implications |
| Terraform → App mapping | `var.environment == "production" ? "production" : "staging"` | All non-production mapped to `"staging"` — undocumented |
| GitHub Actions | Single `deploy.yml` with secrets-based targeting | No `environment:` contexts, no protection rules, no multi-env support |

### Problems

1. **No environment strategy document** — decisions about environment count, purpose, data isolation, and promotion are not recorded.
2. **Naming inconsistency** — Docker Compose uses `"development"`, Terraform variable defaults to `"dev"`, backend expects `"development"` | `"staging"` | `"production"`.
3. **No promotion workflow** — no defined process for moving code from staging to production.
4. **No Terraform module reuse** — `modules/` is empty; adding staging/production means duplicating `dev/main.tf`.
5. **Single CI/CD pipeline** — deploy workflow has no environment parameter; can only target one environment at a time via secrets.

## Decision

### 1. Two-Cloud-Environment Model

Adopt two cloud environments. Local development uses Docker Compose exclusively and is NOT a cloud deployment target.

| Environment | Type | Purpose | Trigger | Approval |
|-------------|------|---------|---------|----------|
| **local** | Docker Compose | Development, debugging, feature work | `docker compose up` | None |
| **staging** | Azure (cloud) | Pre-production validation, integration testing, UAT | Push to `main` (after CI passes) | None (auto-deploy) |
| **production** | Azure (cloud) | Live service | Manual promotion from staging | Required (GitHub Environment protection) |

**Key distinction**: Local development is NOT a Terraform environment. It uses Docker Compose with `docker-compose.yml` + `docker-compose.dev.yml`. Only staging and production are provisioned in Azure via Terraform.

### 2. Standardized Environment Names

Use these exact strings across ALL layers:

| Context | `CLOUDBLOCKS_APP_ENV` | Terraform `var.environment` | Resource suffix |
|---|---|---|---|
| Local dev (Docker Compose) | `development` | N/A | N/A |
| Staging (Azure) | `staging` | `staging` | `-staging` |
| Production (Azure) | `production` | `production` | `-prod` |

The Terraform → app env mapping becomes a direct pass-through (no translation needed):

```hcl
env {
  name  = "CLOUDBLOCKS_APP_ENV"
  value = var.environment  # "staging" or "production"
}
```

### 3. Promotion Strategy: Image Tag Promotion

Use **image tag promotion** (not rebuild) for staging → production:

```
Push to main → CI passes → Build image (sha tag) → Deploy to staging
                                                        ↓
                                            Manual approval (GitHub)
                                                        ↓
                                              Same image → production
```

This ensures the exact binary tested in staging runs in production. No rebuild, no "works on my machine" risk.

### 4. CI/CD Pipeline Design

```
ci.yml (push/PR to main)
  ├── web-lint
  ├── web-build (matrix: Node 20, 22)
  ├── web-test
  ├── api-lint
  └── api-test

deploy.yml (push to main, after CI)
  ├── build-api → ACR (tagged: git SHA + latest)
  ├── deploy-staging → Azure Container Apps (staging env)
  │     └── health check verification
  └── deploy-web-staging → Azure Static Web Apps (staging)

promote.yml (manual dispatch, input: image tag)
  ├── deploy-production → Azure Container Apps (same image)
  │     └── health check verification
  └── deploy-web-production → Azure Static Web Apps (production)
```

### 5. Terraform Structure

Remove `dev/` from Terraform environments (local dev uses Docker Compose, not Terraform). Extract shared infrastructure into a reusable module:

```
infra/terraform/
├── modules/
│   └── cloudblocks-stack/          # Shared module (all Azure resources)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    ├── staging/                    # var.environment = "staging"
    │   ├── main.tf                 # module "stack" { source = "../../modules/cloudblocks-stack" }
    │   ├── providers.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── terraform.tfvars
    └── production/                 # var.environment = "production"
        ├── main.tf
        ├── providers.tf
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tfvars
```

The existing `dev/` directory content becomes the basis for the shared module. Environment directories become thin wrappers that call the module with environment-specific variables.

### 6. Environment-Specific Configuration

| Parameter | Local (Docker Compose) | Staging (Azure) | Production (Azure) |
|-----------|----------------------|-----------------|-------------------|
| Infrastructure | Docker Compose | Container Apps | Container Apps |
| Database | PostgreSQL 16 (container) | Azure PostgreSQL B_Standard_B1ms | Azure PostgreSQL GP_Standard_D2s_v3 |
| Cache | Redis 7 (container) | Azure Cache for Redis Basic C0 | Azure Cache for Redis Standard C1 |
| Frontend | Vite dev server (HMR) | Azure Static Web Apps (Free) | Azure Static Web Apps (Standard) |
| Container replicas | 1 (fixed) | 1–2 | 1–3 |
| Debug mode | true | false | false |
| Secret strength | Relaxed | Strict | Strict |
| Geo-redundant backup | N/A | No | Yes |
| SSL | Optional | Required | Required |
| Estimated cost | $0 | ~$39/mo | ~$150/mo |

### 7. GitHub Environments & Secrets

Use GitHub Environments for deployment protection:

| GitHub Environment | Protection Rules | Secrets Scope |
|---|---|---|
| `staging` | None (auto-deploy on push to main) | Environment-specific Azure resource names |
| `production` | Required reviewer (1+), wait timer (optional) | Environment-specific Azure resource names |

Shared secrets (repository level, same Azure subscription):
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

Environment-specific secrets:
- `ACR_NAME`, `ACR_LOGIN_SERVER`
- `AZURE_RESOURCE_GROUP`, `CONTAINER_APP_NAME`
- `AZURE_SWA_TOKEN`

### 8. Data Isolation

| Concern | Staging | Production |
|---------|---------|------------|
| Azure Resource Group | `rg-cloudblocks-staging` | `rg-cloudblocks-prod` |
| PostgreSQL Server | `psql-cloudblocks-staging` | `psql-cloudblocks-prod` |
| Redis Cache | `redis-cloudblocks-staging` | `redis-cloudblocks-prod` |
| Container Registry | Shared ACR (same images) | Shared ACR (same images) |
| GitHub OAuth App | Separate OAuth app | Separate OAuth app |
| User data | Isolated (separate DB) | Isolated (separate DB) |

Staging and production share a single ACR (container registry) since images are promoted by tag, but all runtime data (database, cache, sessions) is fully isolated.

## Consequences

### Positive

- **Clean separation** — local dev stays fast and free; cloud environments are staging + production only.
- **Image tag promotion** — production runs the exact binary tested in staging.
- **Terraform DRY** — shared module prevents configuration drift between environments.
- **GitHub Environment protection** — production requires explicit approval.
- **Cost-conscious** — no cloud cost for development; staging uses minimal SKUs (~$39/mo).

### Negative

- **Azure cost** — staging ~$39/month + production ~$150/month = ~$189/month total.
- **Secret management** — GitHub Secrets to configure per environment and rotate periodically.
- **Terraform state** — two separate state files to manage (staging + production).

### Risks

- **State drift** — environments can diverge if Terraform modules aren't kept in sync. Mitigated by shared module.
- **Stale staging** — auto-deploy on every push to main may cause temporary instability. Mitigated by CI gate (must pass all tests first).
- **Shared ACR** — if ACR is compromised, both environments are affected. Mitigated by Azure RBAC and OIDC auth (no stored credentials).

## Implementation Plan

1. **Phase A — Documentation** (this ADR + Environment Strategy guide)
2. **Phase B — Terraform modules** — extract shared module from `dev/main.tf`, create staging/production configs
3. **Phase C — CI/CD pipelines** — update deploy.yml for staging auto-deploy, create promote.yml for production
4. **Phase D — Azure provisioning** — terraform apply for staging first, then production (requires Azure subscription access)
5. **Phase E — Verification** — end-to-end deploy test: push to main → staging auto-deploy → manual promote to production
