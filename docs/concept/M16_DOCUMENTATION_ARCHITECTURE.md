# Milestone 16 — Documentation Architecture & Canonical Cleanup

## Goal

Restore documentation coherence across the CloudBlocks project. Establish clear canonical ownership, resolve runtime-vs-target architecture confusion, and verify code/document consistency after M15.

This milestone promotes Epic #356 from a standalone cleanup task to a full milestone, acknowledging that documentation architecture is a first-class engineering concern — not a side task to be done between feature milestones.

---

## Background

Documentation drift has accumulated across M1–M15. The docs currently mix:

- **Runtime architecture vs target architecture** — readers cannot tell what CloudBlocks _is_ today vs what it _intends to become_
- **Canonical vs superseded sources** — multiple documents claim authority over the same concern (e.g., validation contracts, design specs)
- **v1.x historical patterns vs v2.0 target specs** — onboarding and education flows reference structures that no longer exist
- **Inconsistent planning vocabulary** — "Milestone" and "Phase" are used interchangeably, making roadmap tracking ambiguous
- **No lifecycle policy** — merged documents have no rules for when to update, demote, or archive

Epic #356 ("Documentation Architecture and Canonical Source Cleanup") identified 12 sub-issues covering these problems. One sub-issue (#365) is already closed. Seven documentation PRs are open and awaiting review.

With M15 now complete and the v2.0 specification implemented, this is the right time to reconcile documentation with the actual codebase state before any further structural work (M17) or feature work.

---

## Scope

### Area A: Documentation Architecture Cleanup (Epic #356)

All 12 sub-issues from Epic #356. These restore a coherent documentation architecture by establishing clear layering:

| Layer | Purpose |
|-------|---------|
| System architecture | Current runtime topology, module boundaries, storage/auth/data flow |
| Domain model | Current canonical types and serialization ownership |
| Validation | One canonical contract for implemented rules and extension policy |
| Design specs | Explicit split between current main-branch behavior and target v2.0 spec |
| Guides/examples | Current usage conventions only; future paths labeled explicitly |
| Planning vocabulary | Milestone and Phase assigned clear, non-overlapping meanings |
| Lifecycle policy | Merged docs updated, demoted, or archived based on explicit rules |
| Archive/Historical | Execution plans, audits, and superseded refs removed from active guidance |

### Area B: Code/Document Consistency Verification

A systematic check that all canonical documents accurately reflect the codebase as of `main` branch post-M15. This goes beyond Epic #356's documentation-internal reconciliation to verify documentation-to-code alignment.

---

## Sub-Issues (Epic #356)

| # | Title | Size | Status |
|---|-------|------|--------|
| #346 | Refresh backend API and storage docs to match implemented route surface | M | Open |
| #347 | Fix docs navigation, project structure, and contributor setup references | M | Open |
| #348 | Align auth, security, and deployment docs with cookie-session implementation | M | Open |
| #349 | Normalize roadmap, version, and implementation-status markers across docs | L | Open |
| #350 | Reconcile canonical and superseded design spec declarations (v1.x/v2.0) | M | Open |
| #355 | Archive or retire time-bound and superseded docs from active surface | M | Open |
| #357 | Consolidate validation and rule-engine docs into one canonical contract | M | Open |
| #358 | Realign system, model, and storage architecture docs with actual runtime | L | Open |
| #364 | Reconcile Learning Mode spec with current domain model and scenarios | M | Open |
| #365 | Align templates, examples, and tutorial packaging docs | M | **Closed** (PR #367 merged) |
| #366 | Standardize Milestone vs Phase terminology across active docs | M | Open |
| #368 | Define lifecycle rules for already-merged documentation | M | Open |

---

## Wave Plan

### Wave 1 — Foundation (Set Conventions)

Establish the conventions and policies that all subsequent documentation work must follow.

| Issue | Title | Rationale |
|-------|-------|-----------|
| #349 | Normalize roadmap, version, and implementation-status markers | Defines how status markers work across all docs |
| #366 | Standardize Milestone vs Phase terminology | Establishes planning vocabulary before other docs reference it |
| #368 | Define lifecycle rules for merged documentation | Sets update/demote/archive policy before reconciliation begins |

**Output**: Documented conventions for status markers, planning terminology, and document lifecycle. All subsequent waves follow these conventions.

### Wave 2 — Reconciliation (Heavy Content Work)

Reconcile the major canonical documents with the codebase and with each other.

| Issue | Title | Rationale |
|-------|-------|-----------|
| #350 | Reconcile canonical vs superseded design spec declarations | Resolve v1.x/v2.0 authority conflicts |
| #358 | Realign system, model, and storage architecture docs with runtime | Largest single issue — ensures architecture docs match code |
| #357 | Consolidate validation/rule-engine docs into one canonical contract | Merge duplicate validation authority |
| #364 | Reconcile Learning Mode spec with current domain model | Align education content with actual domain |

**Output**: All major canonical documents reconciled. No conflicting authority claims remain.

### Wave 3 — Alignment & Archive

Align remaining supporting docs and archive superseded material.

| Issue | Title | Rationale |
|-------|-------|-----------|
| #346 | Refresh backend API and storage docs | Match docs to implemented API surface |
| #347 | Fix docs navigation, project structure, contributor setup | Update docs/README.md navigation and onboarding |
| #348 | Align auth/security/deployment docs with cookie-session | Reflect actual auth implementation |
| #355 | Archive/retire time-bound and superseded docs | Clean up active doc surface |

**Output**: All supporting docs accurate. Historical/superseded docs archived with clear labels.

**Note**: #365 (templates/examples alignment) is already closed via merged PR #367.

---

## New Sub-Issues (Code/Document Consistency)

These issues extend beyond Epic #356's scope to cover code-to-document alignment.

### New Issue 1: Post-M15 Code-Document Consistency Audit

Systematic verification that every canonical document matches the post-M15 codebase state. Scope includes:

- TypeScript types in `apps/web/src/shared/types/index.ts` vs DOMAIN_MODEL.md
- Validation rules in `apps/web/src/entities/validation/` vs VALIDATION_CONTRACT.md
- API routes in `apps/api/app/api/routes/` vs API_SPEC.md
- Design tokens in `apps/web/src/shared/tokens/designTokens.ts` vs BRICK_DESIGN_SPEC.md
- Rendering approach in code vs ARCHITECTURE.md and README.md

**Size**: L

### New Issue 2: README and docs/README.md Refresh

Update the project's entry points to reflect current state:

- Root README.md: update milestone status table, feature list, tech stack versions
- docs/README.md: update document index, add/remove entries for new/archived docs
- Verify all document links are valid (no broken references)

**Size**: M

### New Issue 3: Open PR Triage

Review, merge, or close the 7 open documentation PRs from Epic #356:

| PR | Title | Branch |
|----|-------|--------|
| #352 | Align auth/security/deployment docs | docs/auth-session-doc-alignment |
| #353 | Normalize roadmap/version/status markers | docs/status-version-normalization |
| #354 | Reconcile v1.x vs v2.0 spec declarations | docs/v1-v2-spec-taxonomy |
| #359 | Refresh backend API/storage docs | docs/backend-api-storage-sync |
| #361 | Archive superseded v1.x design specs | docs/archive-superseded-docs |
| #362 | Consolidate validation/rule-engine docs | docs/runtime-architecture-realignment |
| #363 | Realign architecture docs with runtime | docs/runtime-architecture-realignment-v2 |

For each PR: review against Wave 1 conventions, request changes or approve, merge or close with explanation.

**Size**: L (7 PRs to review)

---

## Exit Criteria

- [ ] All 12 Epic #356 sub-issues closed
- [ ] All 7 open documentation PRs resolved (merged or closed with documented reason)
- [ ] Zero documents with incorrect canonical/superseded status
- [ ] docs/README.md accurately reflects current project state with valid links
- [ ] Code-document consistency audit passes with no critical gaps
- [ ] Milestone vs Phase terminology standardized across all active docs
- [ ] Document lifecycle policy documented and applied to existing docs
- [ ] Root README.md feature list and milestone table match current state

---

## Dependencies

- M15 complete (v2.0 Specification Implementation) — done

---

## Constraints

- Do not hide current main-branch behavior in favor of target v2.0 design intent
- Do not keep multiple active documents claiming canonical ownership for the same concern
- If a document is retained for history, label it as historical and remove it from active source-of-truth navigation
- Preserve ADR history — prefer reclassification, cross-linking, and archiving over destructive deletion
- Do not introduce new architecture patterns — only document what currently exists
- Follow existing document ownership model: Canonical / Supporting / Historical

---

## Estimated Effort

- 11 remaining Epic #356 sub-issues: mostly size/M, two size/L
- 3 new code/doc consistency issues: 1 size/L, 1 size/M, 1 size/L
- 7 open PRs to triage
- **Total**: ~2–3 weeks of focused documentation work
- **Wave 1**: ~3–4 days
- **Wave 2**: ~5–7 days
- **Wave 3**: ~3–5 days
- **New issues + PR triage**: ~3–4 days (can overlap with Wave 3)
