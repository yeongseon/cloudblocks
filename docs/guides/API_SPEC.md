# CloudBlocks — API Specification

> **⚠️ Implementation Status (v0.1)**
>
> The backend API is scaffolded but **only health check endpoints are currently implemented**.
> All other endpoints listed below are **planned** and will be available in future versions.
> The v0.1 release is frontend-only with localStorage — no backend required.

## Overview

The CloudBlocks API is a **thin orchestration backend** built with Python FastAPI. It handles authentication, code generation orchestration, and GitHub integration — but does NOT store architecture data.

**Base URL**: `/api/v1`

**Design Principle**: The backend is a workflow orchestrator, not a CRUD service. Architecture data lives in GitHub repos.

## Currently Implemented (v0.1)

```
GET /health        → Basic health check (returns {"status": "ok"})
GET /health/ready  → Readiness check (returns {"status": "ready"})
```

These are the **only** endpoints that exist in the current codebase (`apps/api/app/main.py`).

---

## Planned: Authentication (v0.5+)

GitHub App OAuth with JWT session tokens.

```
POST /api/v1/auth/github           → Start GitHub OAuth flow
GET  /api/v1/auth/github/callback  → GitHub OAuth callback
POST /api/v1/auth/logout           → Invalidate session
GET  /api/v1/auth/me               → Current user info
POST /api/v1/auth/refresh          → Refresh JWT token
```

### Auth Flow

```
1. User clicks "Sign in with GitHub"
2. Frontend redirects to GitHub OAuth (via GitHub App)
3. GitHub redirects back with auth code
4. Backend exchanges code for access token
5. Backend creates/updates user in metadata DB
6. Backend returns JWT session token
7. Frontend stores JWT (httpOnly cookie)
```

## Planned: Workspaces (v0.5+)

Workspaces link a CloudBlocks workspace to a GitHub repo. Workspace metadata is stored in the metadata DB; architecture data is in GitHub.

```
GET    /api/v1/workspaces              → List user's workspaces
POST   /api/v1/workspaces              → Create workspace (+ optional GitHub repo)
GET    /api/v1/workspaces/:id          → Get workspace details
PUT    /api/v1/workspaces/:id          → Update workspace settings
DELETE /api/v1/workspaces/:id          → Delete workspace
```

> **Note**: The metadata DB uses `workspaces` (not `projects`). See [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md) for the actual schema.

## Planned: Code Generation (v0.5+)

Generate infrastructure code from architecture. In v0.3, code generation runs client-side (export to file/clipboard). Starting from v0.5, the backend reads `architecture.json` from GitHub, runs the generator, and commits the output back. The endpoints below are for server-side generation (v0.5+).

```
POST   /api/v1/workspaces/:id/generate    → Trigger code generation
GET    /api/v1/workspaces/:id/generate/:runId  → Get generation status
GET    /api/v1/workspaces/:id/preview     → Preview generated code (no commit)
```

## Planned: GitHub Integration (v0.5+)

Manage GitHub repository connections and sync.

```
GET    /api/v1/github/repos             → List user's GitHub repos
POST   /api/v1/github/repos             → Create new GitHub repo
POST   /api/v1/workspaces/:id/sync      → Sync architecture to GitHub
POST   /api/v1/workspaces/:id/pull      → Pull latest from GitHub
POST   /api/v1/workspaces/:id/pr        → Create PR with changes
GET    /api/v1/workspaces/:id/commits   → List recent commits
```

## Planned: Validation (v0.3+)

Validate architecture against rules. Can run client-side or server-side.

> **Note**: Client-side validation is already implemented in v0.1 (`apps/web/src/features/validate/`).

```
POST   /api/v1/validate                 → Validate architecture (server-side)
```

## Planned: Templates (v1.0+)

Browse and use architecture templates.

```
GET    /api/v1/templates                → List available templates
GET    /api/v1/templates/:id            → Get template details
POST   /api/v1/templates/:id/use        → Create workspace from template
```

## Request/Response Formats

### Create Workspace (Planned)

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
| `UNAUTHORIZED` | 401 | Missing or invalid token |
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
GET /health/ready  → Readiness (DB + Redis + GitHub API connected)
```
