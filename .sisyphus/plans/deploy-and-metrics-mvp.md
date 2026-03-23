# M23 Plan: Ship & Measure

## Milestone 23 — Ship & Measure (Hardening Sprint)

**Version**: v0.23.0
**Prerequisite**: M22 (Stub Connections & Theme System) fully completed and released.
**Nature**: Hardening — no new features. Make what exists actually work end-to-end.
**Principle**: Works perfectly → ship it. Might fail → Coming Soon (defer to M24).

## Goal

M1–M22 built the product. M23 makes it real: deploy to Azure, measure user behavior, and honestly mark unfinished surfaces as Coming Soon. Zero new features — only operationalization of what already exists.

## Key Objectives

1. **Deploy what we built**: Azure staging environment — the infra code exists since M18 but was never applied
2. **Measure what users do**: Wire up the existing metricsService (dead code since M18) to Plausible CE
3. **Be honest about gaps**: Mark unfinished features as Coming Soon in the UI instead of pretending they work
4. **Maintain GitHub Pages**: Live demo + docs site already works — keep it current

## Architecture

```
GitHub Pages (yeongseon.github.io/cloudblocks/)
  ├── Vite SPA (frontend demo)
  └── MkDocs Material (docs site)

Azure Staging
  ├── Static Web App (frontend)
  ├── Container App (FastAPI backend)
  ├── PostgreSQL Flexible Server
  ├── Redis Cache
  ├── Container Registry (shared ACR)
  └── Container App (Plausible CE)
       ├── ClickHouse
       └── PostgreSQL (Plausible metadata)

Frontend → Plausible CE (custom events via window.plausible())
Frontend → localStorage (existing metricsService, kept as fallback)
```

## Epics & Sub-Issues

### Epic 1: Plausible Analytics Integration

`metricsService.ts` exists with 12 event types defined but is never called in the app — dead code since M18. This epic wires it up to a real analytics backend.

**MVP (ship in M23):**

| #   | Title                                   | Size | Description                                                                                                                                                                                                          |
| --- | --------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Plausible frontend adapter              | S    | Create `plausibleAdapter.ts` — thin wrapper over `window.plausible()`. Add Plausible script tag to `index.html` with `VITE_PLAUSIBLE_DOMAIN` / `VITE_PLAUSIBLE_HOST` env vars. Graceful no-op when host unreachable. |
| 2   | metricsService Plausible dual-write     | S    | Update `metricsService.ts` to call plausibleAdapter alongside localStorage persistence. Existing tests must keep passing.                                                                                            |
| 3   | Insert 5 core trackEvent calls          | M    | Wire up tracking at: `app_loaded` (App mount), `first_plate_placed`, `first_block_placed`, `first_connection_created`, `code_generated` (with format prop).                                                          |
| 4   | Plausible adapter tests                 | S    | Unit tests for plausibleAdapter: event dispatch, graceful degradation when script not loaded, metadata forwarding.                                                                                                   |
| 5   | Plausible CE Docker Compose (local dev) | S    | `infra/plausible/docker-compose.plausible.yml` — Plausible CE + ClickHouse + Postgres for local testing.                                                                                                             |
| 6   | Plausible CE setup guide                | S    | `docs/guides/PLAUSIBLE_SETUP.md` — step-by-step for local dev and Azure Container App deployment.                                                                                                                    |

**Coming Soon (M24):**

- Full 12-event coverage (GitHub login, repo sync, PR, learning scenarios)
- Plausible Goal/Funnel configuration
- Grafana integration
- Custom alerting / Slack notifications

### Epic 2: Azure Staging Deployment

Terraform modules, Dockerfiles, CI workflows all exist but were never actually applied. This epic makes them work.

**MVP (ship in M23):**

| #   | Title                               | Size | Description                                                                                                                                                                    |
| --- | ----------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7   | Azure provisioning runbook          | M    | `docs/guides/AZURE_DEPLOY_GUIDE.md` — complete step-by-step: Service Principal + OIDC, Terraform state backend, `terraform apply`, GitHub secrets, deploy workflow activation. |
| 8   | Terraform staging apply             | L    | Execute provisioning runbook: create SP, state backend, apply staging Terraform. Interactive — requires Azure CLI login.                                                       |
| 9   | GitHub repo secrets configuration   | S    | Set staging environment secrets (AZURE*CLIENT_ID, TENANT_ID, SUBSCRIPTION_ID, ACR*\*, SWA_TOKEN) from Terraform outputs.                                                       |
| 10  | Enable deploy.yml push trigger      | S    | Uncomment push trigger in `deploy.yml`. Verify first automated staging deploy passes.                                                                                          |
| 11  | Plausible CE on Azure Container App | M    | Deploy Plausible CE as a separate Container App in staging resource group. Configure DNS or use Container App FQDN.                                                            |
| 12  | Staging deploy verification         | S    | End-to-end verification: health check, SWA frontend loads, API responds, Plausible receives events.                                                                            |

**Coming Soon (M24):**

- Azure Production environment provisioning
- Production promotion workflow (`promote.yml`)
- PR Preview environments (`preview.yml`)
- Custom domain + SSL setup
- CDN (Azure Front Door)

### Epic 3: Coming Soon & Cleanup

Mark incomplete or non-functional features honestly in the UI. Fix merge conflicts and dead code.

**MVP (ship in M23):**

| #   | Title                                     | Size | Description                                                                                                                                           |
| --- | ----------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Resolve merge conflict in CommandCard.tsx | S    | `CommandCard.tsx` has unresolved git merge markers from M21 — fix or discard.                                                                         |
| 14  | Audit and mark Coming Soon features       | M    | Identify UI surfaces that don't work end-to-end (e.g. GitHub features without backend, multi-provider beyond Azure). Add "Coming Soon" badge/overlay. |
| 15  | Remove dead code and unused imports       | S    | Clean up dead metricsService calls, unused components, stale feature flags.                                                                           |
| 16  | Pre-existing lint/type errors cleanup     | M    | Fix LSP errors in LearningPanel, ConfirmDialog, PromptDialog, API test files.                                                                         |

**Coming Soon (M24):**

- Full multi-provider support (AWS/GCP parity)
- Collaboration features (real-time editing)
- DevOps UX (Ops Control Center, Promote/Rollback)

## Dependencies

```
M22 (complete) → M23
Epic 1 (issues 1-6): Independent — pure frontend + docs
Epic 2 (issues 7-12): Sequential — runbook → apply → secrets → enable → deploy Plausible → verify
Epic 1 and Epic 2 are parallel-safe (no code conflicts)
```

## Branch Strategy

- Epic 1: `feat/m23-plausible-analytics`
- Epic 2: `infra/m23-azure-staging` (or individual branches per sub-issue)

## Exit Criteria

- [ ] Plausible adapter integrated — `window.plausible()` called on 5 key events
- [ ] metricsService dual-writes to localStorage + Plausible (graceful degradation)
- [ ] Plausible CE Docker Compose works locally
- [ ] Azure staging environment provisioned and healthy
- [ ] `deploy.yml` auto-deploys to staging on push to main
- [ ] Plausible CE running on Azure, receiving events from staging frontend
- [ ] Azure deploy guide and Plausible setup guide complete
- [ ] All tests passing, >= 90% branch coverage
- [ ] `pnpm build` + `pnpm lint` pass
- [ ] v0.23.0 release published

## Constraints

- Plausible CE is AGPL — self-hosting is free, no license cost
- Azure costs: staging tier uses Basic/Free SKUs (PostgreSQL B1ms, Redis Basic C0, SWA Free, Container App scale-to-zero) — estimated ~$30-50/month
- No user PII is sent to Plausible — only anonymous event names + properties
- English only for all docs, code, UI strings
