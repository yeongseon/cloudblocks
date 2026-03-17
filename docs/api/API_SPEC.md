# CloudBlocks — API Specification

> **Implementation Status (v0.6.0 / Phase 7)**
>
> Authentication and GitHub OAuth session flow are implemented with cookie-based sessions.
> Auth and GitHub integration are implemented; server-side generation, validation, and templates remain planned.

## Overview

The CloudBlocks API is a **thin orchestration backend** built with Python FastAPI. It handles authentication, code generation orchestration, and GitHub integration — but does NOT store architecture data.

**Base URL**: `/api/v1`

**Design Principle**: The backend is a workflow orchestrator, not a CRUD service. Architecture data lives in GitHub repos.

## Currently Implemented (v0.6.0)

```
GET /health        → Basic health check (returns {"status": "ok"})
GET /health/ready  → Readiness check (returns {"status": "ready"})

POST /api/v1/auth/github                  → Returns { authorize_url }, sets cb_oauth cookie
GET  /api/v1/auth/github/callback?code=X&state=Y  → 302 redirect, sets cb_session cookie
GET  /api/v1/auth/session                 → Current authenticated session user
POST /api/v1/auth/logout                  → Always 200, clears session + cookie
POST /api/v1/session/workspace            → Bind active workspace to session
```

Auth, session workspace binding, and GitHub integration routes are implemented in the backend codebase. Server-side generation/validation/template routes remain planned or scaffolded as noted below.

---

## Authentication (Implemented: Phase 7)

GitHub OAuth with server-side SQLite sessions and secure cookies.

```
POST /api/v1/auth/github           → Start GitHub OAuth flow
GET  /api/v1/auth/github/callback  → GitHub OAuth callback
POST /api/v1/auth/logout           → Invalidate session
GET  /api/v1/auth/session          → Current user info from active session
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
- Session state is server-side (`sessions` table, Migration 004).
- Stale sessions return 401 and clear stale session cookies.

## Workspaces (Partially Implemented: Milestone 5+)

Workspaces link a CloudBlocks workspace to a GitHub repo. Session workspace binding is implemented (`POST /api/v1/session/workspace`), and workspace metadata CRUD routes are scaffolded in the API. Architecture data remains in GitHub.

```
GET    /api/v1/workspaces              → List user's workspaces
POST   /api/v1/workspaces              → Create workspace (+ optional GitHub repo)
GET    /api/v1/workspaces/:id          → Get workspace details
PUT    /api/v1/workspaces/:id          → Update workspace settings
DELETE /api/v1/workspaces/:id          → Delete workspace
```

> **Note**: The metadata DB uses `workspaces` (not `projects`). See [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md) for the actual schema.

## Planned: Server-side Code Generation (Milestone 5+)

Generate infrastructure code from architecture. In Milestone 3, code generation runs client-side (export to file/clipboard). Starting from Milestone 5, the backend reads `architecture.json` from GitHub, runs the generator, and commits the output back. The endpoints below are for server-side generation (Milestone 5+).

```
POST   /api/v1/workspaces/:id/generate    → Trigger code generation
GET    /api/v1/workspaces/:id/generate/:runId  → Get generation status
GET    /api/v1/workspaces/:id/preview     → Preview generated code (no commit)
```

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

## Planned: Server-side Validation (Milestone 3+)

Validate architecture against rules. Can run client-side or server-side.

> **Note**: Client-side validation is already implemented in Milestone 1 (`apps/web/src/features/validate/`).

```
POST   /api/v1/validate                 → Validate architecture (server-side)
```

## Planned: Server-side Templates (Milestone 6+)

Browse and use architecture templates.

```
GET    /api/v1/templates                → List available templates
GET    /api/v1/templates/:id            → Get template details
POST   /api/v1/templates/:id/use        → Create workspace from template
```

## Request/Response Formats

### Create Workspace (Scaffolded)

**Request:**
```json
{
  "name": "My 3-Tier App",
  "generator": "terraform",
  "provider": "azure",
  "githubRepo": "user/my-infra"
}
```

**Response (201):**
```json
{
  "id": "ws-a1b2c3d4",
  "name": "My 3-Tier App",
  "generator": "terraform",
  "provider": "azure",
  "githubRepo": "user/my-infra",
  "githubBranch": "main",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### Trigger Code Generation (Planned)

**Request:**
```json
{
  "generator": "terraform",
  "provider": "azure",
  "commitMessage": "Update 3-tier architecture",
  "createPR": true,
  "branch": "feature/update-arch"
}
```

**Response (202):**
```json
{
  "runId": "run-e5f6g7h8",
  "status": "pending",
  "message": "Generation job created"
}
```

### Generation Status (Planned)

**Response (200):**
```json
{
  "runId": "run-e5f6g7h8",
  "status": "completed",
  "generator": "terraform",
  "commitSha": "abc123def456",
  "files": [
    "infra/terraform/main.tf",
    "infra/terraform/variables.tf",
    "infra/terraform/outputs.tf"
  ],
  "pullRequestUrl": "https://github.com/user/my-infra/pull/1",
  "startedAt": "2025-01-01T00:00:01Z",
  "completedAt": "2025-01-01T00:00:05Z"
}
```

> **Note**: Status values match the actual migration schema: `pending`, `running`, `completed`, `failed`.

### Validation Response

```json
{
  "valid": false,
  "errors": [
    {
      "ruleId": "rule-compute-subnet",
      "severity": "error",
      "message": "Compute block must be placed on a Subnet Plate",
      "suggestion": "Move the Compute block to a Subnet Plate",
      "targetId": "block-abc123"
    }
  ],
  "warnings": []
}
```

## Error Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "Workspace with id 'ws-abc123' not found",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `GITHUB_ERROR` | 502 | GitHub API error |
| `GENERATION_FAILED` | 500 | Code generation failed |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting (Planned)

- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute
- **Code Generation**: 10 requests/hour
- **GitHub Sync**: 30 requests/hour

## Health Checks (Implemented)

```
GET /health        → Basic health check
GET /health/ready  → Readiness (DB + GitHub API connected)
```
