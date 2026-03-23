# CloudBlocks — Deployment Guide

## Overview

CloudBlocks is designed for **lightweight deployment** with minimal infrastructure. The frontend is a static SPA, and the backend is a thin orchestration layer. Production deployments use PostgreSQL for metadata and Redis for session caching, enabling horizontal scaling with multiple container replicas.

For the canonical multi-environment cloud strategy (local/staging/production, promotion model, and cost targets), see [ENVIRONMENT_STRATEGY.md](ENVIRONMENT_STRATEGY.md).

## Terminology

CloudBlocks uses four distinct terms for its deployment lifecycle. Every document, workflow, and UI label must use these definitions consistently.

| Term          | Definition                                                                                                                                          | Example                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Deploy**    | Push code or infrastructure to a specific environment. Triggered by a CI/CD pipeline.                                                               | "Deploy to staging" — `deploy.yml` runs on push to `main`.           |
| **Promote**   | Move a tested version from `staging` to `production`. A controlled, deliberate action with pre-checks (tests passed, cost reviewed, diff approved). | "Promote to production" — `promote.yml` runs after manual approval.  |
| **Rollback**  | Revert an environment to a previous known-good version. Used for emergency or planned recovery.                                                     | "Rollback production to v0.17.0" — restores the last stable release. |
| **Release**   | Tag a version as a user-facing milestone. A labeling action, not a deployment action. Releases are created after a milestone closes.                | "Release v0.18.0" — git tag + GitHub Release.                        |
| **Pipeline**  | An automated CI/CD workflow (GitHub Actions).                                                                                                       | "The CI pipeline passed."                                            |
| **Revision**  | A specific deployed instance of the application (Azure Container Apps concept).                                                                     | "New revision is active."                                            |
| **Image Tag** | The unique identifier for a container image (git SHA).                                                                                              | "Promote image tag abc123..."                                        |

### Usage Guidelines

- **Deploy ≠ Release.** A deploy pushes code to an environment; a release tags a version for users. They happen at different times.
- **Promote ≠ Deploy.** A promotion is a specific kind of deployment that moves a validated staging build to production. Use "promote" when the source is staging and the target is production.
- **Rollback ≠ Redeploy.** A rollback reverts to a previous version. A redeploy pushes the same version again. Use "rollback" only when reverting.
- **Workflow naming convention**: `deploy.yml` (staging), `promote.yml` (staging → production). Never name a promote workflow "deploy-production."

## Local Development

### Prerequisites

- Node.js >= 20
- Python >= 3.10
- pnpm >= 9
- Docker & Docker Compose (optional, for backend services)

### Quick Start

```bash
# Clone and install
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
make install

# Start frontend dev server (no backend needed for Milestone 1)
cd apps/web && pnpm dev

# Or use Makefile
make dev
```

### Development URLs

| Service                    | URL                        |
| -------------------------- | -------------------------- |
| Frontend                   | http://localhost:5173      |
| Backend API (Milestone 5+) | http://localhost:8000      |
| API Docs (Swagger)         | http://localhost:8000/docs |

## Architecture

### Single-Replica (Development / Staging)

```
Static Frontend (SPA)
     ↓
Backend API (Single Container)
     ↓
┌─────────────┬──────────────┐
│ PostgreSQL  │ GitHub API   │
│ (metadata)  │ (data store) │
├─────────────┤              │
│ Redis       │              │
│ (sessions)  │              │
└─────────────┴──────────────┘
```

### Multi-Replica (Production)

```
Azure Static Web App (SPA)
     ↓ (HTTPS)
Azure Container Apps
┌─────────┬─────────┬─────────┐
│Replica 1│Replica 2│Replica N│  ← HTTP auto-scaling
└────┬────┴────┬────┴────┬────┘
     │         │         │
     ├─────────┼─────────┤
     ↓         ↓         ↓
┌──────────────────────────────┐
│  Azure Database for PostgreSQL│  ← Shared metadata
│  (Flexible Server)           │
├──────────────────────────────┤
│  Azure Cache for Redis        │  ← Shared sessions
│  (Basic C0)                  │
└──────────────────────────────┘
```

**Multi-replica prerequisites** (all met since Phase 8):

- ✅ All persistent data in PostgreSQL (not SQLite)
- ✅ Sessions in Redis (not SQLite)
- ✅ OAuth state is stateless (cookie-based)
- ✅ No in-memory state in application code

## Deployment Options

### Option 1: Frontend Only (Milestone 1)

Deploy the frontend as a static site. No backend needed.

```bash
# Build
cd apps/web && pnpm build

# Output in apps/web/dist/
# Deploy to any static host:
# - Vercel
# - Netlify
# - GitHub Pages
# - Cloudflare Pages
# - S3 + CloudFront
```

### Option 2: Full Stack with Docker Compose (Local)

#### Docker Compose (Full Stack)

The `docker-compose.yml` starts all services: PostgreSQL, Redis, API, and Web frontend.

```bash
# Copy and fill in environment variables
cp .env.example .env

# Start all services
docker compose up -d

# Check service health
docker compose ps
```

#### docker-compose.yml Services

| Service    | Image / Build                 | Purpose                                  |
| ---------- | ----------------------------- | ---------------------------------------- |
| `postgres` | `postgres:16-alpine`          | Relational metadata store                |
| `redis`    | `redis:7-alpine`              | Session cache & revocation (sliding TTL) |
| `api`      | `infra/docker/api.Dockerfile` | FastAPI backend                          |
| `web`      | `infra/docker/web.Dockerfile` | Nginx-served SPA frontend                |

#### Development with Hot-Reload

Use the dev override to mount the API source and enable `--reload`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This mounts `apps/api/` into the container so code changes restart the server automatically.

> **Tip**: Set `COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml` in your shell to avoid typing the `-f` flags every time.

### Option 3: Azure Container Apps (Cloud)

> **Cloud deployment note**: `infra/terraform/environments/dev/` is the current implementation baseline. The planned direction is staged environments (`staging` -> `production`) documented in [ENVIRONMENT_STRATEGY.md](ENVIRONMENT_STRATEGY.md). Use this section for current dev-stack provisioning details until the multi-environment Terraform wrappers land.

#### Managed Azure Stack

| Component          | Azure Service                 | SKU / Tier       | Est. Cost |
| ------------------ | ----------------------------- | ---------------- | --------- |
| Frontend           | Azure Static Web Apps         | Free             | $0/mo     |
| Backend API        | Azure Container Apps          | Consumption      | ~$5/mo    |
| Metadata DB        | Azure Database for PostgreSQL | B_Standard_B1ms  | ~$13/mo   |
| Session Cache      | Azure Cache for Redis         | Basic C0 (250MB) | ~$16/mo   |
| Container Registry | Azure Container Registry      | Basic            | ~$5/mo    |
| Data Store         | GitHub (user repos)           | —                | Free      |

**Total estimated cost: ~$39/month** (dev environment)

#### Terraform Provisioning

All Azure infrastructure is defined in `infra/terraform/environments/dev/`.

```bash
cd infra/terraform/environments/dev

# Copy and fill in variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize
terraform init

# Plan (review changes)
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"
```

#### Resources Provisioned by Terraform

| Resource                   | Name Pattern               | Purpose                  |
| -------------------------- | -------------------------- | ------------------------ |
| Resource Group             | `rg-cloudblocks-{env}`     | Logical grouping         |
| Log Analytics              | `law-cloudblocks-{env}`    | Container logs & metrics |
| Container App Environment  | `cae-cloudblocks-{env}`    | Container Apps hosting   |
| Container Registry         | `cloudblocks{env}acr`      | Docker image storage     |
| PostgreSQL Flexible Server | `psql-cloudblocks-{env}`   | Metadata database        |
| Azure Cache for Redis      | `redis-cloudblocks-{env}`  | Session cache            |
| Container App (API)        | `ca-cloudblocks-api-{env}` | Backend API              |
| Static Web App             | `swa-cloudblocks-{env}`    | Frontend SPA             |

#### Scaling Configuration

The Container App scales horizontally based on HTTP concurrent requests:

| Parameter                     | Default | Description                          |
| ----------------------------- | ------- | ------------------------------------ |
| `container_min_replicas`      | 1       | Minimum replicas (0 = scale to zero) |
| `container_max_replicas`      | 3       | Maximum replicas                     |
| `scaling_concurrent_requests` | 50      | Requests/replica before scaling out  |
| `container_cpu`               | 0.5     | CPU cores per replica                |
| `container_memory`            | 1Gi     | Memory per replica                   |

To adjust scaling, update `terraform.tfvars`:

```hcl
container_min_replicas      = 1
container_max_replicas      = 5
scaling_concurrent_requests = "100"
```

#### Health Probes

The Container App configures three probe types:

| Probe     | Path            | Interval | Purpose                                     |
| --------- | --------------- | -------- | ------------------------------------------- |
| Startup   | `/health`       | 5s       | Wait for app to start (up to 50s)           |
| Liveness  | `/health`       | 30s      | Restart unhealthy containers                |
| Readiness | `/health/ready` | 15s      | Remove from load balancer if DB unavailable |

## CI/CD Pipeline

### GitHub Actions

The deploy workflow (`.github/workflows/deploy.yml`) runs on manual dispatch (or push to main when configured):

**Required GitHub Secrets:**

| Secret                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `AZURE_CLIENT_ID`       | Azure AD service principal client ID (OIDC) |
| `AZURE_TENANT_ID`       | Azure AD tenant ID                          |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID                       |
| `ACR_NAME`              | Container Registry name                     |
| `ACR_LOGIN_SERVER`      | Container Registry login server URL         |
| `AZURE_RESOURCE_GROUP`  | Target resource group name                  |
| `CONTAINER_APP_NAME`    | Container App name (from Terraform output)  |
| `AZURE_SWA_TOKEN`       | Static Web Apps deployment token            |

**Pipeline jobs:**

1. **build-api** — Builds Docker image via `az acr build` and pushes to ACR (tagged with git SHA + `latest`)
2. **deploy-api** — Updates Container App with new image, waits for healthy revision, verifies `/health` endpoint
3. **deploy-web** — Builds frontend SPA and deploys to Azure Static Web Apps

To enable automatic deployment on push to main, uncomment the `push` trigger in `.github/workflows/deploy.yml`.

## Environment Variables

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000
VITE_GITHUB_APP_CLIENT_ID=your_github_app_client_id
```

### Backend (.env)

All backend variables use the `CLOUDBLOCKS_` prefix. See `.env.example` for a complete template.

```bash
# Application
CLOUDBLOCKS_APP_ENV=development
CLOUDBLOCKS_APP_PORT=8000
CLOUDBLOCKS_APP_DEBUG=true

# Database (SQLite or PostgreSQL)
CLOUDBLOCKS_DATABASE_URL=sqlite+aiosqlite:///cloudblocks.db
# CLOUDBLOCKS_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/cloudblocks

# Session backend (sqlite | redis)
CLOUDBLOCKS_SESSION_BACKEND=sqlite
CLOUDBLOCKS_REDIS_URL=redis://localhost:6379/0

# GitHub OAuth
CLOUDBLOCKS_GITHUB_CLIENT_ID=your_github_client_id
CLOUDBLOCKS_GITHUB_CLIENT_SECRET=your_github_client_secret
CLOUDBLOCKS_GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback

# Session encryption (Fernet key derivation)
CLOUDBLOCKS_JWT_SECRET=your-32-plus-char-random-string

# CORS
CLOUDBLOCKS_CORS_ORIGINS=["http://localhost:5173"]
```

> **Important**: Session auth uses httpOnly cookies (`cb_oauth`, `cb_session`) and server-side sessions. Frontend API calls must use `credentials: 'include'`.

### Production Secrets (set via secret manager)

| Secret                              | Description                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLOUDBLOCKS_JWT_SECRET`            | Strong random string (≥32 chars) for session encryption key derivation (Fernet)                                                                  |
| `CLOUDBLOCKS_TOKEN_ENCRYPTION_SALT` | Strong random string (≥16 chars) for PBKDF2 key derivation (with `JWT_SECRET`) to encrypt OAuth state cookies and stored OAuth tokens via Fernet |
| `CLOUDBLOCKS_GITHUB_CLIENT_SECRET`  | GitHub App OAuth secret                                                                                                                          |
| `CLOUDBLOCKS_GITHUB_CLIENT_ID`      | GitHub OAuth client ID                                                                                                                           |
| `CLOUDBLOCKS_CORS_ORIGINS`          | JSON array of allowed browser origins                                                                                                            |

## Health Checks

| Endpoint            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `GET /health`       | Basic health check (liveness)                    |
| `GET /health/ready` | Readiness check (verifies database connectivity) |

## Monitoring

Application logs are written to stdout/stderr in JSON format and collected by:

- **Azure Container Apps**: Log Analytics workspace (auto-configured by Terraform)
- **Docker Compose**: Container logging driver

Recommended monitoring:

- **Uptime**: Better Uptime / UptimeRobot (free tier)
- **Errors**: Sentry (free tier: 5K events/month)
- **Metrics**: Azure Monitor metrics + Log Analytics queries
- **Scaling**: Azure Portal → Container App → Metrics → Replica Count

### Phase 8 Infrastructure (Complete)

- ✅ PostgreSQL for production-scale relational metadata (`CLOUDBLOCKS_DATABASE_URL`)
- ✅ Redis for session caching with sliding TTL and logout-all support (`CLOUDBLOCKS_SESSION_BACKEND=redis`)
- ✅ Docker Compose stack with healthchecks and dev hot-reload
- ✅ Azure Container Apps multi-replica deployment with auto-scaling
- ✅ Azure Cache for Redis (Basic C0) for shared session state
- ✅ CI/CD pipeline with image build, deploy, and health verification
- ✅ Health probes (startup, liveness, readiness) for container orchestration
