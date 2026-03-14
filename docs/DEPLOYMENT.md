# CloudBlocks - Deployment Guide

## Overview

This guide covers deploying CloudBlocks to production environments. The platform uses a **containerized architecture** deployable to Azure (primary), AWS, or GCP.

## Local Development

### Prerequisites

- Node.js >= 20
- Python >= 3.10
- pnpm >= 9
- Docker & Docker Compose

### Quick Start

```bash
# Clone and install
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
make install

# Start infrastructure (CUBRID, Redis, MinIO)
make docker-up

# Start development servers
make dev
```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| CUBRID Manager | http://localhost:8001 |
| MinIO Console | http://localhost:9001 |

## Docker Deployment

### Build Images

```bash
# Build frontend
docker build -t cloudblocks-web -f infra/docker/web.Dockerfile .

# Build backend
docker build -t cloudblocks-api -f infra/docker/api.Dockerfile .
```

### Production Compose

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Azure Deployment (v0.5+)

### Architecture

```
Azure Resource Group: rg-cloudblocks
├── Azure Container Apps (Frontend)
├── Azure Container Apps (Backend API)
├── Azure Database for CUBRID (or VM-hosted)
├── Azure Cache for Redis
├── Azure Blob Storage
└── Azure Container Registry
```

### Terraform Deployment

```bash
cd infra/terraform/environments/production

# Initialize
terraform init

# Plan
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"
```

### Required Azure Resources

1. **Resource Group**: `rg-cloudblocks`
2. **Container Registry**: For Docker images
3. **Container Apps Environment**: For frontend + backend
4. **Virtual Machine**: For CUBRID (no managed service available)
5. **Redis Cache**: Standard tier
6. **Storage Account**: Blob storage for assets

## Environment Variables

See `.env.example` for all required environment variables.

### Production Secrets (must be set via secret manager)

- `JWT_SECRET`: Strong random string for JWT signing
- `CUBRID_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password
- `STORAGE_SECRET_KEY`: Object storage secret

## CI/CD Pipeline

### GitHub Actions (planned)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - lint + type-check
    - unit tests
    - integration tests

  build:
    - build Docker images
    - push to container registry

  deploy:
    - terraform apply
    - rolling update containers
```

## Monitoring

### Health Checks

- `GET /health` — Basic health check
- `GET /health/ready` — Readiness (DB + Redis connected)

### Logs

Application logs are written to stdout/stderr and collected by the container platform's logging driver.
