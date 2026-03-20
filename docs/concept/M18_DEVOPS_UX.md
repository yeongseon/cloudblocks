# Milestone 18 — DevOps UX

## Goal

Add operational control capabilities to CloudBlocks. Introduce an Ops Control Center, standardize deployment terminology, build environment promotion/rollback UX, and add a notification system. Transform CloudBlocks from "design and generate" into "design, deploy, and operate."

---

## Background

CloudBlocks currently supports architecture design and code generation (Terraform, Bicep, Pulumi). It has basic CI/CD pipeline support through GitHub Actions workflows (`ci.yml`, `deploy.yml`, `promote.yml`). But there is no in-app operational visibility — users must leave CloudBlocks to monitor deployments, check environment status, or manage promotions.

### Current State

- **Code generation**: Working (Terraform, Bicep, Pulumi output)
- **GitHub integration**: OAuth login, repo sync, PR creation
- **CI/CD workflows**: Three GitHub Actions workflows exist but are triggered outside CloudBlocks
- **Architecture diff**: M7 feature compares local vs GitHub architecture with visual overlays
- **No ops dashboard**: Users must use GitHub Actions UI, Azure Portal, or CLI to check deployment status
- **Inconsistent terminology**: "deploy," "promote," and "release" are used without clear definitions across docs and workflows

### Infrastructure Context

| Concern | Decision |
|---------|----------|
| Backend deployment target | Azure Container Apps (Consumption plan) |
| Frontend deployment target | Azure Static Web Apps |
| Environment names | `local`, `staging`, `production` (full names, no abbreviations) |
| Dev environment | Local only — no cloud deployment |
| CI/CD | GitHub Actions |
| Backend runtime | Docker-based |
| Cost visibility | Estimated costs must be shown before any deployment |

### Relationship to Existing Milestones

- **M10 (External Actors & DevOps UX)**: M10 focused on the minifigure/worker RTS interaction pattern (selectable DevOps character, build animations, CommandCard). M18 focuses on the operational control plane — deployment status, promotion, rollback. These are complementary, not overlapping.
- **M7 (Architecture Diff)**: M18 extends the diff feature to compare architecture across environments (what is deployed to staging vs production), not just local vs GitHub.
- **M13 (Terraform Pipeline)**: M18 builds on the validated code generation pipeline to add deployment orchestration and monitoring.

---

## Scope

### Area A: Ops Control Center

A dashboard within CloudBlocks showing deployment and environment status.

**Features**:
- Deployment status per environment (`local`, `staging`, `production`)
- Real-time pipeline status via GitHub Actions integration (workflow runs, job status)
- Environment health indicators (up / down / deploying / unknown)
- Architecture diff between environments — what version is deployed where, and how they differ
- Cost estimation panel — show estimated Azure costs before triggering a deployment
- Deployment history — log of past deployments per environment with timestamps and outcomes

**Key design decisions**:
- Polling vs webhooks for GitHub Actions status (webhooks preferred for real-time, polling as fallback)
- Cost estimation source: Azure Pricing API or static pricing tables with "estimated" labels
- Dashboard placement: dedicated panel/page within CloudBlocks, not a separate app

### Area B: Deploy Terminology Standardization

**Problem**: "deploy," "promote," "release," and "rollback" are used inconsistently across docs, UI, and workflows.

**Canonical vocabulary**:

| Term | Definition |
|------|-----------|
| **Deploy** | Push code/infrastructure to a specific environment. Triggered by CI/CD pipeline. |
| **Promote** | Move a tested version from `staging` to `production`. A controlled, deliberate action with pre-checks. |
| **Rollback** | Revert an environment to a previous known-good version. Emergency or planned recovery. |
| **Release** | Tag a version as a user-facing milestone. A labeling action, not a deployment action. |

**Work**:
- Update all documentation to use these terms consistently
- Rename workflow files and UI labels if they use incorrect terms
- Add a terminology section to the deployment guide

### Area C: Promote/Rollback UX

Visual promotion and rollback flows within CloudBlocks.

**Promote flow**:
1. User views staging environment in Ops Control Center
2. User clicks "Promote to Production"
3. Pre-promotion checklist displayed:
   - Tests passed on staging
   - Cost estimate reviewed
   - Architecture diff reviewed (staging vs current production)
4. User confirms promotion
5. GitHub Actions `promote.yml` workflow triggered
6. Real-time status shown in Ops Control Center
7. Promotion recorded in deployment history

**Rollback flow**:
1. User views production environment in Ops Control Center
2. User clicks "Rollback"
3. List of previous successful deployments shown
4. User selects target version
5. Confirmation dialog with diff (current vs target)
6. Rollback executed via workflow
7. Status tracked in real-time

**Promotion history**:
- Log of all promotions and rollbacks with timestamps, user, source version, target version, outcome

### Area D: Notification System

In-app notifications for deployment lifecycle events.

**Events**:
- Deployment started (environment, triggered by, version)
- Deployment succeeded (environment, duration)
- Deployment failed (environment, error summary)
- Promotion completed (staging version promoted to production)
- Rollback completed (environment, rolled back to version)

**Implementation**:
- In-app notification center (bell icon with unread count)
- Toast notifications for real-time events while user is active
- Notification history (filterable by environment, event type, date)
- Optional future extension: webhook integration for external services (Slack, Teams) — not in M18 scope, but the notification data model should support it

---

## User Stories

| # | Story |
|---|-------|
| 1 | As an architect, I want to see which version is deployed to each environment without leaving CloudBlocks |
| 2 | As an operator, I want to promote a staging-tested architecture to production with one click and pre-checks |
| 3 | As a team lead, I want to rollback production to the last known-good state when a deployment fails |
| 4 | As an architect, I want to see estimated Azure costs before triggering a deployment |
| 5 | As a developer, I want consistent deploy terminology so I do not confuse "promote" with "deploy" |
| 6 | As a user, I want to be notified when a deployment succeeds or fails without watching the pipeline |

---

## Epic Decomposition

### [Epic] Ops Control Center (Area A)

| # | Title | Size |
|---|-------|------|
| 1 | Design Ops Control Center layout and information architecture | M |
| 2 | Implement environment status dashboard (local/staging/production) | L |
| 3 | Integrate GitHub Actions API for real-time pipeline status | M |
| 4 | Build cross-environment architecture diff view | L |
| 5 | Add cost estimation panel with Azure pricing integration | M |
| 6 | Implement deployment history log | M |

### [Epic] Deploy Terminology Cleanup (Area B)

| # | Title | Size |
|---|-------|------|
| 1 | Define canonical deploy vocabulary and add to deployment guide | S |
| 2 | Audit and update all docs, workflows, and UI labels for terminology consistency | M |
| 3 | Rename workflow files if needed (deploy.yml, promote.yml naming review) | S |

### [Epic] Promote/Rollback UX (Area C)

| # | Title | Size |
|---|-------|------|
| 1 | Design promote flow with pre-promotion checklist | M |
| 2 | Implement promote UI: staging to production with confirmation | L |
| 3 | Design rollback flow with version selection | M |
| 4 | Implement rollback UI with diff preview | L |
| 5 | Build promotion/rollback history log | M |

### [Epic] Notification System (Area D)

| # | Title | Size |
|---|-------|------|
| 1 | Design notification data model and event taxonomy | M |
| 2 | Implement in-app notification center (bell icon, unread count) | M |
| 3 | Add toast notifications for real-time deployment events | M |
| 4 | Build notification history with filtering | M |

---

## Exit Criteria

- [ ] Ops Control Center shows real-time deployment status for `local`, `staging`, and `production` environments
- [ ] Deploy/promote/rollback terminology is consistent across all docs, workflows, and UI
- [ ] Promote flow works end-to-end: staging to production with pre-promotion checklist
- [ ] Rollback to a previous version works from Ops Control Center
- [ ] Cost estimation is displayed before deployment confirmation
- [ ] Notification system shows deployment lifecycle events in-app
- [ ] Deployment history log records all deploys, promotions, and rollbacks
- [ ] Cross-environment architecture diff is viewable in Ops Control Center

---

## Dependencies

- M17 complete (stable module structure required before adding new UI features and backend endpoints)
- GitHub Actions workflows operational (`ci.yml`, `deploy.yml`, `promote.yml`)
- Azure deployment target configured (Azure Container Apps + Azure Static Web Apps)

---

## Constraints

- Environment names use full names: `local`, `staging`, `production` — never abbreviations
- `local` (dev) is local only — no cloud deployment for this environment
- Cost estimation must be shown before any deployment to `staging` or `production`
- Backend must be Docker-based for deployment
- CI/CD through GitHub Actions — no custom deployment scripts
- Pre-1.0: no stability guarantees
- Always design/document first, then implement

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub Actions API rate limits affect real-time status | Dashboard shows stale data | Use webhooks as primary mechanism; polling at longer intervals as fallback |
| Azure cost estimation API does not cover all resource types | Inaccurate cost display | Use conservative estimates, label as "estimated," allow manual adjustment |
| Promote/rollback complexity varies by IaC tool (Terraform state vs Bicep) | Inconsistent behavior across generators | Start with Terraform-first approach; add Bicep/Pulumi support incrementally |
| Notification volume overwhelms users on active projects | Notification fatigue | Default to meaningful events only; allow per-event-type mute settings |
| Cross-environment diff requires deployed architecture snapshots | Data availability gap | Store architecture snapshot on each successful deployment |

---

## Estimated Effort

- **Area A** (Ops Control Center): ~2.5 weeks (largest area — dashboard, API integration, diff)
- **Area B** (Terminology): ~2–3 days (docs and naming review)
- **Area C** (Promote/Rollback): ~2 weeks (UI flows, workflow integration)
- **Area D** (Notifications): ~1.5 weeks
- **Total**: ~6–8 weeks
- Design documents and wireframes are produced first for each area before implementation begins
