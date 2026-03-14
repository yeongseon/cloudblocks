# CloudBlocks API

Backend API for the CloudBlocks Platform, built with Python FastAPI following Clean Architecture.

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

```
app/
├── main.py                  # FastAPI application entry point
├── core/                    # Configuration and shared utilities
├── api/routes/              # HTTP route handlers
├── domain/models/           # Domain entities and repository interfaces
├── application/use_cases/   # Business logic use cases
├── infrastructure/          # External service implementations
│   ├── db/                  # CUBRID database (custom ORM)
│   ├── cache/               # Redis cache
│   ├── queue/               # Job queue
│   ├── storage/             # Object storage (S3)
│   └── providers/           # Cloud provider integrations
├── engines/                 # Rule validation engine
└── tests/                   # Unit and integration tests
```
