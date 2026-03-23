# Security Boundary Contract

> Covers issue #25.

This document codifies security-critical boundaries as enforceable design rules. Security assumptions become explicit contracts — violations are treated as bugs, not style issues.

---

## 1. Session Transport Contract

### Session Cookie

| Rule                            | Policy                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| **Transport**                   | `cb_session` httpOnly cookie only                                 |
| **Cookie scope**                | Sent automatically with `credentials: 'include'`                  |
| **Query params**                | ❌ NEVER — session identifiers must not appear in URLs            |
| **Request body**                | ❌ NEVER — auth session tokens are transport metadata             |
| **localStorage/sessionStorage** | ❌ NEVER — browser-accessible storage must not hold auth sessions |
| **Server-side storage**         | Session records in SQLite (`sessions` table); token hash only     |

### Implementation

- **Backend**: Session middleware and auth routes read/write `cb_session` cookie
- **Frontend**: All authenticated API calls include `credentials: 'include'`
- **OAuth state**: `cb_oauth` cookie stores Fernet-encrypted state payload for callback validation

### DO ✅

```typescript
fetch('/api/v1/auth/session', {
  method: 'GET',
  credentials: 'include',
});
```

### DON'T ❌

```typescript
// NEVER: persist auth session token in browser storage
localStorage.setItem('auth_token', token);

// NEVER: pass session token manually in custom headers
fetch('/api/v1/auth/session', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 2. Session Security Policy Contract

| Rule                      | Policy                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Minimum length**        | 32 characters in non-development environments                                                                                     |
| **Weak secrets**          | `"change-me-in-production"`, `"secret"`, `"password"`, `""` are explicitly blocked                                                |
| **Primary use**           | Secret key is used for Fernet key derivation (`cb_oauth` state cookie encryption), not JWT signing                                |
| **Session token format**  | Random URL-safe token (from `secrets.token_urlsafe(32)`) in `cb_session` httpOnly cookie; raw token stored as `sessions.id` in DB |
| **Session expiry**        | Configurable via `session_ttl_hours` (default: 168)                                                                               |
| **Development exception** | Weak secrets are allowed when `app_env == "development"` only                                                                     |

### Implementation

- **Enforcement**: `apps/api/app/core/config.py` — `@model_validator(mode="after")` on `Settings` class
- **Tests**: `apps/api/app/tests/unit/test_config.py` — 4 tests covering reject-weak-prod, reject-short-staging, accept-strong-prod, allow-weak-dev

### Failure Behavior

Application **refuses to start** if the session secret is too weak for the environment. This is a hard fail, not a warning.

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
6. Backend creates server-side session + sets httpOnly `cb_session` cookie
7. Frontend uses cookie automatically on API calls (`credentials: 'include'`)
```

| Milestone           | Security Rule                                                              |
| ------------------- | -------------------------------------------------------------------------- |
| **State parameter** | CSRF protection — random, single-use, time-limited (10 min)                |
| **Code exchange**   | Server-side only — client secret never exposed to frontend                 |
| **Session storage** | Session record in SQLite (`sessions` table), token hash stored server-side |
| **Session refresh** | N/A (no refresh token flow)                                                |
| **Logout**          | Delete server-side session and clear `cb_session` cookie                   |

### DO ✅

- Validate `state` parameter matches the one generated before redirect
- Exchange authorization code server-side with client secret
- Use secure, expiring server-side sessions
- Set session cookies as httpOnly and include credentials on frontend calls

### DON'T ❌

- Never expose `GITHUB_CLIENT_SECRET` to the frontend
- Never store access tokens in localStorage
- Never reuse OAuth state parameters
- Never skip state parameter validation

---

## 4. API Authentication Contract

| Endpoint Pattern                                               | Auth Required   | Token Type                             |
| -------------------------------------------------------------- | --------------- | -------------------------------------- |
| `GET /health`, `GET /health/ready`                             | No              | —                                      |
| `POST /api/v1/auth/github`, `GET /api/v1/auth/github/callback` | No              | —                                      |
| `GET /api/v1/auth/session`                                     | Yes             | Session Cookie (`cb_session`)          |
| `POST /api/v1/auth/logout`                                     | No (always 200) | Optional Session Cookie (`cb_session`) |
| `POST /api/v1/session/workspace`                               | Yes             | Session Cookie (`cb_session`)          |
| `* /api/v1/github/*`                                           | Yes             | Session Cookie (`cb_session`)          |
| `* /api/v1/workspaces/*`                                       | Yes             | Session Cookie (`cb_session`)          |
| `* /api/v1/generate/*`                                         | Yes             | Session Cookie (`cb_session`)          |

### Authorization Rules

- **Workspace ownership**: Users can only access workspaces where `workspace.owner_id == current_user.id`
- **GitHub operations**: Require valid session cookie (user identity) and server-side GitHub token lookup
- **Rate limiting**: Per-user, per-endpoint (planned for Milestone 6)

---

## 5. Data Classification

| Data Type           | Sensitivity | Storage Location             | Encryption                 |
| ------------------- | ----------- | ---------------------------- | -------------------------- |
| Architecture JSON   | Low         | GitHub repo / localStorage   | At-rest (GitHub)           |
| Generated IaC code  | Low         | GitHub repo                  | At-rest (GitHub)           |
| User email          | Medium      | Metadata DB                  | At-rest                    |
| GitHub access token | High        | Server memory / encrypted DB | AES-256 at rest            |
| Session secret key  | Critical    | Environment variable         | Never stored in code or DB |
| OAuth client secret | Critical    | Environment variable         | Never stored in code or DB |

---

## 6. Enforcement Checklist

When reviewing PRs that touch auth or token handling:

- [ ] Session cookie (`cb_session`) is httpOnly and validated server-side
- [ ] OAuth state cookie (`cb_oauth`) is encrypted and time-limited
- [ ] No auth tokens in query parameters, request bodies, or localStorage
- [ ] Session secret validated at startup (model_validator)
- [ ] OAuth state parameter is random, single-use, and time-limited
- [ ] Workspace access checks `owner_id == current_user.id`
- [ ] No `GITHUB_CLIENT_SECRET` references in frontend code
- [ ] Test coverage for both positive and negative auth scenarios
