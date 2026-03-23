# OAuth Callback & API Endpoint Mapping

This document defines OAuth callback URLs and API base endpoints for each CloudBlocks deployment environment.

## Environment Endpoint Matrix

| Dimension      | Local                                               | Preview                     | Staging                                                                                         | Production                                                                                         |
| -------------- | --------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Frontend URL   | `http://localhost:5173`                             | `https://pr-{N}.{swa-host}` | `https://{swa-staging}.azurestaticapps.net`                                                     | `https://cloudblocks.app`                                                                          |
| API URL        | `http://localhost:8000`                             | N/A (frontend-only)         | `https://ca-cloudblocks-api-staging.{region}.azurecontainerapps.io`                             | `https://ca-cloudblocks-api-production.{region}.azurecontainerapps.io`                             |
| OAuth Callback | `http://localhost:8000/api/v1/auth/github/callback` | N/A                         | `https://ca-cloudblocks-api-staging.{region}.azurecontainerapps.io/api/v1/auth/github/callback` | `https://ca-cloudblocks-api-production.{region}.azurecontainerapps.io/api/v1/auth/github/callback` |

## Configuration Variables

### Frontend (`apps/web`)

| Variable       | Purpose              | Example                 |
| -------------- | -------------------- | ----------------------- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

Set in `.env` (local) or CI environment variables (staging/production).

### Backend (`apps/api`)

All variables use the `CLOUDBLOCKS_` prefix.

| Variable                            | Purpose                                         | Default                                             |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `CLOUDBLOCKS_GITHUB_CLIENT_ID`      | GitHub OAuth App client ID                      | (none)                                              |
| `CLOUDBLOCKS_GITHUB_CLIENT_SECRET`  | GitHub OAuth App client secret                  | (none)                                              |
| `CLOUDBLOCKS_GITHUB_REDIRECT_URI`   | OAuth callback URL                              | `http://localhost:8000/api/v1/auth/github/callback` |
| `CLOUDBLOCKS_FRONTEND_URL`          | Frontend origin for CORS and post-auth redirect | `http://localhost:5173`                             |
| `CLOUDBLOCKS_CORS_ORIGINS`          | Allowed CORS origins (JSON array)               | `["http://localhost:5173"]`                         |
| `CLOUDBLOCKS_SESSION_COOKIE_DOMAIN` | Cookie domain scope                             | `None` (localhost)                                  |
| `CLOUDBLOCKS_SESSION_COOKIE_SECURE` | Require HTTPS cookies                           | `false`                                             |

## GitHub OAuth App Configuration

Each environment requires a separate GitHub OAuth App (or a single app with environment-specific callback URLs).

### Local Development

1. Create a GitHub OAuth App at `https://github.com/settings/developers`
2. Set **Homepage URL**: `http://localhost:5173`
3. Set **Authorization callback URL**: `http://localhost:8000/api/v1/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### Staging

1. Create (or reuse) a GitHub OAuth App for staging
2. Set **Homepage URL**: `https://{swa-staging}.azurestaticapps.net`
3. Set **Authorization callback URL**: `https://ca-cloudblocks-api-staging.{region}.azurecontainerapps.io/api/v1/auth/github/callback`
4. Add Client ID and Secret to the `staging` GitHub Environment secrets

### Production

1. Create a GitHub OAuth App for production
2. Set **Homepage URL**: `https://cloudblocks.app`
3. Set **Authorization callback URL**: `https://ca-cloudblocks-api-production.{region}.azurecontainerapps.io/api/v1/auth/github/callback`
4. Add Client ID and Secret to the `production` GitHub Environment secrets

## Verification Checklist

Before deploying to a new environment, verify:

- [ ] `CLOUDBLOCKS_GITHUB_REDIRECT_URI` matches the GitHub OAuth App callback URL exactly
- [ ] `CLOUDBLOCKS_FRONTEND_URL` matches the actual frontend origin (no trailing slash)
- [ ] `CLOUDBLOCKS_CORS_ORIGINS` includes the frontend URL
- [ ] `CLOUDBLOCKS_SESSION_COOKIE_SECURE` is `true` for HTTPS environments
- [ ] `CLOUDBLOCKS_SESSION_COOKIE_DOMAIN` is set correctly for cross-subdomain cookies
- [ ] `VITE_API_URL` in frontend build points to the correct API host
- [ ] OAuth flow completes end-to-end: login redirects to GitHub, callback returns to frontend

## OAuth Flow Diagram

```
Browser                    Frontend                   API                      GitHub
  |                           |                        |                         |
  |-- Click "Login" --------->|                        |                         |
  |                           |-- GET /auth/github --->|                         |
  |                           |                        |-- Redirect to GitHub -->|
  |<-- Redirect to GitHub ----|------------------------|                         |
  |                           |                        |                         |
  |-- Authorize App --------->|                        |                         |
  |                           |                        |<-- Callback + code -----|
  |                           |                        |-- Exchange code ------->|
  |                           |                        |<-- Access token --------|
  |                           |<-- Set cookie + -------|                         |
  |<-- Redirect to frontend --|    redirect            |                         |
```

## Troubleshooting

| Symptom                             | Likely Cause                                                               | Fix                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `redirect_uri_mismatch` from GitHub | `CLOUDBLOCKS_GITHUB_REDIRECT_URI` does not match GitHub OAuth App settings | Update either the env var or the GitHub App callback URL to match exactly |
| CORS error on API calls             | `CLOUDBLOCKS_CORS_ORIGINS` missing frontend URL                            | Add the frontend origin to the CORS list                                  |
| Cookie not sent on API requests     | Domain mismatch or `Secure` flag on HTTP                                   | Check `SESSION_COOKIE_DOMAIN` and `SESSION_COOKIE_SECURE`                 |
| OAuth callback returns 404          | API not reachable at callback URL                                          | Verify API deployment URL and health endpoint                             |
