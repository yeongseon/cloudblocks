.PHONY: help install dev build test lint clean docker-up docker-down

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ──────────────────────────────────────────────

install: ## Install all dependencies
	pnpm install
	cd apps/api && pip install -e ".[dev]"

dev: ## Start development servers (frontend + backend)
	@echo "Starting CloudBlocks development environment..."
	$(MAKE) -j2 dev-web dev-api

dev-web: ## Start frontend dev server
	pnpm --filter @cloudblocks/web dev

dev-api: ## Start backend dev server
	cd apps/api && uvicorn app.main:app --reload --port 8000

# ─── Build ────────────────────────────────────────────────────

build: ## Build all packages
	pnpm --filter @cloudblocks/web build

build-web: ## Build frontend only
	pnpm --filter @cloudblocks/web build

# ─── Quality ──────────────────────────────────────────────────

lint: ## Run linters
	pnpm --filter @cloudblocks/web lint
	cd apps/api && ruff check .

test: ## Run all tests
	cd apps/api && pytest

# ─── Infrastructure ──────────────────────────────────────────

docker-up: ## Start local infrastructure (CUBRID, Redis, MinIO)
	docker compose up -d

docker-down: ## Stop local infrastructure
	docker compose down

# ─── Cleanup ─────────────────────────────────────────────────

clean: ## Remove build artifacts and dependencies
	pnpm clean
	find apps/api -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find apps/api -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
