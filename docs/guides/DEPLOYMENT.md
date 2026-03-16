# CloudBlocks — Deployment Guide

## Overview

CloudBlocks is designed for **lightweight deployment** with minimal infrastructure. The frontend is a static SPA, and the backend is a thin orchestration layer — no heavy database servers required.

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
┌─────────────┬──────────────┬──────────────┐
│ Supabase/PG │ Redis/Upstash│ GitHub API   │
│ (metadata)  │ (cache/queue)│ (data store) │
└─────────────┴──────────────┴──────────────┘
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

# Start supporting services (Redis + MinIO)
docker compose up -d
```

> **Note**: The current `docker-compose.yml` provides only supporting services (Redis and MinIO). It does **not** include `web` or `api` service definitions — those are built separately via Dockerfiles listed above. Full-stack Docker Compose orchestration is planned for Milestone 5+.

#### docker-compose.yml Services (Current)

| Service | Purpose |
|---------|---------|
| `redis` | Cache, rate limiting, job queue |
| `minio` | S3-compatible object storage (dev environment) |

> PostgreSQL is provided by Supabase (hosted) or can be added as a Docker service for self-hosting.

### Option 3: Cloud Deployment

#### Recommended Stack

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel / Cloudflare Pages | Free |
| Backend API | Railway / Fly.io / Cloud Run | ~$5/mo |
| Metadata DB | Supabase (free tier) | Free |
| Cache | Upstash Redis (free tier) | Free |
| Data Store | GitHub (user repos) | Free |

**Total initial cost: $0 – $5/month**

#### Vercel + Supabase + Upstash (Recommended)

```
Frontend (Vercel)
     ↓
Backend API (Railway / Fly.io)
     ↓
┌──────────────┬──────────────┬──────────────┐
│ Supabase     │ Upstash      │ GitHub API   │
│ (Postgres)   │ (Redis)      │              │
└──────────────┴──────────────┴──────────────┘
```

1. Deploy frontend to Vercel (auto-deploy from GitHub)
2. Deploy backend to Railway or Fly.io
3. Create Supabase project (free tier: 500MB DB)
4. Create Upstash Redis (free tier: 10K commands/day)
5. Configure GitHub App for OAuth + repo integration

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

# GitHub Integration
GITHUB_APP_ID=your_github_app_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_APP_PRIVATE_KEY=/path/to/private-key.pem

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Object Storage (S3-compatible / MinIO)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=cloudblocks

# JWT
JWT_SECRET=your-strong-random-string
JWT_EXPIRATION=3600

# Metadata DB (Supabase / Postgres)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
# Or direct Postgres (for self-hosting):
# DATABASE_URL=postgresql://user:pass@host:5432/cloudblocks
```

> **Important**: The backend config (`apps/api/app/core/config.py`) uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` — NOT `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET`. Use the correct variable names.

### Production Secrets (set via secret manager)

| Secret | Description |
|--------|-------------|
| `JWT_SECRET` | Strong random string for JWT signing |
| `GITHUB_CLIENT_SECRET` | GitHub App OAuth secret |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (PEM) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

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
| `GET /health/ready` | Readiness (DB + Redis + GitHub API) |

## Monitoring

Application logs are written to stdout/stderr and collected by the container platform's logging driver.

Recommended monitoring:
- **Uptime**: Better Uptime / UptimeRobot (free tier)
- **Errors**: Sentry (free tier: 5K events/month)
- **Metrics**: Supabase dashboard (built-in)
