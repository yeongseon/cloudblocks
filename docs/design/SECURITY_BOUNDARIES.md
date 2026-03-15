# Security Boundary Contract

> Covers issue #25.

This document codifies security-critical boundaries as enforceable design rules. Security assumptions become explicit contracts — violations are treated as bugs, not style issues.

---

## 1. Token Transport Contract

### GitHub Token

| Rule | Policy |
|------|--------|
| **Transport** | `X-GitHub-Token` HTTP header only |
| **Query params** | ❌ NEVER — tokens must not appear in URLs, logs, or browser history |
| **Request body** | ❌ NEVER — token is transport-layer metadata, not business data |
| **localStorage** | ❌ NEVER — XSS-accessible storage must not hold GitHub tokens |
| **sessionStorage** | ⚠️ Acceptable for short-lived session use (frontend only) |
| **Server-side storage** | Encrypted at rest if stored; hash-only for verification in Phase 5 |

### Implementation

- **Backend**: All 6 GitHub routes in `apps/api/app/api/routes/github.py` use `Annotated[str | None, Header()]` for `x_github_token`
- **Frontend**: API client sends token via `X-GitHub-Token` header
- **Tests**: All integration tests in `test_github_routes.py` send tokens via `headers=` dict, never `params=`

### DO ✅

```python
# Backend route parameter
x_github_token: Annotated[str | None, Header()] = None
```

```typescript
// Frontend API call
fetch("/api/v1/github/repos", {
  headers: { "X-GitHub-Token": token }
});
```

### DON'T ❌

```python
# NEVER: query parameter
x_github_token: str | None = None  # This reads from query string

# NEVER: accepting token in request body
class RepoRequest(BaseModel):
    github_token: str  # Tokens are not business data
```

---

## 2. JWT Secret Policy Contract

| Rule | Policy |
|------|--------|
| **Minimum length** | 32 characters in non-development environments |
| **Weak secrets** | `"change-me-in-production"`, `"secret"`, `"password"`, `""` are explicitly blocked |
| **Algorithm** | `HS256` (symmetric) — upgrade to RS256 when key management is available |
| **Expiration** | Access token: 1 hour (`jwt_expiration_seconds: 3600`) |
| **Refresh token** | 7 days (`jwt_refresh_expiration_seconds: 604800`) |
| **Development exception** | Weak secrets are allowed when `app_env == "development"` only |

### Implementation

- **Enforcement**: `apps/api/app/core/config.py` — `@model_validator(mode="after")` on `Settings` class
- **Tests**: `apps/api/app/tests/unit/test_config.py` — 4 tests covering reject-weak-prod, reject-short-staging, accept-strong-prod, allow-weak-dev

### Failure Behavior

Application **refuses to start** if JWT secret is too weak for the environment. This is a hard fail, not a warning.

```python
raise ValueError(
    f"JWT secret is too weak for env '{self.app_env}'. "
    "Set CLOUDBLOCKS_JWT_SECRET to a random string of at least 32 characters."
)
```

---

## 3. OAuth State Lifecycle Contract

### GitHub App OAuth Flow

```
1. User clicks "Sign in with GitHub" in frontend
2. Frontend redirects to GitHub authorization URL
3. GitHub redirects back with ?code=... and ?state=...
4. Backend exchanges code for access token
5. Backend creates/links user identity
6. Backend issues JWT (access + refresh)
7. Frontend stores JWT for API calls
```

| Phase | Security Rule |
|-------|--------------|
| **State parameter** | CSRF protection — random, single-use, time-limited (10 min) |
| **Code exchange** | Server-side only — client secret never exposed to frontend |
| **Token storage** | Access token in memory or httpOnly cookie; refresh token in httpOnly cookie |
| **Token refresh** | Rotate refresh token on each use (one-time use) |
| **Logout** | Invalidate refresh token server-side; clear frontend state |

### DO ✅

- Validate `state` parameter matches the one generated before redirect
- Exchange authorization code server-side with client secret
- Use short-lived access tokens (1 hour)
- Rotate refresh tokens on use

### DON'T ❌

- Never expose `GITHUB_CLIENT_SECRET` to the frontend
- Never store access tokens in localStorage
- Never reuse OAuth state parameters
- Never skip state parameter validation

---

## 4. API Authentication Contract

| Endpoint Pattern | Auth Required | Token Type |
|-----------------|---------------|------------|
| `GET /health`, `GET /health/ready` | No | — |
| `POST /api/v1/auth/*` | No | — |
| `GET /api/v1/users/me` | Yes | JWT |
| `* /api/v1/github/*` | Yes | JWT + X-GitHub-Token |
| `* /api/v1/workspaces/*` | Yes | JWT |
| `* /api/v1/generate/*` | Yes | JWT |

### Authorization Rules

- **Workspace ownership**: Users can only access workspaces where `workspace.owner_id == current_user.id`
- **GitHub operations**: Require both valid JWT (user identity) and X-GitHub-Token (GitHub access)
- **Rate limiting**: Per-user, per-endpoint (planned for Phase 6)

---

## 5. Data Classification

| Data Type | Sensitivity | Storage Location | Encryption |
|-----------|------------|------------------|------------|
| Architecture JSON | Low | GitHub repo / localStorage | At-rest (GitHub) |
| Generated IaC code | Low | GitHub repo | At-rest (GitHub) |
| User email | Medium | Metadata DB | At-rest |
| GitHub access token | High | Server memory / encrypted DB | AES-256 at rest |
| JWT secret | Critical | Environment variable | Never stored in code or DB |
| OAuth client secret | Critical | Environment variable | Never stored in code or DB |

---

## 6. Enforcement Checklist

When reviewing PRs that touch auth or token handling:

- [ ] GitHub tokens transmitted via `X-GitHub-Token` header only
- [ ] No tokens in query parameters, request bodies, or localStorage
- [ ] JWT secret validated at startup (model_validator)
- [ ] OAuth state parameter is random, single-use, and time-limited
- [ ] Workspace access checks `owner_id == current_user.id`
- [ ] No `GITHUB_CLIENT_SECRET` references in frontend code
- [ ] Test coverage for both positive and negative auth scenarios
