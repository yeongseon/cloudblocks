# CloudBlocks API

Thin orchestration backend for the CloudBlocks Platform, built with Python FastAPI following Clean Architecture.

## Quick Start

```bash
# Install dependencies
pip install -e ".[dev]"

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Run linter
ruff check .
```

## Architecture

The backend is a **thin orchestration layer** — it mediates between the UI, GitHub, and the code generation engine. It does NOT store architecture specs or generated code (those live in GitHub repos).

```
app/
├── main.py                  # FastAPI application entry point
├── core/                    # Configuration and shared utilities
├── api/routes/              # HTTP route handlers
├── domain/models/           # Domain entities and repository interfaces
├── application/use_cases/   # Business logic use cases
├── infrastructure/          # External service implementations
│   ├── db/                  # Minimal metadata store (SQLite / Supabase)
│   ├── cache/               # Redis cache
│   ├── queue/               # Job queue
│   ├── storage/             # Object storage (S3)
│   └── providers/           # Cloud provider integrations
├── engines/                 # Rule validation engine
└── tests/                   # Unit and integration tests
```

## What the Backend Does

- **Auth / Identity** — GitHub App OAuth, Google OAuth
- **Generator Orchestrator** — Validate → Transform → Generate IaC code
- **GitHub Integration** — Commit, branch, PR creation
- **Job Runner** — Async generation and validation tasks
- **Minimal Metadata DB** — User, workspace index, run status, audit

## What the Backend Does NOT Store

- Architecture specs (→ GitHub repo)
- Generated Terraform/Bicep/Pulumi (→ GitHub repo)
- Templates (→ GitHub repo)
- Full logs (→ GitHub repo or blob storage)
