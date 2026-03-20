# M17 Schema Boundary Design

> **Issue**: #422 — Design schema package boundaries  
> **Epic**: #417 — Rendering Model & Package Extraction  
> **Status**: Design — requires approval before extraction begins  
> **Author**: M17 automation  
> **Date**: 2026-03-20

## 1. Purpose

This document classifies every export in `apps/web/src/shared/types/index.ts` (533 lines) and related files into one of three ownership buckets:

| Package | npm name | Purpose |
|---------|----------|---------|
| **Schema** | `@cloudblocks/schema` | The ArchitectureModel contract shared between frontend and backend |
| **Domain** | `@cloudblocks/domain` | Business-logic constants and enumerations used by both sides |
| **Frontend** | stays in `apps/web` | Visual constants, UI helpers, and rendering-only types |

The goal is to establish a **single source of truth** for every type and constant, eliminating the duplication currently spread across `apps/web/src/shared/types/index.ts` and `apps/api/app/engines/prompts/architecture_prompt.py`.

---

## 2. Current State — Duplication Audit

### 2.1 Frontend canonical source

**File**: `apps/web/src/shared/types/index.ts` (533 lines)

Contains a mix of:
- Pure domain types (interfaces, type unions)
- Visual constants (colors, icons, stud specs)
- Validation types (rule definitions)
- Plate profile system (UI sizing presets)

### 2.2 Backend duplicated constants

**File**: `apps/api/app/engines/prompts/architecture_prompt.py` (463 lines)

| Constant | Backend (line) | Frontend equivalent | Match? |
|----------|---------------|---------------------|--------|
| `BLOCK_CATEGORIES` | L5–16 | `BlockCategory` (L37) | **Exact** — identical 10 values |
| `CONNECTION_TYPES` | L18 | `ConnectionType` (L95) | **Exact** — identical 5 values |
| `PROVIDER_TYPES` | L19 | `ProviderType` (L38) | **Same values, different order** (backend: aws first; frontend: azure first) |
| `LAYER_TYPES` | L20 | `LayerType` (L7) | **DIVERGENT** — backend omits `'resource'` |
| `SUBTYPE_REGISTRY` | L21–58 | *none in index.ts* | Backend-only; keys use `ProviderType` × `BlockCategory` |
| JSON Schema (embedded) | L300–415 | *none* | Inline schema string duplicates enum values |

**Consumers of these constants**:

| File | Usage |
|------|-------|
| `validation.py` (L10–16) | Imports all 5 constants from `architecture_prompt.py` |
| `rule_engine.py` (L72–167) | **Literal strings** — does not import; hardcodes category names |
| `suggestions.py` (L28–32) | Uses different severity vocab: `critical/warning/info` vs frontend `error/warning` |
| `entities.py` (L60–61) | Default `provider: str = "azure"` overlaps `ProviderType` |

### 2.3 Critical divergences

| Divergence | Severity | Impact |
|-----------|----------|--------|
| `LAYER_TYPES` missing `'resource'` | **LOW** | `'resource'` is not a plate type — it is used as a logical layer in frontend block placement validation (`placement.ts`). Backend `LAYER_TYPES` correctly matches the 5-value `PlateType` union. Not a true divergence. |
| `PROVIDER_TYPES` order | Low | Functional no-op but inconsistent |
| Suggestion severity vocab | Medium | `critical/info` not in frontend `RuleSeverity` |

---

## 3. Classification — Complete Export Map

### 3.1 `@cloudblocks/schema` — Shared Contract

These types define the **ArchitectureModel JSON wire format** — the interchange contract between frontend persistence, backend validation, and code generation.

| Export | Kind | Line(s) | Rationale |
|--------|------|---------|-----------|
| `LayerType` | type | 7 | Plate type enum; used in backend `LAYER_TYPES` |
| `PlateType` | type | 19 | Subset of `LayerType` (excludes `resource`); plate rendering |
| `SubnetAccess` | type | 20 | Plate property enum |
| `Plate` | interface | 22–33 | Core entity in ArchitectureModel |
| `BlockCategory` | type | 37 | Block category enum; used in backend `BLOCK_CATEGORIES` |
| `ProviderType` | type | 38 | Provider enum; used in backend `PROVIDER_TYPES` |
| `AggregationMode` | type | 43 | Block property enum (v2.0 §8) |
| `Aggregation` | interface | 45–48 | Block property (v2.0 §8) |
| `BlockRole` | type | 52 | Block role enum (v2.0 §9) |
| `Block` | interface | 74–86 | Core entity in ArchitectureModel |
| `ConnectionType` | type | 95 | Connection type enum; used in backend `CONNECTION_TYPES` |
| `Connection` | interface | 105–111 | Core entity in ArchitectureModel |
| `ExternalActor` | interface | 115–120 | Core entity in ArchitectureModel |
| `Position` | interface | 124–128 | Shared spatial type |
| `Size` | interface | 130–134 | Shared spatial type |
| `ArchitectureModel` | interface | 138–148 | **Root contract** — the single most important type |

**Total**: 16 exports (10 types + 6 interfaces)

### 3.2 `@cloudblocks/domain` — Shared Business Logic

These are constants and validation types that encode business rules shared between frontend and backend. They reference schema types but add behavioral semantics.

| Export | Kind | Line(s) | Rationale |
|--------|------|---------|-----------|
| `VALID_PARENTS` | const | 10–17 | Layer nesting rules; backend `rule_engine.py` hardcodes equivalent |
| `BLOCK_ROLES` | const | 54–56 | Enumeration of all valid roles |
| `CONNECTION_TYPE_LABELS` | const | 97–103 | Human-readable labels for connection types |
| `RuleSeverity` | type | 168 | Validation severity enum |
| `RuleType` | type | 169 | Validation rule category enum |
| `RuleDefinition` | interface | 171–177 | Rule metadata |
| `ValidationError` | interface | 179–185 | Validation result item |
| `ValidationResult` | interface | 187–191 | Validation output |

**Total**: 8 exports (2 types + 3 consts + 3 interfaces)

**Note**: `RuleSeverity` uses `'error' | 'warning'`. The backend `suggestions.py` uses `'critical' | 'warning' | 'info'` — this is a **separate suggestion severity** (not a validation severity). The suggestion system should either:
1. Map to `RuleSeverity` (recommended: `critical` → `error`, `info` → drop or add to `RuleSeverity`), or
2. Define its own `SuggestionSeverity` type in the backend (current implicit approach).

### 3.3 `apps/web` — Frontend Only

These exports are visual constants, UI helpers, and rendering-specific types. They stay in `apps/web`.

| Export | Kind | Line(s) | Rationale |
|--------|------|---------|-----------|
| `RoleVisualIndicator` | interface | 58–62 | CSS/emoji visual styling |
| `ROLE_VISUAL_INDICATORS` | const | 64–73 | Maps roles → icons/borders/labels |
| `Workspace` | interface | 152–164 | Frontend-only; has UI fields (`backendWorkspaceId`, `lastSyncAt`) |
| `BLOCK_COLORS` | const | 195–206 | Hex colors per category |
| `PLATE_COLORS` | const | 208–214 | Hex colors per plate type |
| `SUBNET_ACCESS_COLORS` | const | 216–219 | Hex colors for subnet access |
| `DEFAULT_BLOCK_SIZE` | const | 223–227 | Default block dimensions |
| `BLOCK_FRIENDLY_NAMES` | const | 231–242 | Educational display names |
| `BLOCK_DESCRIPTIONS` | const | 244–255 | Educational descriptions |
| `BLOCK_ICONS` | const | 257–268 | Emoji icons per category |
| `BLOCK_SHORT_NAMES` | const | 270–281 | Abbreviated names |
| `NetworkProfileId` | type | 285–289 | Plate profile system |
| `SubnetProfileId` | type | 291–295 | Plate profile system |
| `PlateProfileId` | type | 297 | Plate profile system |
| `StudColorSpec` | interface | 299–303 | Stud color specification |
| `PlateProfile` | interface | 305–323 | Full plate profile definition |
| `NETWORK_STUD_COLORS` | const | 325–329 | Stud colors for network plates |
| `PUBLIC_SUBNET_STUD_COLORS` | const | 331–335 | Stud colors for public subnets |
| `PRIVATE_SUBNET_STUD_COLORS` | const | 337–341 | Stud colors for private subnets |
| `PLATE_PROFILES` | const | 343–464 | All plate profile presets |
| `DEFAULT_PLATE_PROFILE` | const | 466–472 | Default profile per plate type |
| `getPlateProfile()` | function | 476–478 | Profile lookup helper |
| `buildPlateSizeFromProfileId()` | function | 480–487 | Size builder from profile |
| `LegacyPlateShape` | interface | 489–492 | Legacy migration helper |
| `inferLegacyPlateProfileId()` | function | 494–516 | Legacy profile inference |
| `getPlateStudColors()` | function | 518–523 | Stud color resolver |
| `DEFAULT_PLATE_SIZE` | const | 525–531 | Computed default sizes |
| Re-exports from `visualProfile.ts` | types/consts | 533 | `BlockVisualProfile`, `BlockTier`, `BLOCK_VISUAL_PROFILES`, etc. |

**Total**: 28 exports (all visual/UI-specific)

### 3.4 Separate frontend file: `visualProfile.ts` (240 lines)

All exports from `visualProfile.ts` are **frontend-only** (block tier dimensions, visual profiles, stud rendering). No changes needed — stays in `apps/web`.

### 3.5 Separate frontend file: `schema.ts` (123 lines)

Contains serialization/deserialization logic (`SCHEMA_VERSION`, `serialize()`, `deserialize()`, `migrateArchitecture()`). This is **frontend persistence logic** — stays in `apps/web`. The `SCHEMA_VERSION` constant tracks the serialization format version, not the model contract version.

---

## 4. Backend Constant Ownership

After extraction, backend files should import from generated Python models instead of maintaining their own copies.

### 4.1 Migration plan for `architecture_prompt.py`

| Current constant | New owner | Action |
|-----------------|-----------|--------|
| `BLOCK_CATEGORIES` | `@cloudblocks/schema` → generated Python | Replace with import from generated models |
| `CONNECTION_TYPES` | `@cloudblocks/schema` → generated Python | Replace with import from generated models |
| `PROVIDER_TYPES` | `@cloudblocks/schema` → generated Python | Replace with import from generated models |
| `LAYER_TYPES` | `@cloudblocks/schema` → generated Python | Replace with import; keep aligned with 5-value `PlateType` (no `'resource'`). Introduce separate backend constant for the 6-layer hierarchy if block placement rules need it |
| `SUBTYPE_REGISTRY` | Backend-only | Keep in backend; validate keys against schema enums |
| Inline JSON Schema | `@cloudblocks/schema` → generated JSON | Replace with import of generated `.json` schema file |

### 4.2 Migration plan for `rule_engine.py`

| Current pattern | Action |
|----------------|--------|
| Literal category strings (`"compute"`, `"gateway"`, etc.) | Import from generated Python enum |
| Literal severity strings (`"error"`, `"warning"`) | Import `RuleSeverity` from generated models |
| Hardcoded adjacency table | Keep in backend (business logic); validate keys against enum |
| Hardcoded placement rules | Keep in backend (business logic); validate keys against enum |

### 4.3 Migration plan for `validation.py`

Already imports from `architecture_prompt.py`. After migration:
- Import from generated Python models instead of `architecture_prompt.py`
- No other changes needed

### 4.4 Migration plan for `suggestions.py`

| Current pattern | Action |
|----------------|--------|
| Severity enum: `["critical", "warning", "info"]` | Keep as backend-specific `SuggestionSeverity`; add explicit mapping to `RuleSeverity` for frontend display |
| Category enum: `["security", "reliability", "best_practice"]` | Keep as backend-specific `SuggestionCategory`; no frontend equivalent exists |
| Layer names in prompt text | Reference generated enum values |

### 4.5 Migration plan for `entities.py`

| Current pattern | Action |
|----------------|--------|
| `provider: str = "azure"` | Validate against schema `ProviderType` enum; no code change needed |
| `generator: str = "terraform"` | Backend-only; no schema equivalent |
| `GenerationStatus` enum | Backend-only; no schema equivalent |

---

## 5. JSON Schema Generation Strategy

### 5.1 Pipeline

```
TypeScript types (@cloudblocks/schema)
        │
        ▼
   ts-json-schema-generator
        │
        ▼
  architecture-model.schema.json  (canonical JSON Schema)
        │
        ├──▶ Frontend: runtime validation (optional)
        │
        └──▶ datamodel-code-generator
                    │
                    ▼
              Python Pydantic models (apps/api)
```

### 5.2 Tool selection

| Step | Tool | Rationale |
|------|------|-----------|
| TS → JSON Schema | `ts-json-schema-generator` | Handles union types, interfaces; widely used (>1M weekly npm downloads) |
| JSON Schema → Python | `datamodel-code-generator` | Generates Pydantic v2 models from JSON Schema; actively maintained |

### 5.3 Generated artifacts

| Artifact | Location | Generated from |
|----------|----------|---------------|
| `architecture-model.schema.json` | `packages/schema/dist/` | TypeScript types in `packages/schema/src/` |
| `architecture_model.py` | `apps/api/app/generated/` | JSON Schema above |
| `domain_enums.py` | `apps/api/app/generated/` | JSON Schema enum definitions |

### 5.4 Generation triggers

- **CI**: Schema is regenerated on every PR that touches `packages/schema/src/`
- **Pre-commit hook** (optional): `pnpm schema:generate` validates no drift
- **Manual**: `pnpm --filter @cloudblocks/schema build` runs the full pipeline

### 5.5 Constraints

- Python cannot import TypeScript directly — JSON Schema is the **only** bridge
- Generated Python files are **checked into git** (not `.gitignore`'d) for auditability
- The generated JSON Schema serves as the **API contract documentation**

---

## 6. Package Structure

### 6.1 `packages/schema/`

```
packages/schema/
├── package.json          # @cloudblocks/schema
├── tsconfig.json
├── src/
│   ├── index.ts          # Re-exports all schema types
│   ├── model.ts          # ArchitectureModel, Plate, Block, Connection, ExternalActor
│   ├── enums.ts          # LayerType, PlateType, BlockCategory, ProviderType, etc.
│   └── spatial.ts        # Position, Size
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── architecture-model.schema.json  # Generated JSON Schema
└── scripts/
    └── generate-schema.ts  # ts-json-schema-generator invocation
```

### 6.2 `packages/cloudblocks-domain/`

```
packages/cloudblocks-domain/
├── package.json          # @cloudblocks/domain
├── tsconfig.json
├── src/
│   ├── index.ts          # Re-exports all domain constants
│   ├── hierarchy.ts      # VALID_PARENTS, layer nesting rules
│   ├── labels.ts         # CONNECTION_TYPE_LABELS, BLOCK_ROLES
│   └── validation.ts     # RuleSeverity, RuleType, RuleDefinition, ValidationError, ValidationResult
└── dist/
    ├── index.js
    └── index.d.ts
```

### 6.3 Dependency graph

```
@cloudblocks/schema          (0 deps — leaf package)
       ▲
       │
@cloudblocks/domain          (depends on @cloudblocks/schema)
       ▲
       │
@cloudblocks/web (apps/web)  (depends on both)
```

The backend (`apps/api`) consumes the **generated JSON Schema and Python models**, not the npm packages directly.

---

## 7. Divergence Resolution

These fixes should be applied during extraction (Wave 4):

| Divergence | Resolution | Package |
|-----------|-----------|---------|
| `LAYER_TYPES` missing `'resource'` | Add `'resource'` to backend (or accept frontend includes it for future use) | `@cloudblocks/schema` defines the canonical set; backend regenerates |
| `PROVIDER_TYPES` order | Standardize to alphabetical: `aws`, `azure`, `gcp` | `@cloudblocks/schema` defines canonical order |
| Suggestion severity vocab | Define explicit mapping `SuggestionSeverity → RuleSeverity` | Backend maps before sending to frontend |
| `SUBTYPE_REGISTRY` not shared | Keep backend-only; validate keys match schema enums at test time | Backend owns; test asserts key ⊆ schema enum |

---

## 8. Migration Sequence

This boundary design feeds directly into Wave 4–5 implementation:

| Wave | Issue | Action | Depends on |
|------|-------|--------|-----------|
| 4 | #423 | Extract `@cloudblocks/schema` — move types, set up JSON Schema generation | This document |
| 4 | #425 | Extract `@cloudblocks/domain` — move constants and validation types | #423 |
| 4 | #430 | Validation ownership — decide frontend vs backend rule engine | #423, #425 |
| 5 | #424 | JSON Schema + Python models — run generation pipeline | #423 |
| 5 | #426 | Migrate imports — update `apps/web` to import from packages | #423, #425 |
| 5 | #429 | API contract — define REST endpoints using schema types | #424 |

---

## 9. Decision Log

| Decision | Rationale | Alternative considered |
|---------|-----------|----------------------|
| Three packages (schema, domain, frontend) | Clean separation of contract vs logic vs UI | Two packages (schema+domain merged) — rejected because validation types are behavioral, not contractual |
| JSON Schema as bridge to Python | Python cannot consume TS; JSON Schema is language-neutral | Protobuf — rejected as overkill for this project size |
| Generated Python checked into git | Auditability; backend devs see exactly what changed | `.gitignore` generated files — rejected because drift is invisible |
| `SUBTYPE_REGISTRY` stays in backend | Provider-specific subtypes are backend concern; frontend doesn't need full registry | Move to domain — rejected because it would force frontend to bundle provider-specific data |
| `Workspace` stays in frontend | Has UI-specific fields (`backendWorkspaceId`, `lastSyncAt`); backend has its own `Workspace` entity | Move to schema — rejected because the two `Workspace` types serve different purposes |

---

## 10. Approval Checklist

Before extraction begins (Wave 4), confirm:

- [ ] Every export in `index.ts` is classified (§3)
- [ ] Backend divergences have agreed resolution (§7)
- [ ] JSON Schema generation tool choices are accepted (§5.2)
- [ ] Package structure is approved (§6)
- [ ] Migration sequence is feasible (§8)
