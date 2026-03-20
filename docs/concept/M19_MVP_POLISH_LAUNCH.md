# Milestone 19 — MVP Polish & Launch

## Goal

Deliver a promotion-ready MVP that is stable in production, easy to demo, and measurable after launch. M19 focuses on launch quality and deployment operations rather than major new feature expansion.

---

## Background

CloudBlocks already provides core visual architecture design, validation, and IaC generation. However, launch readiness still depends on product polish, deployment reliability, and operational visibility.

### Why this milestone now

- M17 and M18 establish product structure and operational UX foundations.
- User feedback highlighted launch-risk UX issues (menu clutter, external actor clarity, interaction reliability).
- A public launch requires reproducible deployment, runtime configuration discipline, and error visibility.

---

## Scope

### Area A: Launch UX Polish

- First-run onboarding for new users
- One-click demo scenario loading for fast product understanding
- Clear landing copy and CTA flow for "build -> validate -> generate"

### Area B: Deployment Pipeline Hardening

- Preview and production deployment path separation
- Tag-gated production deployment for `v0.19.0`
- Rollback runbook for failed deployments

### Area C: Runtime Configuration

- Standardized `.env.example` with required vs optional variables
- Environment-specific endpoint and OAuth callback alignment
- Configuration validation for preview/production parity

### Area D: Observability and Error Tracking

- Frontend runtime error tracking integration
- Basic health and usage event metrics for launch feedback
- Minimal incident triage path for production issues

### Area E: Performance and Stability Gates

- Bundle size budget in CI
- Lighthouse/Web Vitals thresholds for release readiness
- Browser and viewport compatibility checks (desktop/tablet/mobile)

### Area F: Release Operations

- `v0.19.0` release checklist and launch runbook
- Changelog structure for user-facing release communication
- Launch packet (URL, GIF, 3-line intro, known limitations)

---

## Additional Launch Requirements

- **Demo resilience mode**: fallback local demo path when backend-dependent features are unavailable
- **Security hygiene**: environment variable leakage checks and OAuth callback integrity checks
- **Analytics funnel**: track at least `landing_visit`, `canvas_first_action`, `terraform_generate`, `export_action`

---

## Epic Decomposition

### [Epic] M19 Launch UX Polish

| # | Title | Size |
|---|-------|------|
| 1 | Add first-run onboarding overlay and quick-start guidance | M |
| 2 | Add one-click demo scenario loader | M |
| 3 | Improve landing copy, CTA flow, and launch-facing messaging | S |

### [Epic] M19 Deployment Pipeline

| # | Title | Size |
|---|-------|------|
| 1 | Add preview deployment workflow and environment separation | M |
| 2 | Add tag-gated production deployment workflow for `v0.19.0` | M |
| 3 | Add rollback runbook and failure response checklist | S |

### [Epic] M19 Runtime Configuration

| # | Title | Size |
|---|-------|------|
| 1 | Standardize environment variable schema and `.env.example` | S |
| 2 | Validate OAuth callback and API endpoint mapping by environment | M |

### [Epic] M19 Observability & Error Tracking

| # | Title | Size |
|---|-------|------|
| 1 | Integrate frontend runtime error tracking | M |
| 2 | Add minimal launch metrics and health monitoring | M |

### [Epic] M19 Performance & Stability Gate

| # | Title | Size |
|---|-------|------|
| 1 | Add bundle-size budget guard in CI | S |
| 2 | Add Lighthouse/Web Vitals threshold checks | M |
| 3 | Add browser/viewport compatibility launch checklist | S |

### [Epic] M19 Release Ops

| # | Title | Size |
|---|-------|------|
| 1 | Add `v0.19.0` release checklist and launch runbook | S |
| 2 | Standardize changelog template for launch notes | S |
| 3 | Prepare launch packet artifacts and known limitations list | S |

---

## Exit Criteria

- [ ] Onboarding and one-click demo flow work on production URL
- [ ] Preview and production deployments are separated and reproducible
- [ ] Production deploy is tag-gated and documented for `v0.19.0`
- [ ] Runtime configuration is validated for all release environments
- [ ] Runtime errors are captured and triage path is documented
- [ ] Launch metrics funnel is available for post-promotion analysis
- [ ] Performance gates pass defined threshold checks
- [ ] Browser/viewport compatibility checklist is complete
- [ ] Release checklist, changelog, and launch packet are ready

---

## Dependencies

- M17 complete (product structure and menu/UX baseline)
- M18 complete (ops UX baseline)
- Existing CI workflows operational and green

---

## Version Target

- Milestone 19 release target: `v0.19.0`
