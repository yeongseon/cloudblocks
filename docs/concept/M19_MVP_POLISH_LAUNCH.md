# Milestone 19 — MVP Polish & Launch

## Goal

Deliver a promotion-ready MVP that is stable in production, easy to demo, and measurable after launch. M19 focuses on launch quality, deployment operations, IaC abstraction, and multi-persona positioning rather than major new feature expansion.

---

## Background

CloudBlocks already provides core visual architecture design, validation, and IaC generation. However, launch readiness still depends on product polish, deployment reliability, operational visibility, and a clear product identity that resonates across different user personas.

### Why this milestone now

- M17 and M18 establish product structure and operational UX foundations.
- User feedback highlighted launch-risk UX issues (menu clutter, external actor clarity, interaction reliability).
- A public launch requires reproducible deployment, runtime configuration discipline, and error visibility.
- Starting with Terraform was a good strategic choice — but the UI should not expose IaC tool names to non-DevOps users.
- CloudBlocks must position itself as "Cloud Architecture Tool for Everyone" — not just a Terraform GUI.

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

### Area G: IaC Abstraction

Hide infrastructure-as-code implementation details (Terraform, Bicep, Pulumi) behind a provider-agnostic "Deploy Infrastructure" abstraction in the UI. The generation pipeline and provider definitions remain intact internally — only user-facing labels and interaction flows change.

- Replace "Generate Terraform" menu entry with "Deploy Infrastructure" or neutral equivalent
- Replace generator-specific labels in CodePreview (dropdown, button, metadata) with abstract descriptions
- Keep generator selection available in an "Advanced" or "Expert" toggle for DevOps users
- Ensure architecture diff remains IaC-independent (already the case — `computeArchitectureDiff` operates on `ArchitectureModel`)
- Emphasize the ProviderDefinition abstraction as core intellectual property — the adapter layer that maps visual architecture to any IaC backend

### Area H: Multi-Persona Positioning

Position CloudBlocks as a "Cloud Architecture Tool for Everyone" by tailoring the experience to four distinct user personas. Each persona has a different relationship with the tool:

| Persona           | Relationship                                               | Key Feature Focus                                        |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| DevOps Engineer   | Execute — deploy and manage infrastructure                 | Full pipeline access, IaC output, diff, promote/rollback |
| Backend Developer | Use — design architectures without IaC expertise           | Visual builder, validation, abstracted deployment        |
| Product Manager   | Understand — review and communicate architecture decisions | Read-only views, architecture diagrams, cost estimation  |
| Student / Learner | Learn — understand cloud architecture patterns             | Learning mode, guided scenarios, progressive complexity  |

- Add persona-aware onboarding that asks "What describes you best?" and adjusts initial UI complexity
- Show/hide advanced features (generator selection, raw IaC output, diff details) based on persona
- Ensure Learning Mode (already built) is prominently accessible for Student persona
- Simplify the default view for PM and Backend personas — hide deployment operations, show architecture overview

---

## Additional Launch Requirements

- **Demo resilience mode**: fallback local demo path when backend-dependent features are unavailable
- **Security hygiene**: environment variable leakage checks and OAuth callback integrity checks
- **Analytics funnel**: track at least `landing_visit`, `canvas_first_action`, `deploy_infrastructure`, `export_action`

---

## Epic Decomposition

### [Epic] M19 Launch UX Polish

| #   | Title                                                       | Size |
| --- | ----------------------------------------------------------- | ---- |
| 1   | Add first-run onboarding overlay and quick-start guidance   | M    |
| 2   | Add one-click demo scenario loader                          | M    |
| 3   | Improve landing copy, CTA flow, and launch-facing messaging | S    |

### [Epic] M19 Deployment Pipeline

| #   | Title                                                      | Size |
| --- | ---------------------------------------------------------- | ---- |
| 1   | Add preview deployment workflow and environment separation | M    |
| 2   | Add tag-gated production deployment workflow for `v0.19.0` | M    |
| 3   | Add rollback runbook and failure response checklist        | S    |

### [Epic] M19 Runtime Configuration

| #   | Title                                                           | Size |
| --- | --------------------------------------------------------------- | ---- |
| 1   | Standardize environment variable schema and `.env.example`      | S    |
| 2   | Validate OAuth callback and API endpoint mapping by environment | M    |

### [Epic] M19 Observability & Error Tracking

| #   | Title                                            | Size |
| --- | ------------------------------------------------ | ---- |
| 1   | Integrate frontend runtime error tracking        | M    |
| 2   | Add minimal launch metrics and health monitoring | M    |

### [Epic] M19 Performance & Stability Gate

| #   | Title                                               | Size |
| --- | --------------------------------------------------- | ---- |
| 1   | Add bundle-size budget guard in CI                  | S    |
| 2   | Add Lighthouse/Web Vitals threshold checks          | M    |
| 3   | Add browser/viewport compatibility launch checklist | S    |

### [Epic] M19 Release Ops

| #   | Title                                                      | Size |
| --- | ---------------------------------------------------------- | ---- |
| 1   | Add `v0.19.0` release checklist and launch runbook         | S    |
| 2   | Standardize changelog template for launch notes            | S    |
| 3   | Prepare launch packet artifacts and known limitations list | S    |

### [Epic] M19 IaC Abstraction

| #   | Title                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | Replace generator-specific UI labels with neutral "Deploy Infrastructure" terminology | M    |
| 2   | Add Advanced/Expert toggle for generator selection in CodePreview                     | S    |
| 3   | Update MenuBar Build menu to use abstracted action label                              | S    |
| 4   | Document ProviderDefinition as the canonical provider abstraction layer               | S    |

### [Epic] M19 Multi-Persona Positioning

| #   | Title                                                                     | Size |
| --- | ------------------------------------------------------------------------- | ---- |
| 1   | Add persona selection to first-run onboarding flow                        | M    |
| 2   | Implement persona-based UI complexity levels (beginner/standard/advanced) | L    |
| 3   | Adjust default panel visibility and feature access per persona            | M    |
| 4   | Promote Learning Mode as primary entry point for Student persona          | S    |

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
- [ ] UI does not expose IaC tool names (Terraform, Bicep, Pulumi) in default view
- [ ] Advanced/Expert toggle allows DevOps users to access generator selection
- [ ] Persona selection is available in onboarding and adjusts UI complexity
- [ ] All four personas (DevOps, Backend, PM, Student) have appropriate default views

---

## Dependencies

- M17 complete (product structure and menu/UX baseline)
- M18 complete (ops UX baseline)
- Existing CI workflows operational and green

---

## Version Target

- Milestone 19 release target: `v0.19.0`
