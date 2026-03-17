# CloudBlocks Documentation Index

> **Reading Order**: concept → adr → model/design → engine → guides

---

## Document Ownership

| Status | Meaning |
|--------|---------|
| **Canonical** | Source of truth — code must conform |
| **Supporting** | Reference material — links to canonical |
| **Historical** | Past decisions — do not update |

---

## 1. Concept (Start Here)

High-level product vision and roadmap.

| Document | Status | Description |
|----------|--------|-------------|
| [PRD.md](concept/PRD.md) | Canonical | Product requirements |
| [ROADMAP.md](concept/ROADMAP.md) | Canonical | Milestone timeline & milestones |
| [ARCHITECTURE.md](concept/ARCHITECTURE.md) | Supporting | System architecture overview |
| [UI_FLOW.md](concept/UI_FLOW.md) | Supporting | User interaction flows |

---

## 2. Architecture Decision Records (ADR)

Immutable records of key decisions.

| ADR | Status | Decision |
|-----|--------|----------|
| [0001](adr/0001-architecture-model-as-source-of-truth.md) | Historical | Architecture model as source of truth |
| [0002](adr/0002-git-native-storage.md) | Historical | Git-native storage |
| [0003](adr/0003-lego-style-composition-model.md) | Historical | Lego-style composition model |
| [0004](adr/0004-rule-engine-architecture.md) | Historical | Rule engine architecture |
| [0005](adr/0005-2d-first-editor-with-25d-rendering.md) | Historical | 2D-first with 2.5D rendering |

---

## 3. Domain Model

Core domain entities and rules.

| Document | Status | Description |
|----------|--------|-------------|
| [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) | **Canonical** | Entities, invariants, type specs |
| [STORAGE_ARCHITECTURE.md](model/STORAGE_ARCHITECTURE.md) | Canonical | Git-native storage design |
| [ARCHITECTURE_MODEL_OVERVIEW.md](model/ARCHITECTURE_MODEL_OVERVIEW.md) | Supporting | DSL & pipeline overview |

> **Code source of truth**: `apps/web/src/shared/types/index.ts`

---

## 4. Design Specs

Detailed visual and interaction specifications.

| Document | Status | Description |
|----------|--------|-------------|
| [BRICK_DESIGN_SPEC.md](design/BRICK_DESIGN_SPEC.md) | **Canonical** | Merged brick design system — geometry, profiles, provider themes, connections, UX states |
| [BRICK_SIZE_SPEC.md](design/BRICK_SIZE_SPEC.md) | **Historical** | Legacy sizing spec — superseded by BRICK_DESIGN_SPEC.md |
| [VISUAL_DESIGN_SPEC.md](design/VISUAL_DESIGN_SPEC.md) | **Canonical** | Colors, geometry, materials, **Bottom Panel (§7)**, Command Card, Tech Tree |
| [VALIDATION_CONTRACT.md](design/VALIDATION_CONTRACT.md) | Canonical | Validation rule contracts |
| [MODULE_BOUNDARIES.md](design/MODULE_BOUNDARIES.md) | Supporting | FSD module structure |
| [NFR_TARGETS.md](design/NFR_TARGETS.md) | Supporting | Non-functional requirements |
| [SECURITY_BOUNDARIES.md](design/SECURITY_BOUNDARIES.md) | Supporting | Security constraints |
| [RELEASE_GATES.md](design/RELEASE_GATES.md) | Supporting | Release criteria |
| [UI_IMPROVEMENT_GAP_ANALYSIS.md](design/UI_IMPROVEMENT_GAP_ANALYSIS.md) | Supporting | UI guide gap analysis, Milestone 6B spec, drag-to-create MVP |
| [LEARNING_MODE_SPEC.md](design/LEARNING_MODE_SPEC.md) | **Canonical** | Learning Mode design spec — scenarios, validation, engine, UI |

> **UI Single Source of Truth**: All visual/interaction specs are in `VISUAL_DESIGN_SPEC.md`. Section §7 covers the StarCraft-style Bottom Panel layout.

---

## 5. Engine (Code Generation)

Infrastructure code generation pipeline.

| Document | Status | Description |
|----------|--------|-------------|
| [generator.md](engine/generator.md) | Canonical | Generation pipeline |
| [provider.md](engine/provider.md) | Canonical | Provider adapters (Azure) |
| [rules.md](engine/rules.md) | Canonical | Validation rules |
| [templates.md](engine/templates.md) | Canonical | Architecture templates |

---

## 6. API

REST API specification.

| Document | Status | Description |
|----------|--------|-------------|
| [API_SPEC.md](api/API_SPEC.md) | Canonical | REST API endpoints |

---

## 7. Guides

User and developer guides.

| Document | Status | Description |
|----------|--------|-------------|
| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | Supporting | Deployment instructions |
| [TUTORIALS.md](guides/TUTORIALS.md) | Supporting | Getting started tutorials |

---

## 8. System

System-level governance and meta docs.

| Document | Status | Description |
|----------|--------|-------------|
| [VERSIONING.md](system/VERSIONING.md) | Supporting | Versioning policy |

---

## Key Canonical Sources

| Concern | Canonical Document |
|---------|-------------------|
| Domain entities & types | [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) |
| Visual sizing & layout | [BRICK_DESIGN_SPEC.md](design/BRICK_DESIGN_SPEC.md) |
| Colors & materials | [VISUAL_DESIGN_SPEC.md](design/VISUAL_DESIGN_SPEC.md) |
| TypeScript types | `apps/web/src/shared/types/index.ts` |
| Validation rules | `apps/web/src/entities/validation/` |
| Milestone timeline | [ROADMAP.md](concept/ROADMAP.md) |
