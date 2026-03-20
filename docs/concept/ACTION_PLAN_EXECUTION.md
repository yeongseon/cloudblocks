# CloudBlocks Action Plan — Validation + Execution Plan (English)

**Date:** 2026-03-18  
**Owner:** CloudBlocks Core Team  
**Source Input:** User checklist (UX Core → DevOps UX → Brick System → Core Model → Provider → Terraform → AI)

---

## 1) Executive Validation

Your plan is directionally correct and product-focused: **"Concept → usable product"**.

It is also mostly aligned with the existing CloudBlocks architecture and roadmap, with one important adjustment:

- Several items in your checklist are already partially/completely implemented in recent milestones.
- The best approach is **not a fresh rewrite**, but a **gap-driven execution plan** with strict phases and exit criteria.

This document converts your checklist into:
1. **Validated scope** (what is already done vs missing)
2. **Milestones + phases**
3. **Execution order and acceptance gates**

---

## 2) Fit Check Against Existing Docs/Code

Validated against:
- `docs/concept/PRD.md`
- `docs/concept/ROADMAP.md`
- `docs/design/UI_IMPROVEMENT_GAP_ANALYSIS.md`
- `docs/design/CLOUDBLOCKS_SPEC_V2.md`
- `docs/design/MODULE_BOUNDARIES.md`

### 2.1 Already in progress / partially delivered

- Bottom-panel command model (selection → action pattern) is already present.
- Drag UX foundations exist (dragging/reposition + DragGhost path in prior phases).
- Connection mode + preview path exists.
- Brick silhouette/tier systems exist (partially as visual system foundations).
- Provider foundations exist (Azure-first + partial multi-provider structure).
- Terraform generation exists and is integrated.
- Templates and template gallery exist.

### 2.2 Still missing / needs hardening

- **Entry UX**: true first-screen guided start flow is still inconsistent.
- **Action model consistency**: command semantics need stronger context-locking rules.
- **Drag-to-create reliability**: drop validation/highlighting needs production-grade behavior and tests.
- **DevOps actor model**: clear command executor flow is not fully normalized.
- **Provider mode UX**: user-facing provider-mode behavior still incomplete.
- **Core model standardization**: block/provider/config schema hardening and migration policy needed.
- **AI roadmap**: needs staged technical prerequisites before feature promises.

---

## 3) Final Milestone Structure (Proposed)

## Milestone A — UX Core Hardening (Priority 1)

### Phase A1: Start Entry
- Empty canvas CTA
- `Create VNet`
- `Start from Template`
- `Create Subnet (public/private)`

**Exit Criteria**
- New users can create a valid starter architecture within 60 seconds without docs.

### Phase A2: Selection → Action Contract
- Standardize Command Panel semantics by selected entity type.
- Lock invalid actions by context (no ambiguous commands).

**Exit Criteria**
- 100% deterministic action matrix (VNet/Subnet/Resource).

### Phase A3: Drag & Drop + Connect Reliability
- Drag ghost + valid target highlight + invalid drop feedback.
- Connect mode target highlighting + preview + constraints.

**Exit Criteria**
- No orphan blocks, no invalid silent drops, no broken connection state.

### Phase A4: Interaction State Machine
- Finalize Zustand interaction states:
  - `idle`, `selecting`, `dragging`, `placing`, `connecting`

**Exit Criteria**
- Every interaction transition is explicit, test-covered, and reversible.

---

## Milestone B — External Actors + DevOps UX (Priority 2)

### Phase B1: Internet/External Actor Model
- Internet selectable/connectable/off-canvas placement refinement.
- Add `devops` external actor type.

### Phase B2: DevOps Command Experience
- Build/Connect/Deploy tabs
- Action catalog:
  - `create-vnet`, `create-subnet`, `deploy-vm`, `connect`, `generate-terraform`

### Phase B3: Execution Engine
- `executeDevOpsAction()` with auditable action result payload.

**Exit Criteria**
- DevOps actor can execute all P1 actions deterministically from UI state.

---

## Milestone C — Brick Design System Consolidation (Priority 3)

### Phase C1: Taxonomy Freeze
- `network`, `compute`, `data`, `messaging`, `security`, `edge`

### Phase C2: Shape/Size/Height Canonicalization
- Formal shape mapping by category.
- Container > Subnet > Resource size hierarchy.
- Height tiers (container low / data mid / compute high).

### Phase C3: Design Tokens + Visual QA
- Shape > Color > Label principle enforcement.

**Exit Criteria**
- Visual identity remains consistent across all resources/providers.

---

## Milestone D — Core Model + Provider System (Priority 4)

### Phase D1: Core Model Hardening
- Block schema formalization:
  - `id`, `category`, `subtype`, `provider`, `config`
- Connection model hardening.

### Phase D2: Provider Modes
- Neutral / Azure / AWS / GCP mode contracts.
- Palette mapping and provider extension policy.

### Phase D3: Adapter Contract
- Provider adapter interface and validation contract.

**Exit Criteria**
- Same architecture model can be compiled under provider mode with deterministic differences.

---

## Milestone E — Terraform Pipeline Productization (Priority 5)

### Phase E1: Mapping Accuracy
- Block→Terraform mapping completeness matrix.

### Phase E2: Generator Reliability
- `architecture.json` → tf conversion hardened.

### Phase E3: Output Workflow
- Preview / Export / GitHub PR in one stable flow.

**Exit Criteria**
- Generated Terraform validates for all reference templates.

---

## Milestone F — AI Roadmap (Priority 6)

### Phase F1: AI Architecture Drafting
### Phase F2: AI Validation Assistant
### Phase F3: Cost Optimization Suggestions
### Phase F4: Recommendation Engine

**Note:** AI work starts only after Milestones A–E pass release gates.

---

## 4) OSS/Private Repo Split (Validated)

### OSS (keep)
- `cloudblocks-core`
- `cloudblocks-ui`
- `cloudblocks-provider`

### Private (later)
- `cloudblocks-ai`
- `cloudblocks-devops`
- `cloudblocks-cloud`

**Decision:** keep monorepo until Milestone D stable, then split by bounded context.

---

## 5) Non-Negotiable Product Rules (English)

1. **Select → Action** (no floating global action ambiguity)
2. **Drag → Feedback → Drop** (no blind placement)
3. **Context-aware UI only**
4. **Shape > Color > Label** visual hierarchy

### Explicit "Do Not Do"
- Do not show all resources all the time.
- Do not allow drag without feedback.
- Do not represent Internet as a normal internal resource.
- Do not expose provider mode as top-level clutter before context selection.
- Do not regress into text-first UX.

---

## 6) Execution Order (Short)

1. **A (UX Core Hardening)**
2. **B (External + DevOps UX)**
3. **C (Brick System Consolidation)**
4. **D (Core Model + Provider Modes)**
5. **E (Terraform Productization)**
6. **F (AI)**

---

## 7) Delivery Governance

For each phase:
- Issue breakdown (small, testable tasks)
- One PR per issue
- Required checks:
  - Lint
  - Typecheck/build
  - Targeted tests
  - Regression tests for touched domain

Definition of Done:
- Feature works in UI
- Model invariant preserved
- Tests and docs updated
- No hidden behavior changes

---

## 8) Immediate Next Actions (recommended)

1. Create milestone labels:
   - `M-A-ux-core`
   - `M-B-devops-ux`
   - `M-C-brick-system`
   - `M-D-core-provider`
   - `M-E-terraform`
   - `M-F-ai`

2. Open execution epics for Milestone A (A1~A4).
3. Start with A1 + A2 in parallel, then A3, then A4.

---

## Final Statement

Your checklist is strategically correct.
The highest leverage is to execute it as a **gap-driven, phase-gated program** instead of restarting architecture from scratch.

CloudBlocks should now move as:

**Usable UX foundation → deterministic model/provider contracts → reliable code generation → AI assistance.**
