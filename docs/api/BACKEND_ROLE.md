# Backend Role & Responsibilities

> **Status**: Audit completed for Milestone 17 (Product Structure).
> **Last updated**: 2026-03-20

## Executive Summary

The CloudBlocks backend is an **Orchestration + Integration Backend** — not a thin proxy and not a full CRUD service. It mediates between the browser UI, GitHub (as the persistence layer for architecture data), external AI services, and internal validation engines.

**Key numbers**: 7 route modules, 26 endpoints, 6 domain entities, 5 infrastructure adapters (active), 3 engine modules, 2 health endpoints.

---

## Role Classification

| Aspect                | Classification                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| **Primary role**      | Orchestration + Integration                                                  |
| **Data storage**      | Metadata only (users, sessions, workspaces, generation runs, AI keys)        |
| **Architecture data** | NOT stored — lives in GitHub repos                                           |
| **Generated code**    | NOT stored — committed to GitHub repos                                       |
| **Auth model**        | Server-side sessions with httpOnly cookies (no JWTs)                         |
| **Validation**        | Duplicated from frontend (see [Duplication Analysis](#duplication-analysis)) |

### What the Backend Does

1. **Authentication & Sessions** — GitHub OAuth flow, server-side session management, cookie lifecycle
2. **Workspace Metadata** — CRUD for workspace index records (pointers to GitHub repos)
3. **GitHub Integration** — Repo listing/creation, architecture sync, PR creation, commit history
4. **AI Orchestration** — Proxies prompts to OpenAI, validates LLM output, manages encrypted API keys
5. **Code Generation** — Scaffolded job tracking (trigger, status, preview) — not yet executing
6. **Validation** — Server-side architecture validation (placement rules, connection rules)

### What the Backend Does NOT Do

- Store architecture JSON (→ GitHub)
- Store generated Terraform/Bicep/Pulumi (→ GitHub)
- Store templates (→ frontend / GitHub)
- Run actual code generation pipelines (scaffolded only)
- Serve the frontend (→ static hosting / GitHub Pages)

---

## Route Modules

### 1. Auth (`routes/auth.py`) — 5 endpoints

Handles GitHub OAuth and cookie-based session management.

| Method | Path                    | Description                                                                                   |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| `POST` | `/auth/github`          | Start GitHub OAuth flow (sets `cb_oauth` state cookie)                                        |
| `GET`  | `/auth/github/callback` | OAuth callback — exchanges code, creates user/session, sets `cb_session` cookie, 302 redirect |
| `GET`  | `/auth/session`         | Return current user from session cookie                                                       |
| `POST` | `/auth/logout`          | Revoke session, clear cookies                                                                 |
| `GET`  | `/auth/me`              | Current authenticated user (via `require_user` dependency)                                    |

**Dependencies**: `SessionRepository`, `UserRepository`, `IdentityRepository`, `GitHubService`, `settings` (OAuth config)

### 2. Session (`routes/session.py`) — 1 endpoint

Binds a workspace to the active session.

| Method | Path                 | Description                                             |
| ------ | -------------------- | ------------------------------------------------------- |
| `POST` | `/session/workspace` | Bind workspace ID (and optional repo) to active session |

**Dependencies**: `SessionRepository`, `require_user`

### 3. Workspaces (`routes/workspaces.py`) — 5 endpoints

CRUD for workspace metadata. Workspaces are pointers to GitHub repos, not architecture data stores.

| Method   | Path                         | Description                               |
| -------- | ---------------------------- | ----------------------------------------- |
| `GET`    | `/workspaces/`               | List workspaces owned by the current user |
| `POST`   | `/workspaces/`               | Create workspace (201)                    |
| `GET`    | `/workspaces/{workspace_id}` | Get workspace details                     |
| `PUT`    | `/workspaces/{workspace_id}` | Update workspace settings                 |
| `DELETE` | `/workspaces/{workspace_id}` | Delete workspace (204)                    |

**Dependencies**: `WorkspaceRepository`, `require_user`

### 4. GitHub (`routes/github.py`) — 6 endpoints

GitHub repo management and architecture sync via the GitHub API.

| Method | Path                       | Description                               |
| ------ | -------------------------- | ----------------------------------------- |
| `GET`  | `/github/repos`            | List user's GitHub repositories           |
| `POST` | `/github/repos`            | Create a new GitHub repository (201)      |
| `POST` | `/workspaces/{id}/sync`    | Push `architecture.json` to GitHub        |
| `POST` | `/workspaces/{id}/pull`    | Pull `architecture.json` from GitHub      |
| `POST` | `/workspaces/{id}/pr`      | Create PR with architecture changes (201) |
| `GET`  | `/workspaces/{id}/commits` | List recent commits                       |

**Dependencies**: `GitHubService`, `WorkspaceRepository`, `require_user`

### 5. Generation (`routes/generation.py`) — 3 endpoints

Scaffolded code generation job tracking. Creates run records but does NOT execute actual generation.

| Method | Path                                 | Description                                                |
| ------ | ------------------------------------ | ---------------------------------------------------------- |
| `POST` | `/workspaces/{id}/generate`          | Create generation run record (202) — placeholder           |
| `GET`  | `/workspaces/{id}/generate/{run_id}` | Get generation run status                                  |
| `GET`  | `/workspaces/{id}/preview`           | Preview generated code — placeholder (returns empty files) |

**Dependencies**: `GenerationRunRepository`, `WorkspaceRepository`, `require_user`

### 6. AI (`routes/ai.py`) — 3 endpoints

AI-assisted architecture generation and suggestions. Proxies to OpenAI.

| Method | Path           | Description                                                                   |
| ------ | -------------- | ----------------------------------------------------------------------------- |
| `POST` | `/ai/generate` | Generate architecture from natural-language prompt (calls OpenAI)             |
| `POST` | `/ai/suggest`  | Suggest improvements to an architecture (calls OpenAI via `SuggestionEngine`) |
| `POST` | `/ai/cost`     | Estimate infrastructure cost (calls Infracost adapter — stubbed)              |

**Dependencies**: `LLMClient`, `SuggestionEngine`, `ArchitectureValidator`, `AIApiKeyRepository`, `require_user`

### 7. AI Keys (`routes/ai_keys.py`) — 3 endpoints

Encrypted API key management for AI providers.

| Method   | Path                  | Description                                                    |
| -------- | --------------------- | -------------------------------------------------------------- |
| `POST`   | `/ai/keys`            | Store/update AI API key (Fernet-encrypted, upsert by provider) |
| `GET`    | `/ai/keys`            | List stored key providers (no key values returned)             |
| `DELETE` | `/ai/keys/{provider}` | Delete stored key by provider                                  |

**Dependencies**: `AIApiKeyRepository`, `require_user`

---

## Engine Modules

### `engines/prompts/architecture_prompt.py`

Builds the system prompt for LLM-based architecture generation. Contains:

- `BLOCK_CATEGORIES` — 10 categories (compute, database, storage, gateway, function, queue, event, analytics, identity, observability)
- `CONNECTION_TYPES` — 5 types (dataflow, http, internal, data, async)
- `PROVIDER_TYPES` — 3 providers (aws, azure, gcp)
- `LAYER_TYPES` — 5 layers (global, edge, region, zone, subnet)
- `SUBTYPE_REGISTRY` — Full mapping of provider → category → allowed subtypes
- `EXAMPLE_THREE_TIER` / `EXAMPLE_SERVERLESS_EVENT` — Few-shot examples embedded in the prompt
- `build_architecture_prompt(provider)` — Assembles the full system prompt with JSON Schema, enum values, placement rules, and few-shot examples

### `engines/validation.py`

`ArchitectureValidator` — Post-processes LLM output to validate structural correctness:

- Required fields presence (`plates`, `blocks`, `connections`)
- Enum validation (category, provider, connection type, layer type, subtype)
- Referential integrity (block `placementId` → plate `id`, connection endpoints → block `id`)
- Duplicate ID detection
- Imports constants from `architecture_prompt.py`

### `engines/rule_engine.py`

`validate_architecture()` — Validates architecture against domain rules:

- **Placement rules**: compute/database/storage/gateway must be on subnet; function/queue/event/analytics/identity/observability must NOT be on subnet
- **Connection adjacency**: enforces allowed source→target category pairs (e.g., gateway → compute|function, compute → database|storage)
- **Self-connection prevention**
- Returns `ValidationResult` dict with `valid`, `errors`, and `warnings`

### `engines/suggestions.py`

`SuggestionEngine` — Sends architecture JSON to OpenAI for security/reliability/best-practice review. Returns scored suggestions. Falls back to empty response on LLM errors.

---

## Domain Model

Six Pydantic entities in `domain/models/entities.py` and `domain/models/ai_entities.py`:

| Entity          | Purpose                                          | Persisted?            |
| --------------- | ------------------------------------------------ | --------------------- |
| `User`          | GitHub-linked user profile                       | Yes (SQLite)          |
| `Identity`      | OAuth provider record (GitHub token storage)     | Yes (SQLite)          |
| `Workspace`     | Pointer to a GitHub repo (not architecture data) | Yes (SQLite)          |
| `GenerationRun` | Code generation job tracking                     | Yes (SQLite)          |
| `Session`       | Server-side cookie session                       | Yes (SQLite or Redis) |
| `AIApiKey`      | Encrypted AI provider API key                    | Yes (SQLite)          |

Repository interfaces (ports) are defined in `domain/models/repositories.py` as abstract base classes, following Clean Architecture.

### Application Layer (Use Cases)

The `application/use_cases/` directory contains use-case classes that encapsulate business logic with ownership enforcement:

| Use Case                 | Responsibility                                                             |
| ------------------------ | -------------------------------------------------------------------------- |
| `CreateWorkspaceUseCase` | Creates a workspace with a generated ID, linking it to the current user    |
| `GetWorkspaceUseCase`    | Retrieves a workspace by ID, enforcing ownership (raises `ForbiddenError`) |
| `ListWorkspacesUseCase`  | Lists all workspaces for the authenticated user                            |
| `DeleteWorkspaceUseCase` | Deletes a workspace by ID, enforcing ownership                             |

This layer sits between routes and repositories, implementing the Clean Architecture pattern where routes delegate to use cases, which coordinate domain entities and repository ports.

---

## Infrastructure Adapters

| Adapter            | Path                               | Status                                                     |
| ------------------ | ---------------------------------- | ---------------------------------------------------------- |
| **Database**       | `infrastructure/db/`               | Active — SQLite (dev) / PostgreSQL (planned)               |
| **Cache**          | `infrastructure/cache/`            | Active — Redis (optional, for sessions)                    |
| **GitHub Service** | `infrastructure/github_service.py` | Active — GitHub API via user OAuth token                   |
| **LLM Client**     | `infrastructure/llm/`              | Active — OpenAI API                                        |
| **Cost**           | `infrastructure/cost/`             | Stubbed — Infracost integration                            |
| **Queue**          | `infrastructure/queue/`            | Scaffolded — job queue (not implemented)                   |
| **Storage**        | `infrastructure/storage/`          | Scaffolded — object storage (not implemented)              |
| **Providers**      | `infrastructure/providers/`        | Scaffolded — cloud provider integrations (not implemented) |

---

## Application Infrastructure

### Middleware

| Middleware            | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `CORSMiddleware`      | Cross-origin requests with configurable origins       |
| `RequestIDMiddleware` | Attaches `X-Request-ID` header (from request or UUID) |

### Logging

JSON-structured logging via `JSONFormatter` — each log entry includes `timestamp`, `level`, `message`, `module`, and optional `request_id`.

### Error Handling

Global `AppError` exception handler returns consistent JSON:

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Auto-clears stale session cookies on 401 responses.

### Health Endpoints

| Endpoint            | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `GET /health`       | Basic liveness check (always returns `{"status": "ok"}`)                                   |
| `GET /health/ready` | Readiness check — verifies DB connectivity and Redis (if enabled). Returns 503 on failure. |

---

## Duplication Analysis

The following domain constants and logic are duplicated between the Python backend and the TypeScript frontend. This is a known concern tracked for resolution in issue C.3 (Validation Ownership).

### Duplicated Constants

| Constant           | Backend Location                         | Frontend Source of Truth    |
| ------------------ | ---------------------------------------- | --------------------------- |
| `BLOCK_CATEGORIES` | `engines/prompts/architecture_prompt.py` | `@cloudblocks/domain` types |
| `CONNECTION_TYPES` | `engines/prompts/architecture_prompt.py` | `@cloudblocks/domain` types |
| `PROVIDER_TYPES`   | `engines/prompts/architecture_prompt.py` | `@cloudblocks/domain` types |
| `LAYER_TYPES`      | `engines/prompts/architecture_prompt.py` | `@cloudblocks/domain` types |
| `SUBTYPE_REGISTRY` | `engines/prompts/architecture_prompt.py` | `@cloudblocks/domain` types |

### Duplicated Logic

| Logic                             | Backend Location         | Frontend Location                       |
| --------------------------------- | ------------------------ | --------------------------------------- |
| Placement validation rules        | `engines/rule_engine.py` | `apps/web/src/entities/validation/`     |
| Connection adjacency rules        | `engines/rule_engine.py` | `apps/web/src/entities/validation/`     |
| Architecture structure validation | `engines/validation.py`  | TypeScript type system + runtime checks |

### Resolution Path

The Python backend cannot consume TypeScript directly. The planned resolution (M17 issues B.1–B.2) is to extract a shared **JSON Schema** as the single source of truth, then generate both TypeScript types and Python validation from it. Until then, changes to domain constants must be synchronized manually across both codebases.

---

## Dependency Graph

```
routes/auth.py ──────────► SessionRepository
                ──────────► UserRepository
                ──────────► IdentityRepository
                ──────────► GitHubService

routes/session.py ────────► SessionRepository

routes/workspaces.py ─────► WorkspaceRepository

routes/github.py ─────────► GitHubService
                 ─────────► WorkspaceRepository

routes/generation.py ─────► GenerationRunRepository
                    ──────► WorkspaceRepository

routes/ai.py ─────────────► LLMClient
             ─────────────► SuggestionEngine ──► LLMClient
             ─────────────► ArchitectureValidator ──► architecture_prompt constants
             ─────────────► AIApiKeyRepository

routes/ai_keys.py ────────► AIApiKeyRepository

engines/rule_engine.py ────► (standalone, no external deps)
engines/validation.py ─────► architecture_prompt constants
engines/suggestions.py ────► LLMClient
```

---

## Recommendations for M17

1. **Version alignment**: FastAPI `version` in `main.py` should track `pyproject.toml` (addressed in PR #438).
2. **Shared schema**: Extract `BLOCK_CATEGORIES`, `CONNECTION_TYPES`, `PROVIDER_TYPES`, `LAYER_TYPES`, and `SUBTYPE_REGISTRY` into a JSON Schema that both Python and TypeScript consume (M17 issues B.1–B.2).
3. **Validation ownership**: Decide whether server-side validation is authoritative or advisory. Document the decision in an ADR (M17 issue C.3).
4. **Scaffolded adapters**: Queue, storage, and providers directories contain only `__init__.py`. Either implement or remove to reduce confusion.
5. **Generation pipeline**: The 3 generation endpoints are placeholders. Decide timeline and scope for actual implementation.
