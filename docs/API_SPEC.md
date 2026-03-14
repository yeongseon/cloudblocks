# CloudBlocks - API Specification

## Overview

The CloudBlocks API is a **RESTful API** built with Python FastAPI, following Clean Architecture principles. It provides backend services for workspace management, scenario-based learning, and cloud deployment.

**Base URL**: `/api/v1`

## Authentication

JWT-based authentication with httpOnly cookies.

```
POST /api/v1/auth/register    → Create account
POST /api/v1/auth/login       → Get JWT token
POST /api/v1/auth/logout      → Invalidate token
POST /api/v1/auth/refresh     → Refresh JWT token
GET  /api/v1/auth/me          → Current user info
```

## API Endpoints

### Workspaces

```
GET    /api/v1/workspaces              → List user's workspaces
POST   /api/v1/workspaces              → Create workspace
GET    /api/v1/workspaces/:id          → Get workspace details
PUT    /api/v1/workspaces/:id          → Update workspace
DELETE /api/v1/workspaces/:id          → Delete workspace
POST   /api/v1/workspaces/:id/validate → Validate architecture
POST   /api/v1/workspaces/:id/export   → Export as Terraform
```

### Scenarios

```
GET    /api/v1/scenarios               → List available scenarios
GET    /api/v1/scenarios/:id           → Get scenario details
POST   /api/v1/scenarios/:id/start     → Start scenario (create workspace from template)
POST   /api/v1/scenarios/:id/submit    → Submit solution for evaluation
GET    /api/v1/scenarios/:id/hint      → Get scenario hint
```

### Learning Progress

```
GET    /api/v1/progress                → Get all progress for current user
GET    /api/v1/progress/:scenario_id   → Get progress for specific scenario
```

### Deployments (v0.5+)

```
POST   /api/v1/deployments             → Create deployment from workspace
GET    /api/v1/deployments/:id         → Get deployment status
GET    /api/v1/deployments/:id/logs    → Get deployment logs
DELETE /api/v1/deployments/:id         → Destroy deployment
```

## Request/Response Formats

### Create Workspace

**Request:**
```json
{
  "name": "My 3-Tier App",
  "description": "Learning three-tier architecture"
}
```

**Response (201):**
```json
{
  "id": "ws-a1b2c3d4",
  "name": "My 3-Tier App",
  "description": "Learning three-tier architecture",
  "architecture": {
    "id": "arch-e5f6g7h8",
    "name": "Untitled",
    "version": "1",
    "plates": [],
    "blocks": [],
    "connections": [],
    "externalActors": [
      { "id": "ext-internet", "name": "Internet", "type": "internet" }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

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
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

- **Authenticated**: 100 requests/minute
- **Unauthenticated**: 20 requests/minute
- **Deployments**: 5 requests/hour
