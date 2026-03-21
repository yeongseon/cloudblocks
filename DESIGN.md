# CloudBlocks Design

---

## 1. Philosophy

Cloud infrastructure is unnecessarily complex.

CloudBlocks simplifies it with a single principle:

> Everything is a resource node

---

## 2. Evolution

### Before (Legacy Model)

- **Plate** — Layout abstraction for boundaries
- **Block** — Resource abstraction for cloud services
- Separate structures led to increasing complexity

### After (Current Model — v0.19.0)

Unified Node Model:

- **ContainerNode** — Logical grouping (global, edge, region, zone, subnet)
- **LeafNode** — Actual cloud resource (7 categories)

```typescript
interface ArchitectureModel {
  nodes: ResourceNode[];    // ContainerNode | LeafNode
  connections: Connection[];
  externalActors: ExternalActor[];
}
```

### Key Changes

1. **Plate removed** — Layout abstraction eliminated; replaced by ContainerNode with `parentId`-based hierarchy
2. **Block removed** — Resource abstraction unified as LeafNode
3. **Single data structure** — `plates[] + blocks[]` consolidated into `nodes[]`
4. **Category realignment** — 10 categories consolidated to 7: network, security, edge, compute, data, messaging, operations

---

## 3. Key Design Decisions

### Lego-Style Composition

Every visual element follows the Universal Stud Standard — uniform dimensions
across all studs so any piece can connect to any other piece.
This is the core constraint that keeps the system composable.

### Architecture-First, Not Diagram-First

Most tools work **code to diagram** (visualize existing infra).
CloudBlocks works **architecture to code** (model visually, compile to IaC).
The visual model is the source of truth, not a byproduct.

### Validation Before Generation

A real-time rule engine enforces placement and connection constraints.
Invalid architectures cannot produce code — validation gates generation.

### Multi-Generator Output

One architecture model compiles to multiple IaC targets:
Terraform (HCL), Bicep (ARM), and Pulumi (TypeScript).
The generation pipeline is provider-aware and extensible.

### Three-Store State Architecture

State is split into three Zustand stores with clear boundaries:

| Store | Owns |
|-------|------|
| `architectureStore` | Domain model — nodes, connections, external actors |
| `uiStore` | UI state — tool mode, panel visibility, selection |
| `authStore` | Auth state — GitHub OAuth, session |

---

## 4. Agentic Development

This project is developed using **agentic coding workflows** where AI agents
handle implementation, testing, code review, and documentation under human direction.

### How It Works

- A human architect defines goals, constraints, and design direction
- AI agents decompose tasks, write code, run tests, and create PRs
- Agent orchestration manages parallel workstreams across the monorepo
- All changes go through CI validation before merge

### What This Means for the Codebase

- Early milestones have exploratory, noisy commit history from rapid iteration
- The current architecture is stabilized and production-quality
- Code quality is enforced by automated linting, type checking, and 90%+ branch coverage
- Focus on the current structure rather than early commits

---

## 5. Current Architecture

```
apps/web          — React 19 + TypeScript SPA (visual editor, validation, code generation)
apps/api          — FastAPI backend (GitHub OAuth, AI proxy, workspace sync)
packages/schema   — Canonical architecture model types, enums, JSON Schema
packages/domain   — Shared domain helpers (hierarchy rules, labels, validation)
```

The frontend owns the full architecture lifecycle:
model → validate → generate → export.
The backend handles external integrations (GitHub, AI).

---

## 6. Future Direction

- Resource category UI migration (Milestone 20)
- Azure v1 resource catalog with real subtypes
- Generator UX abstraction
- Community launch with onboarding + demo flow
- Internationalization (i18n)

---

## 7. Design Principles

- **Simple > Accurate** — Capture intent, not every cloud detail
- **Visual > Textual** — Design by composing, not by writing config
- **Composable > Monolithic** — Small pieces that snap together
- **Learnable > Complete** — Approachable first, comprehensive later
