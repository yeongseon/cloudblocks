# CloudBlocks Architecture Review

This document reviews the current **CloudBlocks System Architecture** and proposes improvements to strengthen the design for clarity, scalability, and long-term maintainability.

> **⚠️ Document Status**: This review was written during the early architecture phase. Many of the gaps identified below have since been addressed:
>
> - §3.1 (Architecture Model Schema) → Now defined in ARCHITECTURE.md §3.5 and DOMAIN_MODEL.md §12
> - §3.2 (Generator Pipeline) → Now specified in ARCHITECTURE.md §5 and generator.md
> - §3.3 (Rule Engine Architecture) → Now specified in ARCHITECTURE.md §4 and rules.md
> - §3.6 (Rendering Layer) → Now specified in ARCHITECTURE.md §6
> - §3.4 (Workspace Data Model) and §3.5 (Local-First Sync) remain relevant for future work (v0.3+).
>
> The recommendations below remain as historical context. See the current documents for up-to-date specifications.

---

# 1. Overall Assessment

The architecture shows a well-structured foundation with several strong decisions:

| Area | Assessment |
|-----|-------------|
| Domain modeling | Strong |
| Git-native architecture | Excellent |
| Thin backend philosophy | Correct |
| 2D-first editor architecture | Very strong |
| Progressive roadmap | Good |

CloudBlocks avoids many common pitfalls seen in visual infrastructure tools.

---

# 2. Key Strengths

## 2.1 2D-First Editing Model

CloudBlocks separates the **editing model** from the **rendering layer**.

```
Internal Model → 2D coordinates + hierarchy
Rendering Layer → 2.5D isometric projection
```

Benefits:

- avoids complex 3D interaction
- easier validation logic
- deterministic architecture model
- simplified UI interaction
- predictable placement

Many visual builders fail by becoming **3D editors**.
CloudBlocks avoids this trap.

---

## 2.2 Git-Native Storage Architecture

The system correctly treats GitHub repositories as the **primary source of truth**.

```
Architecture JSON
Generated IaC
Templates
CI/CD pipelines
```

All stored in GitHub.

Benefits:

- built-in version control
- pull request collaboration
- audit history
- native CI/CD integration
- distributed backups

This architecture follows patterns used by:

- Terraform Cloud
- Pulumi
- GitOps platforms
- Backstage ecosystem tools

---

## 2.3 Thin Backend Architecture

The backend is designed as a **workflow orchestrator** instead of a traditional CRUD service.

```
Frontend
↓
Backend Orchestrator
↓
GitHub + Generator Engine
```

Responsibilities:

- authentication
- code generation orchestration
- GitHub operations
- metadata management

Benefits:

- reduced operational complexity
- easier horizontal scaling
- lower infrastructure cost
- minimal data storage requirements

This is the correct architectural approach.

---

# 3. Architectural Gaps

Although the architecture is strong, several areas require additional specification.

---

## 3.1 Missing Formal Architecture Model Specification

The **Architecture Model** is the most critical component of the platform.

However the architecture document currently lacks a formal schema definition.

Example minimal model:

```json
{
  "version": "0.1",
  "plates": [],
  "blocks": [],
  "connections": [],
  "externalActors": []
}
```

Recommended entities:

| Entity | Description |
|--------|-------------|
| Plate | Network containers |
| Block | Infrastructure resources |
| Connection | Request/data flow |
| ExternalActor | External endpoints |
| Metadata | Labels and configuration |

Without a stable model schema, code generation becomes fragile.

---

## 3.2 Generator Architecture Needs Clarification

The generator pipeline exists conceptually but requires more structure.

Recommended pipeline:

```
Architecture Model
      ↓
Normalization Layer
      ↓
Provider Adapter
      ↓
Generator Plugin
      ↓
Output Formatter
```

Example modules:

```
generators/
  adapters/
    azure_adapter.ts
    aws_adapter.ts
  terraform/
    network.tf.ts
    compute.tf.ts
    database.tf.ts
```

Responsibilities:

| Layer | Responsibility |
|-------|---------------|
| Normalization | Clean architecture model |
| Provider Adapter | Map generic → provider |
| Generator | Produce IaC |
| Formatter | Write final files |

---

## 3.3 Rule Engine Architecture

The validation engine should support modular rules.

Recommended structure:

```
rules/
  placement/
    subnet_rules.ts
    block_rules.ts
  connection/
    flow_rules.ts
  security/
    subnet_security.ts
```

Each rule returns:

```json
{
  "ruleId": "rule-db-private",
  "severity": "error",
  "message": "Database must be in private subnet"
}
```

Benefits:

- easier rule extension
- better maintainability
- improved testability

---

## 3.4 Workspace Data Model

The current architecture assumes a single architecture per workspace.

Future support may require:

- multiple architectures
- environment variants
- architecture history

Recommended structure:

```
workspace
 ├ architectures
 │   ├ architecture.json
 │   ├ architecture-v2.json
 │
 ├ infra
 │   ├ terraform
 │   └ bicep
```

---

## 3.5 Local-First Data Synchronization

Future architecture should support offline editing.

Recommended approach:

```
IndexedDB (local source)
      ↓
Sync Engine
      ↓
GitHub repo
```

Features:

- offline editing
- conflict detection
- incremental sync
- optimistic concurrency

---

## 3.6 Rendering Layer Architecture

Although React Three Fiber is mentioned, rendering responsibilities should be clearer.

Recommended layers:

```
Scene Layer
  ├ Grid
  ├ Plates
  ├ Blocks
  ├ Connections
  └ Selection
```

Responsibilities:

| Component | Role |
|-----------|------|
| SceneCanvas | root 3D scene |
| Grid | snap placement |
| PlateRenderer | subnet/network |
| BlockRenderer | infrastructure nodes |
| ConnectionRenderer | arrows/flows |

---

# 4. Scalability Considerations

Current architecture scales well due to:

| Component | Scaling Strategy |
|-----------|-----------------|
| Frontend | CDN static hosting |
| Backend | Stateless containers |
| Metadata DB | Managed Postgres |
| Generation Jobs | Queue workers |
| Storage | GitHub + Blob storage |

---

# 5. Recommended Architecture Improvements

Priority Improvements:

1. Define Architecture Model Schema
2. Formalize Generator Pipeline
3. Modularize Rule Engine
4. Introduce Local-First Sync Layer
5. Define Rendering Layer Responsibilities

---

# 6. Future System Evolution

| Version | Milestone |
|---------|-----------|
| v0.1 | Frontend-only builder |
| v0.3 | Code generation |
| v0.5 | GitHub integration + backend orchestration |
| v1.0 | Template marketplace |
| v2.0 | Multi-cloud generation |
| v3.0 | Cloud digital twin |

---

# 7. Final Evaluation

CloudBlocks has a strong architectural direction.

Strengths:

- clean domain model concept
- Git-native design
- thin backend architecture
- strong separation of concerns
- scalable long-term vision

With additional specification of:

- architecture schema
- generator pipeline
- rule engine

the platform architecture will be robust enough to support long-term evolution.

---

# 8. Conclusion

CloudBlocks is positioned to become a visual infrastructure design platform that generates real infrastructure code.

The current architecture provides a solid foundation for:

- visual architecture modeling
- infrastructure code generation
- Git-native collaboration
- scalable cloud infrastructure tooling
