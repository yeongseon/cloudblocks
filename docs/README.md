# CloudBlocks Documentation Index

> **Reading Order**: concept → adr → model/design → engine → guides

---

## Getting Started Journey

New to CloudBlocks? Follow this path:

| Step | What to Do | Link |
|------|-----------|------|
| 1. Try it | Open the builder and use a template | [Quick Start](../README.md#quick-start) |
| 2. Learn | Follow a guided scenario in Learning Mode | [Tutorials](guides/TUTORIALS.md) |
| 3. Build | Design your own architecture from scratch | [UI Flow](concept/UI_FLOW.md) |
| 4. Generate | Export to Terraform, Bicep, or Pulumi | [Generator](engine/generator.md) |
| 5. Deploy | Push to GitHub and trigger CI/CD | [Deployment](guides/DEPLOYMENT.md) |

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
| [0001](adr/0001-architecture-model-as-source-of-truth.md) | Accepted | Architecture model as source of truth |
| [0002](adr/0002-git-native-storage.md) | Accepted | Git-native storage |
| [0003](adr/0003-lego-style-composition-model.md) | Partially Superseded | Lego-style composition model |
| [0004](adr/0004-rule-engine-architecture.md) | Accepted | Rule engine architecture |
| [0005](adr/0005-2d-first-editor-with-25d-rendering.md) | Accepted | 2D-first with 2.5D rendering |
| [0006](adr/0006-graph-ir-evolution-approach.md) | Accepted | Graph IR evolution approach |
| [0007](adr/0007-multi-environment-deployment-strategy.md) | Accepted | Multi-environment deployment strategy |
| [0008](adr/0008-v2-universal-architecture-specification.md) | Accepted | v2.0 Universal Architecture Specification |

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
| [VISUAL_DESIGN_SPEC.md](design/VISUAL_DESIGN_SPEC.md) | **Canonical** | Colors, geometry, materials, **Bottom Panel (§7)**, Command Card, Tech Tree |
| [VALIDATION_CONTRACT.md](design/VALIDATION_CONTRACT.md) | Canonical | Validation rule contracts |
| [MODULE_BOUNDARIES.md](design/MODULE_BOUNDARIES.md) | Supporting | FSD module structure |
| [NFR_TARGETS.md](design/NFR_TARGETS.md) | Supporting | Non-functional requirements |
| [SECURITY_BOUNDARIES.md](design/SECURITY_BOUNDARIES.md) | Supporting | Security constraints |
| [RELEASE_GATES.md](design/RELEASE_GATES.md) | Supporting | Release criteria |
| [LEARNING_MODE_SPEC.md](design/LEARNING_MODE_SPEC.md) | **Canonical** | Learning Mode design spec — scenarios, validation, engine, UI |
| [GRAPH_IR_SPEC.md](design/GRAPH_IR_SPEC.md) | Supporting | Graph IR specification — typed ports, protocol semantics, evolution plan |

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
| [ENVIRONMENT_STRATEGY.md](guides/ENVIRONMENT_STRATEGY.md) | Canonical | Local/staging/production deployment strategy |
| [TUTORIALS.md](guides/TUTORIALS.md) | Supporting | Getting started tutorials |

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
