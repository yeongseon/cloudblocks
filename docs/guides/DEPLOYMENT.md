# CloudBlocks — Deployment Guide

## Overview

CloudBlocks is designed for **lightweight deployment** with minimal infrastructure. The frontend is a static SPA, and the backend is a thin orchestration layer with SQLite-backed metadata and session storage.

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

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API (Milestone 5+) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## Architecture

```
Static Frontend (SPA)
     ↓
Backend API (Thin Orchestration Layer)
     ↓
┌─────────────┬──────────────┐
│ SQLite      │ GitHub API   │
│ (metadata + │ (data store) │
│ sessions)   │              │
└─────────────┴──────────────┘
```

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

### Option 2: Full Stack (Milestone 5+)

#### Docker Deployment

```bash
# Build frontend
docker build -t cloudblocks-web -f infra/docker/web.Dockerfile .

# Build backend
docker build -t cloudblocks-api -f infra/docker/api.Dockerfile .

# Start local supporting services (optional)
docker compose up -d
```

> **Note**: The backend deployment model is Docker-first (see `infra/docker/api.Dockerfile`) and is deployed to Azure container infrastructure for production environments. The current `docker-compose.yml` does **not** include `web` or `api` service definitions — those are built separately via Dockerfiles listed above.

#### docker-compose.yml Services (Current)

| Service | Purpose |
|---------|---------|
| *(none required for auth/session flow)* | Current session auth uses SQLite + cookies only |

> **Phase 8 (planned)**: PostgreSQL + Redis will be introduced for production-scale metadata and cache/queue workloads.

### Option 3: Cloud Deployment

#### Recommended Stack

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel / Cloudflare Pages | Free |
| Backend API | Azure Container Apps / Azure App Service | ~$5/mo |
| Metadata + Session DB | SQLite (backend volume) | Free |
| Cache/Queue (Phase 8) | Redis | Planned |
| Data Store | GitHub (user repos) | Free |

**Total initial cost: $0 – $5/month**

#### Vercel + Azure Container Apps + SQLite (Recommended)

```
Frontend (Vercel)
     ↓
Backend API (Azure Container Apps)
     ↓
┌──────────────┬──────────────┐
│ SQLite       │ GitHub API   │
│ (session +   │              │
│ metadata DB) │              │
└──────────────┴──────────────┘
```

1. Deploy frontend to Vercel (auto-deploy from GitHub)
2. Deploy backend container to Azure (Container Apps or App Service)
3. Mount persistent volume for SQLite database
4. Configure GitHub OAuth app credentials
5. Configure CORS allowed origins for frontend domains

#### Terraform Deployment (Self-Hosted)

```bash
cd infra/terraform/environments/production

# Initialize
terraform init

# Plan
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"
```

## Environment Variables

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000
VITE_GITHUB_APP_CLIENT_ID=your_github_app_client_id
```

### Backend (.env)

```bash
# Application
APP_ENV=development
APP_PORT=8000
APP_DEBUG=true

# Session auth
SESSION_SECRET_KEY=your-32-plus-char-random-string
SESSION_EXPIRY_HOURS=24

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback

# CORS
ALLOWED_ORIGINS=http://localhost:5173
```

> **Important**: Current session auth uses httpOnly cookies (`cb_oauth`, `cb_session`) and server-side SQLite sessions. Frontend API calls must use `credentials: 'include'`.

### Production Secrets (set via secret manager)

| Secret | Description |
|--------|-------------|
| `SESSION_SECRET_KEY` | Strong random string for session signing/encryption |
| `SESSION_EXPIRY_HOURS` | Session TTL in hours |
| `GITHUB_CLIENT_SECRET` | GitHub App OAuth secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_REDIRECT_URI` | OAuth callback URL |
| `ALLOWED_ORIGINS` | Allowed browser origins for credentialed CORS |

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm -r build
      - run: pnpm -r test

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service api
```

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /health/ready` | Readiness (SQLite + GitHub API) |

## Monitoring

Application logs are written to stdout/stderr and collected by the container platform's logging driver.

Recommended monitoring:
- **Uptime**: Better Uptime / UptimeRobot (free tier)
- **Errors**: Sentry (free tier: 5K events/month)
- **Metrics**: Container platform metrics + application logs

### Phase 8 Infrastructure (Planned)

- PostgreSQL for production-scale relational metadata
- Redis for distributed cache, rate limiting, and queue primitives
