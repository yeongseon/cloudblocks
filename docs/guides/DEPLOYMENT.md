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

| Service | Image / Build | Purpose |
|---------|--------------|---------|
| `postgres` | `postgres:16-alpine` | Relational metadata store |
| `redis` | `redis:7-alpine` | Session cache & revocation (sliding TTL) |
| `api` | `infra/docker/api.Dockerfile` | FastAPI backend |
| `web` | `infra/docker/web.Dockerfile` | Nginx-served SPA frontend |

#### Development with Hot-Reload

Use the dev override to mount the API source and enable `--reload`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This mounts `apps/api/` into the container so code changes restart the server automatically.

> **Tip**: Set `COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml` in your shell to avoid typing the `-f` flags every time.

### Option 3: Cloud Deployment

#### Recommended Stack

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel / Cloudflare Pages | Free |
| Backend API | Azure Container Apps / Azure App Service | ~$5/mo |
| Metadata DB | PostgreSQL (managed or container) | ~$5/mo |
| Session Cache | Redis (managed or container) | ~$5/mo |
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

# JWT
CLOUDBLOCKS_JWT_SECRET=your-32-plus-char-random-string

# CORS
CLOUDBLOCKS_CORS_ORIGINS=["http://localhost:5173"]
```

> **Important**: Session auth uses httpOnly cookies (`cb_oauth`, `cb_session`) and server-side sessions. Frontend API calls must use `credentials: 'include'`.

### Production Secrets (set via secret manager)

| Secret | Description |
|--------|-------------|
| `CLOUDBLOCKS_JWT_SECRET` | Strong random string (≥32 chars) for JWT signing |
| `CLOUDBLOCKS_TOKEN_ENCRYPTION_SALT` | Strong random string (≥16 chars) for token encryption |
| `CLOUDBLOCKS_GITHUB_CLIENT_SECRET` | GitHub App OAuth secret |
| `CLOUDBLOCKS_GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `CLOUDBLOCKS_CORS_ORIGINS` | JSON array of allowed browser origins |

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

### Phase 8 Infrastructure

- PostgreSQL for production-scale relational metadata (implemented via `CLOUDBLOCKS_DATABASE_URL`)
- Redis for session caching with sliding TTL and logout-all support (implemented via `CLOUDBLOCKS_SESSION_BACKEND=redis`)
- Docker Compose stack with healthchecks and dev hot-reload
