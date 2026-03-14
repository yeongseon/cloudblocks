# CloudBlocks Documentation — Versioning & Layering Strategy

This document defines how CloudBlocks documentation distinguishes between **current implementation** (v0.1) and **future architecture compiler vision** (v1.x), ensuring readers always know what exists today versus what is planned.

---

## Why This Document Exists

CloudBlocks documentation serves two audiences simultaneously:

1. **Contributors and users of the current v0.1 MVP** — who need accurate descriptions of what the code actually does
2. **Architects and planners** — who need to understand the long-term vision (Architecture Compiler, DSL, multi-provider code generation)

Mixing these two audiences without clear boundaries creates confusion: readers cannot tell whether a feature described in documentation is something they can use today or something planned for the future. This document establishes the rules to prevent that confusion.

---

## Version Definitions

### v0.1 — CloudBlocks Builder (Current Implementation)

The working MVP. Everything described as v0.1 **exists in the codebase and can be verified**.

| Aspect | v0.1 Reality |
|--------|-------------|
| **UI** | 2.5D isometric builder (React + React Three Fiber) |
| **Blocks** | `compute`, `database`, `storage`, `gateway` |
| **Plates** | Network plate, Subnet plate (public/private) |
| **Connections** | `dataflow` type only |
| **Connection Rules** | Pure initiator model — `internet→gateway`, `gateway→compute`, `compute→database`, `compute→storage` |
| **External Actors** | `internet` (implicit, not user-placed) |
| **Persistence** | localStorage (`cloudblocks:workspaces`) |
| **Code Generation** | Not implemented |
| **Backend** | FastAPI with in-memory rule engine (no database) |
| **Schema** | `SCHEMA_VERSION = '0.1.0'` |

**Canonical sources for v0.1 behavior:**
- `apps/web/src/shared/types/index.ts` — Domain model types
- `apps/web/src/shared/types/schema.ts` — Storage format
- `apps/web/src/features/validate/connection.ts` — Connection rules
- `docs/DOMAIN_MODEL.md` — Model specification

### v0.2–v0.4 — Visual Polish, Code Generation, Workspace Management

Near-term milestones building on the v0.1 foundation. See `docs/ROADMAP.md` for details.

| Version | Key Additions |
|---------|--------------|
| **v0.2** | Drag-and-drop, keyboard shortcuts, camera controls |
| **v0.3** | Terraform code generation (client-side, Azure-first) |
| **v0.4** | Multi-workspace, import/export, template system |

### v1.x — Architecture Compiler (Future Vision)

The long-term product direction. Features described as v1.x are **design documents only** — no implementation exists.

| Aspect | v1.x Vision |
|--------|------------|
| **Connection Types** | `dataflow`, `network`, `event` |
| **Block Types** | `FunctionBlock`, `QueueBlock`, `CDNBlock`, and more |
| **DSL** | CloudBlocks architecture DSL (intermediate representation) |
| **Generator** | Multi-provider code generation pipeline (Terraform, Bicep, Pulumi) |
| **Provider Mapping** | Azure, AWS, GCP resource adapters |
| **Templates** | Pre-built architecture scenarios (3-tier, serverless, microservices) |
| **Backend** | Git-native workflow, GitHub integration, server-side generation |

---

## Documentation Layering Rules

### Rule 1: v0.1 Documents Must Match Code Exactly

Any document describing v0.1 behavior must be verifiable against the canonical source files. If the code says `category: 'compute'`, the docs must say `category`, not `type`. If the code only supports `dataflow` connections, the docs must not list `network` or `event` as available.

**Applies to:** DOMAIN_MODEL.md, STORAGE_ARCHITECTURE.md, API_SPEC.md, TUTORIALS.md (tutorials 1–5)

### Rule 2: Future Concepts Must Be Explicitly Labeled

Any mention of functionality that does not exist in the current codebase must include a version label. Use these markers:

```markdown
> **v1.0+**: This feature is part of the Architecture Compiler vision and is not yet implemented.
```

```markdown
<!-- v1.0 Future -->
```

**Applies to:** model.md, generator.md, rules.md, templates.md, provider.md, TUTORIALS.md (tutorial 6)

### Rule 3: Architecture Compiler Docs Are Forward-Looking by Default

The five Architecture Compiler documents (`model.md`, `generator.md`, `rules.md`, `templates.md`, `provider.md`) describe the **target architecture** for v1.x. They are design specifications, not implementation documentation. Each document should state this in its header or introduction.

### Rule 4: ROADMAP.md Is the Canonical Version Timeline

When there is any question about which version introduces a feature, `docs/ROADMAP.md` is the authoritative source. Other documents may reference version numbers, but ROADMAP.md defines them.

### Rule 5: DOMAIN_MODEL.md Is the Canonical Model Specification

The domain model (types, field names, relationships) is defined in `DOMAIN_MODEL.md` and implemented in `apps/web/src/shared/types/index.ts`. All other documents must use the same field names and type definitions. If a discrepancy is found, `index.ts` is the source of truth for v0.1, and `DOMAIN_MODEL.md` is the source of truth for the model specification.

---

## Document Classification

### Implementation Documents (must match code)

| Document | Scope | Canonical Source |
|----------|-------|-----------------|
| `DOMAIN_MODEL.md` | Domain types, field names, relationships | `index.ts` |
| `STORAGE_ARCHITECTURE.md` | Persistence format, serialization | `schema.ts` |
| `API_SPEC.md` | API endpoints, request/response shapes | `apps/api/` |
| `TUTORIALS.md` (1–5) | Step-by-step guides using v0.1 features | Running application |
| `DEPLOYMENT.md` | Build and deploy instructions | `package.json`, `Dockerfile` |

### Architecture Documents (vision + current state)

| Document | Scope | Notes |
|----------|-------|-------|
| `ARCHITECTURE.md` | System architecture overview | Sections on v0.1 state + Architecture Compiler vision |
| `PRD.md` | Product requirements | Covers v0.1 deliverables + future vision |
| `ROADMAP.md` | Version timeline and exit criteria | Canonical for "when does X ship?" |
| `ARCHITECTURE_REVIEW.md` | Gap analysis and improvement areas | Status-annotated with what has been addressed |

### Future Design Documents (v1.x design specs)

| Document | Scope | Implementation Status |
|----------|-------|--------------------|
| `model.md` | Architecture model schema (DSL) | Design only — not implemented |
| `generator.md` | Code generation pipeline | Design only — not implemented |
| `rules.md` | Validation rule framework | Partial — v0.1 rules exist, extensible framework is v1.x |
| `templates.md` | Pre-built architecture templates | Design only — not implemented |
| `provider.md` | Cloud provider resource mappings | Design only — not implemented |

---

## Adding New Documentation

When creating or updating documentation:

1. **Determine the document category** (implementation, architecture, or future design)
2. **If implementation**: Verify every claim against the canonical source code
3. **If future design**: Add explicit version labels to all non-implemented features
4. **If mixed**: Clearly separate "Current State" sections from "Future" sections
5. **Always**: Use field names and type names from `DOMAIN_MODEL.md` / `index.ts`

### Checklist for Documentation PRs

- [ ] Field names match canonical types (`placementId`, not `plateId`; `category`, not `type`)
- [ ] Connection rules follow the initiator model (database/storage are receiver-only in v0.1)
- [ ] Connection type is `dataflow` (not `network`/`event`) unless labeled v1.0+
- [ ] `Workspace.architecture` is singular (not `architectures[]`) in v0.1 context
- [ ] Future features have explicit version labels
- [ ] ROADMAP.md version numbers are referenced correctly

---

## Version Label Reference

| Label | Meaning |
|-------|---------|
| **v0.1** | Exists in code today. Verified against `index.ts` and `schema.ts`. |
| **v0.2** | Planned for next release. No code exists yet. |
| **v0.3** | Code generation milestone. Design exists in `generator.md`. |
| **v0.4** | Workspace management milestone. |
| **v0.5+** | Server-side features (API-based code generation, Git integration). |
| **v1.0+** | Architecture Compiler vision. Full DSL, multi-provider, templates. |
