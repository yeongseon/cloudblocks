# Validation Rule Ownership — Frontend vs Backend

> Issue: #430 · Epic: #418 (Backend Role & API Contract) · Milestone 17

## Status

**Proposed** — Pending review.

---

## 1. Problem Statement

Validation logic is duplicated between the frontend (`apps/web/src/entities/validation/`) and the backend (`apps/api/app/engines/`), with no documented ownership decision. The existing `VALIDATION_CONTRACT.md` states "Backend: Not yet implemented" — but the backend now has two validation modules (`validation.py` and `rule_engine.py`) that implement overlapping rules with **different rule IDs, different adjacency tables, and different rule scopes**.

This document:
1. Audits every validation rule in both layers.
2. Identifies discrepancies between implementations.
3. Classifies each rule's ownership (frontend-only, backend-only, or shared).
4. Defines the canonical rule source and synchronization strategy.

---

## 2. Current State Audit

### 2.1 Frontend Validation Files

| File | Purpose |
|------|---------|
| `entities/validation/engine.ts` | Orchestrator — runs all rule passes, produces `ValidationResult` |
| `entities/validation/placement.ts` | Category-based placement rules + v2.0 layer/grid/overlap rules |
| `entities/validation/connection.ts` | Connection adjacency rules + visual style constants |
| `entities/validation/aggregation.ts` | Aggregation count validation |
| `entities/validation/role.ts` | Role validity and duplicate detection |
| `entities/validation/providerValidation.ts` | Provider-specific advisory warnings |

### 2.2 Backend Validation Files

| File | Purpose |
|------|---------|
| `engines/rule_engine.py` | Semantic rule engine — produces structured `ValidationResult` with rule IDs |
| `engines/validation.py` | Structural validator (`ArchitectureValidator`) — top-level shape/type checks |
| `engines/prompts/architecture_prompt.py` | Canonical domain enums: `BLOCK_CATEGORIES`, `CONNECTION_TYPES`, `PROVIDER_TYPES`, `LAYER_TYPES`, `SUBTYPE_REGISTRY` |
| `api/routes/github.py` | Pydantic `ArchitecturePayload` + `@field_validator` for request-boundary validation |
| `core/config.py` | `Settings` model validator for secret-strength checks |

---

## 3. Complete Rule Inventory

### 3.1 Placement Rules

| Rule ID (Contract) | Frontend | Backend | Discrepancy |
|---------------------|----------|---------|-------------|
| `rule-plate-exists` | ✅ `placement.ts` | ✅ `rule_engine.py` | None — identical semantics |
| `rule-compute-subnet` | ✅ `placement.ts` | ✅ `rule_engine.py` | None |
| `rule-db-private` | ✅ `placement.ts` | ✅ `rule_engine.py` | None |
| `rule-gw-public` | ✅ `placement.ts` | ✅ `rule_engine.py` | None |
| `rule-storage-subnet` | ✅ `placement.ts` | ✅ `rule_engine.py` | None |
| `rule-analytics-subnet` | ✅ FE uses `rule-analytics-subnet` | ❌ BE uses `rule-analytics-region` | **ID mismatch + semantic difference** |
| `rule-identity-subnet` | ✅ FE uses `rule-identity-subnet` | ❌ BE uses `rule-identity-region` | **ID mismatch + semantic difference** |
| `rule-observability-subnet` | ✅ FE uses `rule-observability-subnet` | ❌ BE uses `rule-observability-region` | **ID mismatch + semantic difference** |
| `rule-serverless-network` | ✅ FE uses single ID for function/queue/event | ❌ BE uses `rule-function-region`, `rule-queue-region`, `rule-event-region` | **ID mismatch: 1 vs 3 IDs** |

#### Discrepancy D1: Analytics/Identity/Observability Placement

- **Frontend**: Requires these categories on a `subnet` plate (e.g., `rule-analytics-subnet`).
- **Backend**: Requires these categories NOT on a `subnet` plate (e.g., `rule-analytics-region`).
- **VALIDATION_CONTRACT.md**: Sides with the frontend (`rule-analytics-subnet`, etc.) — analytics/identity/observability on subnet.
- **Resolution**: The contract is authoritative. The backend `managed_rules` incorrectly classifies these three categories as managed services. **Backend must be fixed** to match the contract.

#### Discrepancy D2: Serverless Rule IDs

- **Frontend**: Single `rule-serverless-network` for function/queue/event.
- **Backend**: Three separate IDs (`rule-function-region`, `rule-queue-region`, `rule-event-region`).
- **Resolution**: The contract uses `rule-serverless-network`. Backend should adopt the contract's single ID for consistency, OR the contract should be updated to use per-category IDs for better diagnostics. **Recommendation**: Keep backend's per-category IDs and update the contract — finer granularity is better for diagnostics.

### 3.2 Connection Rules

| Rule ID (Contract) | Frontend | Backend | Discrepancy |
|---------------------|----------|---------|-------------|
| `rule-conn-source` | ✅ `connection.ts` | ❌ BE uses `rule-conn-endpoint` | **ID mismatch** |
| `rule-conn-target` | ✅ `connection.ts` | ❌ BE uses `rule-conn-endpoint` | **ID mismatch** |
| `rule-conn-self` | ✅ `connection.ts` | ✅ `rule_engine.py` | None |
| `rule-conn-invalid` | ✅ `connection.ts` | ✅ `rule_engine.py` | **Adjacency table mismatch** |

#### Discrepancy D3: Connection Endpoint Rule IDs

- **Frontend**: Separate `rule-conn-source` and `rule-conn-target` — identifies which endpoint is missing.
- **Backend**: Single `rule-conn-endpoint` — cannot tell which endpoint is missing.
- **Resolution**: Frontend's approach is better for diagnostics. **Backend should split into two IDs** to match the contract.

#### Discrepancy D4: Connection Adjacency Table

| Source | Frontend Targets | Backend Targets | Difference |
|--------|-----------------|-----------------|------------|
| `compute` | `database`, `storage`, `analytics`, `identity`, `observability` | `database`, `storage` | **BE missing 3 targets** |
| All others | Identical | Identical | — |

- **VALIDATION_CONTRACT.md**: Matches the frontend (compute → database, storage, analytics, identity, observability).
- **Resolution**: **Backend must be fixed** to add analytics, identity, observability as allowed targets for compute.

### 3.3 Aggregation Rules

| Rule ID | Frontend | Backend | Discrepancy |
|---------|----------|---------|-------------|
| `rule-aggregation-count` | ✅ `aggregation.ts` | ❌ Not implemented | Backend missing |

### 3.4 Role Rules

| Rule ID | Frontend | Backend | Discrepancy |
|---------|----------|---------|-------------|
| `rule-role-invalid` | ✅ `role.ts` | ❌ Not implemented | Backend missing |
| `rule-role-duplicate` | ✅ `role.ts` (warning) | ❌ Not implemented | Backend missing |

### 3.5 Provider Advisory Rules

| Rule ID | Frontend | Backend | Discrepancy |
|---------|----------|---------|-------------|
| `rule-provider-aws-lambda-subnet` | ✅ `providerValidation.ts` (warning) | ❌ Not implemented | Frontend-only advisory |
| `rule-provider-gcp-sql-public` | ✅ `providerValidation.ts` (warning) | ❌ Not implemented | Frontend-only advisory |
| `rule-provider-unknown-subtype` | ✅ `providerValidation.ts` (warning) | ❌ Partial (via `ArchitectureValidator`) | Different approach |

### 3.6 v2.0 Layer/Layout Rules

| Rule ID | Frontend | Backend | Discrepancy |
|---------|----------|---------|-------------|
| `rule-layer-hierarchy` | ✅ `placement.ts` (not wired to engine) | ❌ Not implemented | Not yet active |
| `rule-grid-alignment` | ✅ `placement.ts` (not wired to engine) | ❌ Not implemented | Frontend-only (UX) |
| `rule-no-overlap` | ✅ `placement.ts` (not wired to engine) | ❌ Not implemented | Frontend-only (UX) |

### 3.7 Backend-Only Validation

| Check | Location | Purpose |
|-------|----------|---------|
| Top-level shape (plates/blocks/connections arrays) | `ArchitectureValidator`, `github.py` Pydantic | Request-boundary structural validation |
| Per-item type checks (valid category, provider, connection type) | `ArchitectureValidator` | Enum/type validation against domain constants |
| Duplicate ID detection | `ArchitectureValidator._check_duplicate_ids` | Data integrity |
| Subtype registry validation | `ArchitectureValidator` | Provider-specific subtype validation |
| Secret strength validation | `core/config.py` | Startup config validation |

---

## 4. Ownership Classification

### 4.1 Classification Criteria

| Classification | Criteria |
|----------------|----------|
| **Shared** | Rule enforces a domain invariant. Must be checked in both layers: frontend for UX (real-time feedback), backend for security (untrusted input). |
| **Frontend-only** | Rule is purely UX/layout — visual feedback, layout guidance, interactive editing aid. No security implication if skipped. |
| **Backend-only** | Rule protects data integrity at the API boundary. Not meaningful in the visual editor context. |

### 4.2 Classification Table

| Rule ID | Classification | Rationale |
|---------|---------------|-----------|
| `rule-plate-exists` | **Shared** | Domain invariant — blocks must have valid placement |
| `rule-compute-subnet` | **Shared** | Domain invariant — affects code generation correctness |
| `rule-db-private` | **Shared** | Domain invariant — security constraint |
| `rule-gw-public` | **Shared** | Domain invariant — networking constraint |
| `rule-storage-subnet` | **Shared** | Domain invariant — placement constraint |
| `rule-analytics-subnet` | **Shared** | Domain invariant — placement constraint |
| `rule-identity-subnet` | **Shared** | Domain invariant — placement constraint |
| `rule-observability-subnet` | **Shared** | Domain invariant — placement constraint |
| `rule-serverless-network` | **Shared** | Domain invariant — managed service placement |
| `rule-conn-source` | **Shared** | Domain invariant — connection integrity |
| `rule-conn-target` | **Shared** | Domain invariant — connection integrity |
| `rule-conn-self` | **Shared** | Domain invariant — logical constraint |
| `rule-conn-invalid` | **Shared** | Domain invariant — adjacency semantics |
| `rule-aggregation-count` | **Shared** | Domain invariant — affects code generation |
| `rule-role-invalid` | **Shared** | Domain invariant — role validity |
| `rule-role-duplicate` | **Frontend-only** | Warning-level UX hint — no security impact |
| `rule-layer-hierarchy` | **Shared** | Domain invariant (when wired) — layer system constraint |
| `rule-grid-alignment` | **Frontend-only** | Pure UX — visual grid snapping |
| `rule-no-overlap` | **Frontend-only** | Pure UX — visual layout collision |
| `rule-provider-aws-lambda-subnet` | **Frontend-only** | Advisory warning — no generation impact |
| `rule-provider-gcp-sql-public` | **Frontend-only** | Advisory warning — no generation impact |
| `rule-provider-unknown-subtype` | **Shared** | Both layers should validate known subtypes |
| Top-level shape validation | **Backend-only** | API boundary protection — frontend constructs valid shape by design |
| Duplicate ID detection | **Backend-only** | Data integrity at API boundary |
| Secret strength validation | **Backend-only** | Server configuration — not relevant to frontend |

### 4.3 Summary

| Classification | Count | Rules |
|----------------|-------|-------|
| **Shared** | 16 | All placement, connection, aggregation, role-invalid, layer-hierarchy, provider-unknown-subtype |
| **Frontend-only** | 5 | role-duplicate, grid-alignment, no-overlap, provider-aws-lambda-subnet, provider-gcp-sql-public |
| **Backend-only** | 3 | Top-level shape, duplicate IDs, secret strength |

---

## 5. Discrepancy Resolution Plan

### 5.1 Critical Fixes (Backend Must Change)

| ID | Fix | Scope |
|----|-----|-------|
| D1 | Move analytics, identity, observability from `managed_rules` to `subnet_rules` in `rule_engine.py` | `rule_engine.py` |
| D3 | Split `rule-conn-endpoint` into `rule-conn-source` and `rule-conn-target` | `rule_engine.py` |
| D4 | Add `analytics`, `identity`, `observability` to `compute` targets in the connection adjacency table | `rule_engine.py` |

### 5.2 Contract Updates (Document Must Change)

| ID | Fix | Scope |
|----|-----|-------|
| D2 | Update `VALIDATION_CONTRACT.md` to use per-category serverless rule IDs: `rule-function-region`, `rule-queue-region`, `rule-event-region` | `VALIDATION_CONTRACT.md` + `placement.ts` |

### 5.3 Missing Backend Rules (Add After Fixes)

| Rule | Priority | Notes |
|------|----------|-------|
| `rule-aggregation-count` | Medium | Add to `rule_engine.py` — simple integer/range check |
| `rule-role-invalid` | Medium | Add to `rule_engine.py` — check against `BLOCK_ROLES` enum |
| `rule-provider-unknown-subtype` | Low | Already partially covered by `ArchitectureValidator` |

---

## 6. Canonical Source Strategy

### 6.1 Rule of Authority

```
VALIDATION_CONTRACT.md  →  defines what rules exist
@cloudblocks/domain     →  exports shared rule definitions (future, #425)
Frontend + Backend      →  implement rules, must match contract
```

### 6.2 Synchronization Mechanism

**Phase 1 (Immediate — M17):**
- `VALIDATION_CONTRACT.md` remains the canonical rule source.
- Fix backend discrepancies (D1–D4) to match the contract.
- Update the contract for D2 (per-category serverless IDs).
- Update `VALIDATION_CONTRACT.md` §9 "FE/BE Alignment Contract" to reflect that backend validation IS implemented.

**Phase 2 (M17 Wave 5+ — with `@cloudblocks/domain`):**
- Extract shared rule definitions (rule IDs, severity, adjacency table) into `@cloudblocks/domain` as JSON/TypeScript constants.
- Both frontend and backend import rule metadata from the shared package.
- Backend consumes via JSON Schema artifact (Python cannot import TypeScript directly).
- Add shared test fixtures (`tests/fixtures/validation-cases.json`) as specified in the contract §9.

**Phase 3 (Post-M17):**
- Generate rule implementations from shared definitions (code generation from contract).
- Automated parity tests: same fixture file, same expected results, both layers.

### 6.3 Domain Constants to Centralize

These constants are currently duplicated between frontend (`shared/types/index.ts`) and backend (`architecture_prompt.py`):

| Constant | Frontend Location | Backend Location |
|----------|------------------|------------------|
| `BLOCK_CATEGORIES` | `shared/types/index.ts` | `architecture_prompt.py` |
| `CONNECTION_TYPES` | `shared/types/index.ts` | `architecture_prompt.py` |
| `PROVIDER_TYPES` | `shared/types/index.ts` | `architecture_prompt.py` |
| `LAYER_TYPES` | `shared/types/index.ts` | `architecture_prompt.py` |
| `SUBTYPE_REGISTRY` | `providerValidation.ts` (KNOWN_SUBTYPES) | `architecture_prompt.py` |
| `BLOCK_ROLES` | `shared/types/index.ts` | Not yet in backend |
| `VALID_PARENTS` | `shared/types/index.ts` | Not yet in backend |
| `ALLOWED_CONNECTIONS` | `connection.ts` | `rule_engine.py` |

These will move to `@cloudblocks/domain` in issue #425.

---

## 7. Implementation Order

1. **Fix backend discrepancies** (D1, D3, D4) in `rule_engine.py` — resolves semantic mismatches.
2. **Update frontend** for D2 — split `rule-serverless-network` into per-category IDs.
3. **Update `VALIDATION_CONTRACT.md`** — reflect D2 changes, update §9 status.
4. **Add missing backend rules** — aggregation, role-invalid.
5. **Extract shared constants** to `@cloudblocks/domain` (#425) — single source for enums and adjacency table.
6. **Add shared test fixtures** — JSON test cases consumed by both FE and BE test suites.

---

## 8. Dependencies

| This Document | Depends On | Informs |
|---------------|-----------|---------|
| #430 (this) | #422 Schema Boundaries (merged) | #425 Domain package extraction |
| #430 (this) | #428 Backend Role Docs (merged) | #424 JSON Schema + Python models |
| #430 (this) | — | #429 API Contract (what validation the API exposes) |

---

## 9. Decision Record

**Decision**: Adopt the "Shared with Backend Authority" model.

- **Shared rules** (16): Implemented in both layers. Frontend provides real-time UX feedback. Backend re-validates on every API call for security (untrusted input).
- **Frontend-only rules** (5): Stay in `apps/web/` — pure UX/layout concerns.
- **Backend-only rules** (3): Stay in `apps/api/` — API boundary and infrastructure concerns.
- **Canonical source**: `VALIDATION_CONTRACT.md` today, migrating to `@cloudblocks/domain` exports in #425.
- **Backend fixes required**: D1 (analytics/identity/observability placement), D3 (split endpoint rule), D4 (connection adjacency table).
