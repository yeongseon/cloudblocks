# ADR-0006: Graph IR Evolution Approach

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks currently represents an architecture as a flat, containment-oriented model:

- Plates define spatial and boundary containment (NetworkPlate, SubnetPlate)
- Blocks represent resources (compute, database, storage, gateway, plus serverless categories)
- Connections represent directed initiator flow between blocks/external actors (currently `dataflow` only)

This model has worked well for the Milestone 1-7 scope (builder UX, rule engine, generation, GitHub workflow). However, several roadmap goals increasingly require the architecture to be treated as a _formal directed graph_ with explicit semantics:

### Limitations of the current flat model

1. **Connections still lack full endpoint semantics despite expanded types**
   - The current `Connection.type` supports `dataflow | http | internal | data | async`.
   - Multi-cloud (Phase 5 / Milestone 8) still needs richer port-level intent to drive provider mapping (security rules, routing, private endpoints, IAM, etc.).

2. **No port model**
   - Blocks implicitly connect as whole nodes. There is no typed ingress/egress interface.
   - Validation and generation cannot distinguish "public HTTP ingress" vs "internal service-to-service" vs "data plane access" without heuristics.

3. **Analysis and simulation require graph primitives**
   - Roadmap items like dependency resolution, architectural analysis, and simulation (Milestone 9) are graph problems:
     - topological ordering
     - reachability
     - blast radius / impact
     - dependency closure
     - propagation models for failures/latency
   - Implementing these directly against the flat model leads to repeated ad-hoc graph reconstruction.

4. **Multi-cloud bridge needs a canonical IR**
   - Provider adapters (Phase 5 / Milestone 8) and generators need a stable intermediate representation that captures intent, not just presentation.
   - A graph-centric IR can become the single source of truth for validation and generation while allowing multiple visual projections.

### Options considered

1. **Big-bang rewrite to a graph-first model**
   - Pros: clean end state
   - Cons: high risk, breaks existing UX/generation/validation assumptions, requires simultaneous UI + storage + engine changes

2. **Keep flat model forever; add incremental fields**
   - Pros: lowest immediate change
   - Cons: continues to lack a proper port model and forces every subsystem to rebuild partial graphs differently

3. **Incremental evolution: introduce a Graph IR derived from the existing model, then gradually promote it**
   - Pros: preserves shipped behavior, enables graph-based validation/generation in parallel, aligns with phased roadmap
   - Cons: temporary dual-representation complexity

## Decision

Adopt an **incremental evolution** approach where a **Graph IR** is introduced first as a **derived view** of the existing architecture model, then gradually becomes canonical.

### Phase 1 (Derived View): Graph IR as a projection of the current model

- Implement a Graph IR that can be deterministically derived from the existing `ArchitectureModel` (plates/blocks/connections/externalActors).
- Graph IR is **read-only** and **not persisted as a required storage artifact**.
- Existing validation and generation remain authoritative; Graph IR is used for:
  - analysis experimentation
  - future validation rules operating on ports/protocols
  - future generation planning (dependency ordering, protocol-aware mapping)

### Phase 2 (Canonical IR): Graph IR becomes the source of truth (with compatibility projection)

- Promote Graph IR to the **canonical representation** for validation and generation.
- Maintain backward compatibility by providing a compatibility projection back into the current flat model shape where needed.
- Protocol semantics (`http | internal | data | async`) and typed ports become first-class.

### Phase 3 (Graph-First UI): Editor operates directly on nodes/ports/edges

- UI interactions for connections become port-aware (users connect ports, not entire blocks).
- Visualization is driven directly from Graph IR (edges routed by port metadata; blocks expose explicit ingress/egress).

## Consequences

### Positive

- **Roadmap alignment**: provides the missing Core Model bridge needed for Phase 5 and enables richer provider adapters for Milestone 8.
- **Single IR for "graph problems"**: dependency resolution, reachability, ordering, and simulation can operate on a stable DAG representation.
- **Protocol-aware validation/generation**: explicit semantics reduces heuristics and improves correctness of multi-cloud mapping.
- **Low-risk transition**: Phase 1 introduces value without breaking existing behavior or storage formats.

### Negative

- **Dual representation (temporary)**: during Phase 1 and early Phase 2, the system must reconcile a flat model and a graph projection.
- **Inference ambiguity in Phase 1**: protocol semantics and port selection may be inferred from legacy connections and can be imperfect until modeled explicitly.
- **Documentation and mental model expansion**: contributors must understand both the containment model (plates) and the flow model (graph ports/edges).

### Related Documents

- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) — Current canonical domain model (plates/blocks/connections)
- [generator.md](../engine/generator.md) — Canonical generation pipeline
- [provider.md](../engine/provider.md) — Provider adapter responsibilities and multi-cloud challenges
- [ROADMAP.md](../concept/ROADMAP.md) — Phase 5/6/8 and Milestone 9 timeline alignment
- [GRAPH_IR_SPEC.md](../design/GRAPH_IR_SPEC.md) — Graph IR technical specification (this ADR introduces it)
