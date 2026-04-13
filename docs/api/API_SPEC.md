# CloudBlocks — API Specification

> **Audience**: Contributors / Backend Developers | **Status**: Backend (optional) | **Verified against**: v0.43.0

> **Note**: The CloudBlocks backend is optional. The frontend works standalone for visual building,
> templates, validation, and Terraform export. The backend adds GitHub OAuth, workspace sync,
> and AI features. This document covers the optional backend API surface.
>

> **Implementation Status (Phase 7+)**
>
> Authentication and GitHub OAuth session flow are implemented with cookie-based sessions.
> Auth and GitHub integration are implemented. AI generation/suggestion/cost endpoints are implemented. Generation routes currently track run metadata and status.

## Overview

The CloudBlocks API is a FastAPI backend for authenticated integrations. It handles GitHub OAuth/session auth, workspace/repo operations, and AI integration endpoints — but does NOT store architecture source-of-truth data.

**Base URL**: `/api/v1`

**Design Principle**: The backend owns integration/session concerns. Architecture modeling, validation, generation, and template runtime behavior live in the frontend app (`apps/web`). Architecture data lives in GitHub repos.

## Contract Boundaries

- Frontend-owned (`apps/web`): validation engine, code generation pipeline, and template system.
- Shared model contract: TypeScript schema in `packages/schema` (`@cloudblocks/schema`).
- Backend model contract: Python models in `apps/api/app/models/generated/` generated from `packages/schema/dist/architecture-model.schema.json`.

## Currently Implemented

```
GET  /health                                    → Basic health check
GET  /health/ready                              → Readiness check (DB + optional Redis)

POST /api/v1/auth/github                        → Start GitHub OAuth flow (sets cb_oauth cookie)
GET  /api/v1/auth/github/callback               → GitHub OAuth callback (sets cb_session cookie, 302)
GET  /api/v1/auth/session                       → Current user from session cookie
GET  /api/v1/auth/me                            → Current authenticated user (via dependency)
POST /api/v1/auth/logout                        → Revoke session, clear cookie

POST /api/v1/session/workspace                  → Bind workspace to active session

GET  /api/v1/workspaces/                        → List user's workspaces
POST /api/v1/workspaces/                        → Create workspace (201)
GET  /api/v1/workspaces/{workspace_id}          → Get workspace details
PUT  /api/v1/workspaces/{workspace_id}          → Update workspace settings
DELETE /api/v1/workspaces/{workspace_id}        → Delete workspace (204)

GET  /api/v1/github/repos                       → List user's GitHub repos
POST /api/v1/github/repos                       → Create new GitHub repo (201)
POST /api/v1/workspaces/{workspace_id}/sync     → Sync architecture.json to GitHub
POST /api/v1/workspaces/{workspace_id}/pull     → Pull architecture.json from GitHub
POST /api/v1/workspaces/{workspace_id}/pr       → Create PR with architecture changes (201)
GET  /api/v1/workspaces/{workspace_id}/commits  → List recent commits

POST /api/v1/workspaces/{workspace_id}/generate → Trigger generation (placeholder: creates run record, 202)
GET  /api/v1/workspaces/{workspace_id}/generate/{run_id} → Get generation run status
GET  /api/v1/workspaces/{workspace_id}/preview  → Preview generated code (placeholder: returns empty files)

POST /api/v1/ai/generate                        → AI architecture generation (requires stored OpenAI key)
POST /api/v1/ai/suggest                         → AI improvement suggestions
POST /api/v1/ai/cost                            → Infrastructure cost estimation

POST /api/v1/ai/keys                            → Store AI API key (encrypted, upsert by provider)
GET  /api/v1/ai/keys                            → List stored AI key providers
DELETE /api/v1/ai/keys/{provider}               → Delete AI API key by provider
```

Auth, session workspace binding, GitHub integration, and AI routes are implemented in the backend codebase. Generation routes are scaffolded for run tracking and status.

---

## Authentication (Implemented: Phase 7)

GitHub OAuth with server-side SQLite sessions and secure cookies.

```
POST /api/v1/auth/github           → Start GitHub OAuth flow
GET  /api/v1/auth/github/callback  → GitHub OAuth callback
POST /api/v1/auth/logout           → Invalidate session
GET  /api/v1/auth/session          → Current user info from active session
GET  /api/v1/auth/me               → Current authenticated user
POST /api/v1/session/workspace     → Bind workspace to active session
```

### Auth Flow

```
1. User clicks "Sign in with GitHub"
2. Frontend calls `POST /api/v1/auth/github` with `credentials: 'include'`
3. GitHub redirects back with auth code
4. Backend validates `cb_oauth` state cookie and exchanges code for GitHub token
5. Backend creates/updates user and session in SQLite metadata DB
6. Backend sets `cb_session` httpOnly cookie and redirects (302)
7. Frontend calls `GET /api/v1/auth/session` with `credentials: 'include'`
```

Notes:

- No JWT access/refresh tokens are issued.
- Session state is server-side (`sessions` table).
- Stale sessions return 401 and clear stale session cookies.

## Workspaces (Implemented: Milestone 5+)

Workspaces link a CloudBlocks workspace to a GitHub repo. Session workspace binding is implemented (`POST /api/v1/session/workspace`), and workspace metadata CRUD routes are fully implemented. Architecture data remains in GitHub.

```
GET    /api/v1/workspaces              → List user's workspaces
POST   /api/v1/workspaces              → Create workspace (+ optional GitHub repo)
GET    /api/v1/workspaces/:id          → Get workspace details
PUT    /api/v1/workspaces/:id          → Update workspace settings
DELETE /api/v1/workspaces/:id          → Delete workspace
```

> **Note**: The metadata DB uses `workspaces` (not `projects`). See `STORAGE_ARCHITECTURE.md` (internal, excluded from public docs) for the actual schema.

## Generation Run Tracking (Current Backend Surface)

Code generation execution is frontend-owned in `apps/web`. Backend generation routes currently provide authenticated run tracking/status records and a preview placeholder.

> **Note**: `POST .../generate` creates a run record in `pending` status without executing the frontend generator pipeline. `GET .../preview` currently returns an empty file list with a placeholder message.

```
POST   /api/v1/workspaces/:id/generate    → Trigger code generation
GET    /api/v1/workspaces/:id/generate/:runId  → Get generation status
GET    /api/v1/workspaces/:id/preview     → Preview generated code (no commit)
```

## AI Routes (Implemented)

AI-assisted architecture generation and suggestions. Requires a stored OpenAI API key.

> **Scope note**: This section documents the route surface only. Detailed AI usage examples, prompt engineering, and the dedicated AI guide are tracked in #320.

### AI Generation and Suggestions (Implemented)

```
POST /api/v1/ai/generate    → Generate architecture from natural language prompt
POST /api/v1/ai/suggest     → Suggest architecture improvements
POST /api/v1/ai/cost        → Estimate infrastructure cost
```

`POST /api/v1/ai/generate` calls the OpenAI API using the user's stored key. It requires `prompt`, `provider` (default `"aws"`), and `complexity` (default `"intermediate"`) fields. Returns `{ architecture: {...} }`.

`POST /api/v1/ai/suggest` analyzes architecture payloads and returns structured suggestions.

`POST /api/v1/ai/cost` converts architecture blocks to Terraform JSON mappings and returns cost estimates via Infracost.

### AI Key Management (Implemented)

```
POST   /api/v1/ai/keys              → Store/update AI API key (encrypted at rest)
GET    /api/v1/ai/keys              → List stored key providers (no key values returned)
DELETE /api/v1/ai/keys/{provider}   → Delete stored key by provider name
```

Keys are encrypted using Fernet before storage. Each user can store one key per provider (upsert semantics).

## GitHub Integration (Implemented: Milestone 5)

Manage GitHub repository connections and sync.

```
GET    /api/v1/github/repos             → List user's GitHub repos
POST   /api/v1/github/repos             → Create new GitHub repo
POST   /api/v1/workspaces/:id/sync      → Sync architecture to GitHub
POST   /api/v1/workspaces/:id/pull      → Pull latest from GitHub
POST   /api/v1/workspaces/:id/pr        → Create PR with changes
GET    /api/v1/workspaces/:id/commits   → List recent commits
```

## Not in Backend API Contract

The following capabilities are intentionally frontend-owned in the current architecture and are not exposed as backend routes:

- Validation engine execution (`apps/web/src/entities/validation/`)
- Template registry/application flow (`apps/web/src/features/templates/`)
- Runtime generation pipeline (`apps/web/src/features/generate/`)

## Request/Response Formats

### Create Workspace (Implemented)

**Request:**

```json
{
  "name": "My 3-Tier App",
  "generator": "terraform",
  "provider": "azure",
  "github_repo": "user/my-infra"
}
```

**Response (201):**

```json
{
  "id": "ws-a1b2c3d4",
  "owner_id": "user-123",
  "name": "My 3-Tier App",
  "generator": "terraform",
  "provider": "azure",
  "github_repo": "user/my-infra",
  "github_branch": "main",
  "last_synced_at": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Trigger Code Generation (Current Placeholder Route)

**Request:**

```json
{
  "generator": "terraform",
  "provider": "azure",
  "commit_message": "Update 3-tier architecture",
  "create_pr": true,
  "branch": "feature/update-arch"
}
```

**Response (202):**

```json
{
  "id": "run-e5f6g7h8",
  "workspace_id": "ws-a1b2c3d4",
  "status": "pending",
  "generator": "terraform",
  "commit_sha": null,
  "pull_request_url": null,
  "error_message": null,
  "started_at": "2025-01-01T00:00:01Z",
  "completed_at": null,
  "created_at": "2025-01-01T00:00:01Z"
}
```

### Generation Status (Implemented Route)

> **Current behavior**: Run records are created in `pending` status. Background worker transitions are not wired in the current backend implementation.

**Response (200):**

```json
{
  "id": "run-e5f6g7h8",
  "workspace_id": "ws-a1b2c3d4",
  "status": "completed",
  "generator": "terraform",
  "commit_sha": "abc123def456",
  "pull_request_url": "https://github.com/user/my-infra/pull/1",
  "error_message": null,
  "started_at": "2025-01-01T00:00:01Z",
  "completed_at": "2025-01-01T00:00:05Z",
  "created_at": "2025-01-01T00:00:01Z"
}
```

> **Note**: Status values match the actual migration schema: `pending`, `running`, `completed`, `failed`.

## Error Format

The backend uses two error response formats depending on the error source. The frontend error parser (`client.ts: parseErrorMessage`) handles both formats transparently.

### AppError Format (Custom Application Errors)

Raised by application-level error handlers (e.g., `AppError` class). Used for domain errors with structured codes.

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "Workspace with id 'ws-abc123' not found",
    "details": {}
  }
}
```

### FastAPI HTTPException Format

Raised by FastAPI's built-in `HTTPException` (e.g., dependency injection failures, middleware rejections). Used for framework-level errors.

```json
{
  "detail": "Not authenticated"
}
```

The frontend `getApiErrorMessage()` helper tries `error.message` first, then falls back to `detail`, ensuring consistent user-facing messages regardless of which format the server returns.

### Error Codes

| Code                | HTTP Status | Description                |
| ------------------- | ----------- | -------------------------- |
| `VALIDATION_ERROR`  | 400         | Invalid request body       |
| `UNAUTHORIZED`      | 401         | Missing or invalid session |
| `FORBIDDEN`         | 403         | Insufficient permissions   |
| `NOT_FOUND`         | 404         | Resource not found         |
| `CONFLICT`          | 409         | Resource already exists    |
| `RATE_LIMITED`      | 429         | Too many requests          |
| `GITHUB_ERROR`      | 502         | GitHub API error           |
| `GENERATION_FAILED` | 500         | Code generation failed     |
| `INTERNAL_ERROR`    | 500         | Server error               |

## Rate Limiting (Target Policy)

- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute
- **Code Generation**: 10 requests/hour
- **GitHub Sync**: 30 requests/hour

## Health Checks (Implemented)

```
GET /health        → Basic health check
GET /health/ready  → Readiness (DB + optional Redis connected)
```
