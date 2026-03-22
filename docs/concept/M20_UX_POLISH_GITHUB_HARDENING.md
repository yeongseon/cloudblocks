# Milestone 20 — UX Polish & GitHub Hardening

> **Status**: Planning  
> **Target version**: v0.20.0  
> **Predecessor**: Milestone 19 (v0.19.2) ✅  
> **Goal**: Final milestone before community launch. Redesign panel roles, fix all GitHub integration bugs, introduce multi-persona UX, build launch infrastructure, harden demo experience, modernize content, and achieve full test coverage.

---

## Issue Inventory

### Completed (Phase 1 — Panel Redesign)

| # | Title | Size | Status |
|---|-------|------|--------|
| #1112 | [Epic] Panel Role Redesign | — | ✅ Closed |
| #1113 | Resource Guide: workspace dashboard | S | ✅ Closed |
| #1114 | Resource Guide: enriched view | M | ✅ Closed |
| #1115 | Command Panel: Connection editing | M | ✅ Closed |
| #1116 | Onboarding tour: panel descriptions | S | ✅ Closed |
| #1117 | Command Panel: read-only properties | M | ✅ Closed |
| #1118 | Rename Inspector → Resource Guide | S | ✅ Closed |

**Subtotal**: 7 closed

### Open Issues by Phase

#### Phase 0 — Prerequisite (1 issue)

| # | Title | Size | Labels | Depends On |
|---|-------|------|--------|------------|
| #886 | Move CodePreview provider-change resets out of render-time state updates | M | bug, frontend | None |

> **Critical path**: #886 is root cause for #872, #873, #876. Must fix before GitHub Compare subgroup.

#### Phase 2 — GitHub Hardening (18 issues)

**Auth subgroup** (parallel-safe, no cross-dependencies):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #836 | Preserve intended GitHub action across OAuth redirect | M | None |
| #838 | Keep GitHubLogin open when sign-out fails | S | None |
| #867 | Route auth failures back into login flow | M | None |

**Repos subgroup** (parallel-safe):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #840 | Don't hide successful repo creation on refresh failure | S | None |
| #841 | Continue from creation into repository-link flow | M | #840 |
| #883 | Keep defaulting new repos to private after create | S | None |

**PR subgroup** (sequential within group):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #842 | Block PR submission when head=base branch | S | None |
| #843 | Preflight branch-name collisions | M | None |
| #857 | Confirm before closing PR with unsaved edits | S | None |
| #876 | Prefill PR body from compare review | M | #886 (Phase 0) |

**Sync subgroup** (parallel-safe):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #854 | Show dirty indicator since last sync | M | None |
| #858 | Handle panel closure during in-flight operations | M | None |
| #864 | Post-pull diff summary and undo action | M | None |

**Compare subgroup** (sequential, depends on Phase 0):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #872 | Don't overwrite custom regions on provider change | M | #886 |
| #873 | Don't discard compare results on provider tab change | M | #886 |
| #846 | Make compare mode read-only | M | #872, #873 |
| #847 | Warn before lifecycle actions discard compare review | M | #872, #873 |

**Test** (after all bug fixes):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1131 | Integration test coverage for GitHub panel flows | M | All Phase 2 bugs closed |

#### Phase 3 — Multi-Persona (10 issues)

**Step 3a — IaC Abstraction** (parallel with Phase 2):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1077 | Replace generator labels with "Deploy Infrastructure" | M | None |
| #1078 | Add Advanced/Expert toggle in CodePreview | S | None |
| #1079 | Document ProviderDefinition as canonical abstraction | S | None |
| #1080 | Update MenuBar Build menu to abstracted label | S | None |

**Step 3b — Persona System** (depends on Phase 1 complete):

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1082 | Persona selection in first-run onboarding | M | Phase 1 ✅ |
| #1083 | Persona-based UI complexity levels | L | Phase 1 ✅ |
| #1084 | Panel visibility per persona | M | #1083 |
| #1085 | Learning Mode primary entry for Student persona | S | #1083 |

**Step 3c — Documentation**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1132 | Document panel role and visibility rules | S | #1083, #1084 |

#### Phase 4 — Infrastructure & Launch Prep (22 issues)

**Epic #456 — Launch UX Polish**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #462 | First-run onboarding overlay | M | None |
| #463 | One-click demo scenario loader | M | None |
| #464 | Launch landing copy and CTA flow | S | None |

**Epic #457 — Deployment Pipeline**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #465 | Preview deployment workflow | M | None |
| #466 | Tag-gated production deployment | M | #465 |
| #467 | Rollback runbook | S | #466 |

**Epic #458 — Runtime Configuration**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #468 | Standardize .env schema | S | None |
| #469 | Validate OAuth callback by environment | M | #468 |

**Epic #459 — Observability**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #470 | Frontend error tracking | M | None |
| #471 | Launch funnel metrics | M | #470 |

**Epic #460 — Performance Gate**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #472 | CI bundle-size budget gate | S | None |
| #473 | Lighthouse/Web Vitals threshold checks | M | None |
| #474 | Browser/viewport compatibility checklist | S | None |

**Epic #461 — Release Ops**:

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #475 | Changelog template | S | None |
| #476 | Release checklist and launch runbook | S | None |
| #477 | Launch packet assets | S | None |

#### Phase 5 — Demo Hardening (4 issues)

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1137 | Consolidate block selection controls into unified property panel | M | None |
| #1138 | AI features: graceful fallback when backend unavailable | S | None |
| #1139 | Ops features: disable or stub when backend unavailable | S | None |
| #411 | Fix remaining demo blockers (if any) | S | None |
#### Phase 6 — Content Modernization (5 issues)

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1140 | Migrate templates to canonical 7-category vocabulary | M | None |
| #1141 | Migrate learning scenarios to canonical vocabulary | M | None |
| #1142 | Remove LEGACY_CATEGORY_MAP runtime conversion | S | #1140, #1141 |
| #1143 | Codegen: honest Azure-only output (remove placeholder AWS/GCP) | M | None |
| #1144 | Update example architectures to canonical model | S | #1140 |
#### Phase 7 — Validation & Test Coverage (7 issues)

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1145 | Fix placement multi-parent bug (allowedParents[0] only) | M | None |
| #1146 | Add domainSlice.ts unit tests (726 lines, 0 tests) | L | None |
| #1147 | Add workspaceSlice.ts unit tests | M | None |
| #1148 | Add provider adapter tests (Azure/AWS/GCP) | M | None |
| #1149 | Add AI API client tests | M | None |
| #1150 | Review vitest coverage exclusions post-M19 | S | None |
| #1151 | Audit eslint-disable comments (5 total) | S | None |
#### Phase 8 — Network Resource Gaps (3 issues, Oracle-recommended)

| # | Title | Size | Depends On |
|---|-------|------|------------|
| #1152 | Separate NSG from Firewall in RESOURCE_RULES (new `network_security_group` type) | M | None |
| #1153 | Wire NAT Gateway UI to existing `outbound_access` RESOURCE_RULES entry | M | None |
| #1154 | Implicit PIP/NIC generation in codegen (auto-attach to VM/LB/Firewall) | M | Codegen knowledge |
---

## Dependency Graph

```
Phase 0: #886 (CodePreview state fix)
    │
    ├──→ Phase 2 Compare: #872, #873 → #846, #847
    │         └──→ #876 (PR prefill from compare)
    │
    ├── Phase 2 Auth: #836, #838, #867 (parallel, no deps)
    ├── Phase 2 Repos: #840 → #841, #883 (parallel)
    ├── Phase 2 PR: #842, #843, #857 (parallel)
    ├── Phase 2 Sync: #854, #858, #864 (parallel)
    │         └──→ #1131 (integration tests, after ALL Phase 2 bugs)
    │
Phase 1: ✅ DONE (#1112-#1118)
    │
    ├──→ Phase 3b: #1082, #1083 → #1084, #1085
    │         └──→ #1132 (panel role docs)
    │
    ├── Phase 3a: #1077, #1078, #1079, #1080 (parallel, no deps)
    │
Phase 4: Infrastructure (22 issues, mostly parallel)
    ├── #456: #462, #463, #464
    ├── #457: #465 → #466 → #467
    ├── #458: #468 → #469
    ├── #459: #470 → #471
    ├── #460: #472, #473, #474
    └── #461: #475, #476, #477

Phase 5: Demo Hardening (#1137, #1138, #1139, #411 — parallel)
Phase 6: Content Modernization (#1140, #1141 → #1142; #1143, #1144 — template→legacy removal)
Phase 7: Test Coverage (#1145-#1151 — mostly parallel)
Phase 8: Network Gaps (#1152, #1153, #1154 — parallel)

### Critical Path

```
#886 → #872/#873 → #846/#847 → #876 → #1131 (tests)
```

This is the longest sequential chain (~5 issues). Everything else can run in parallel.

---

## Summary

| Phase | Issues | Open | Closed | Effort Est. |
|-------|--------|------|--------|-------------|
| 0 — Prerequisite | 1 | 1 | 0 | 1h |
| 1 — Panel Redesign | 7 | 0 | 7 | ✅ Done |
| 2 — GitHub Hardening | 18 | 18 | 0 | 4-6h |
| 3 — Multi-Persona | 10 | 10 | 0 | 3-4h |
| 4 — Infrastructure | 22 | 22 | 0 | 4-6h |
| 5 — Demo Hardening | 4 | 4 | 0 | 1-2h |
| 6 — Content Modernization | 5 | 5 | 0 | 2-3h |
| 7 — Test Coverage | 7 | 7 | 0 | 3-4h |
| 8 — Network Gaps | 3 | 3 | 0 | 2-3h |
| **Total** | **77** | **70** | **7** | **~20-28h** |

> **Parallel execution with 2 OpenCode instances**: estimated ~12-16h wall-clock time.
