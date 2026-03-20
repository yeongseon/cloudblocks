# CloudBlocks Platform - Graph IR Specification

> **Status**: Design Spec (Phase 5+)
>
> This document specifies the Graph IR (Intermediate Representation) used to represent CloudBlocks architectures as a directed graph with typed ports and protocol semantics.
>
> **Backward compatibility requirement**: In Phase 1 (ADR-0006), Graph IR is derived from the existing `ArchitectureModel` and does not break or replace current storage, validation, or generation behavior.

---

## 1. Goals

Graph IR exists to:

- Represent the architecture as a **formal directed graph (DAG)** suitable for analysis, validation, ordering, and simulation.
- Make connection intent explicit via **typed ports** (ingress/egress) and **protocol semantics**.
- Serve as the long-term **single source of truth** for validation and generation (Phase 2+), while allowing multiple UI projections (Phase 3).

---

## 2. Non-Goals (Phase 1)

- Replacing the current storage format (`schemaVersion`, `ArchitectureModel` JSON).
- Changing existing rule engine behavior or generator behavior.
- Introducing provider-specific resource types into the IR (Graph IR remains provider-neutral).

---

## 3. Terminology

- **Containment layer**: plates and placements (plate containment hierarchy: global → edge/region → zone → subnet).
- **Flow layer**: nodes/ports/edges representing directed communication or dependency flow.
- **Protocol semantics**: `http | internal | data | async` (Phase 5), plus legacy `dataflow` (current model).
- **Port**: a typed ingress/egress interface on a node. Edges connect ports.

---

## 4. Graph IR Data Model (TypeScript)

### 4.1 Core types

```ts
export type GraphIrVersion = '0.1.0';

/**
 * Protocol semantics.
 * - Phase 1 must support legacy `dataflow` (current Connection.type).
 * - Phase 5 introduces explicit protocol semantics used by validation and provider adapters.
 */
export type GraphProtocol = 'dataflow' | 'http' | 'internal' | 'data' | 'async' | 'unknown';

export type GraphPortDirection = 'in' | 'out';

export interface GraphIR {
  irVersion: GraphIrVersion;

  /**
   * Provenance for derived graphs (Phase 1).
   * In Phase 2+, this may reflect the canonical graph source instead.
   */
  source: {
    architectureId: string;
    architectureVersion: string;
    derivedAt: string; // ISO 8601
  };

  /**
   * Containment layer (plates).
   * Graph IR keeps plates to remain compatible with CloudBlocks vocabulary and placement rules.
   */
  plates: GraphPlate[];

  /**
   * Flow layer (nodes + edges).
   * Nodes include typed ports; edges connect nodes (optionally via explicit ports).
   */
  nodes: GraphNode[];
  edges: GraphEdge[];

  metadata: Record<string, unknown>;
}

export interface GraphPlate {
  id: string; // same ID as Plate.id
  name: string;
  type: 'global' | 'edge' | 'region' | 'zone' | 'subnet';
  subnetAccess?: 'public' | 'private';
  parentId: string | null;
  children: string[]; // IDs of child plates or blocks (mirrors current model)
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  metadata: Record<string, unknown>;
}

export type GraphNodeKind = 'block' | 'externalActor';

export interface GraphNode {
  id: string; // stable; uses Block.id or ExternalActor.id
  kind: GraphNodeKind;

  /**
   * Placement/containment reference.
   * - For blocks, this is Block.placementId (a subnet plate).
   * - For external actors, this may be null or a well-known "outside" context.
   */
  placementId: string | null;

  /**
   * Spatial info is carried through for visualization and compatibility,
   * but is not used to define graph semantics.
   */
  position?: { x: number; y: number; z: number };

  /**
   * Ports are the typed interface of the node.
   * Phase 1 may derive these from block category (well-known port catalogs).
   */
  ports: GraphPort[];

  /**
   * Domain payload for compatibility:
   * - Phase 1 keeps the original category/type info so existing rules/generators can be bridged.
   * - Phase 5 adds provider field; Graph IR anticipates it as optional.
   */
  payload:
    | {
        kind: 'block';
        category:
          | 'compute'
          | 'database'
          | 'storage'
          | 'gateway'
          | 'function'
          | 'queue'
          | 'event'
          | 'analytics'
          | 'identity'
          | 'observability';
        provider?: 'azure' | 'aws' | 'gcp';
        name: string;
        properties: Record<string, unknown>; // derived from Block.metadata
      }
    | {
        kind: 'externalActor';
        type: 'internet';
        name: string;
        properties: Record<string, unknown>;
      };

  metadata: Record<string, unknown>;
}

export interface GraphPort {
  id: string; // stable within node; recommended: `${nodeId}:${direction}:${name}`
  direction: GraphPortDirection;

  /**
   * Declared protocol types this port can carry.
   * Example: a Gateway ingress port may support only 'http'.
   */
  protocols: GraphProtocol[];

  /**
   * Optional label; used for UI and diagnostics.
   * Examples: "ingress", "egress", "data", "events"
   */
  name: string;

  /**
   * For future UI routing (Phase 3), ports may carry preferred attachment points.
   */
  ui?: {
    side?: 'north' | 'south' | 'east' | 'west';
    order?: number;
  };

  metadata: Record<string, unknown>;
}

export interface GraphEndpointRef {
  nodeId: string;

  /**
   * Optional in Phase 1 for backward compatibility.
   * When omitted, consumers must treat the edge as connecting the nodes' default ports.
   */
  portId?: string;
}

export interface GraphEdge {
  id: string; // stable; recommended: reuse Connection.id when derived
  from: GraphEndpointRef;
  to: GraphEndpointRef;

  /**
   * Primary semantic channel of the edge.
   * - Phase 1: often 'dataflow' (legacy) or inferred.
   * - Phase 5+: explicit 'http'|'internal'|'data'|'async' preferred.
   */
  protocol: GraphProtocol;

  /**
   * Whether protocol/ports were explicitly modeled or inferred from legacy data.
   * Inference is allowed in Phase 1 but must be surfaced for diagnostics.
   */
  confidence: 'explicit' | 'inferred' | 'unknown';

  metadata: Record<string, unknown>;
}
```

---

## 5. Node Types and Well-Known Port Catalogs

Phase 1 derives ports deterministically from node payload (block category / external actor type). These catalogs are intentionally minimal and can expand as the domain model grows.

### 5.1 External Actor: Internet

- Outbound HTTP into the system
- (Optional future) inbound responses are implicit; Graph IR models initiator flow

Recommended derived ports:

- `out:http` (protocols: `http`)

### 5.2 Gateway

Typical intent: public ingress + internal forwarding.

Recommended derived ports:

- `in:http` (protocols: `http`)
- `out:internal` (protocols: `internal`)

### 5.3 Compute

Typical intent: internal service endpoint + outbound calls to data/services.

Recommended derived ports:

- `in:internal` (protocols: `internal`)
- `out:internal` (protocols: `internal`)
- `out:data` (protocols: `data`)
- `out:async` (protocols: `async`) (Phase 5+; may remain unused in Phase 1)

### 5.4 Database (receiver-only)

Recommended derived ports:

- `in:data` (protocols: `data`)
- No outbound ports in Phase 1 (enforces receiver-only invariant)

### 5.5 Storage (receiver-only for MVP flow)

Recommended derived ports:

- `in:data` (protocols: `data`)
- No outbound ports in Phase 1 (enforces receiver-only invariant)

### 5.6 Serverless categories (Function/Queue/Event/Timer)

Recommended derived ports (Phase 1 compatibility, Phase 6+ usage):

- Function:
  - `in:http` (protocols: `http`) (optional, when modeled as HTTP-triggered)
  - `in:async` (protocols: `async`)
  - `out:data` (protocols: `data`)
  - `out:async` (protocols: `async`)
- Queue/Event/Timer:
  - Primarily `async` semantics

Note: Phase 1 may derive only a conservative subset and leave protocol as `unknown` when not inferable from the legacy model.

---

## 6. Edge Semantics

### 6.1 Protocol meaning

- `http`: public or application-layer HTTP semantics (ingress/egress)
- `internal`: service-to-service or internal network call semantics
- `data`: data plane access (DB queries, object storage read/write)
- `async`: event/message-driven semantics (queues, topics, triggers)
- `dataflow` (legacy): current model connection type with insufficient semantics
- `unknown`: placeholder when inference is not possible

### 6.2 Port compatibility rule

An edge is compatible with ports if:

- `edge.protocol` is included in `fromPort.protocols` AND `toPort.protocols`, OR
- `edge.protocol` is `dataflow` or `unknown` (Phase 1 compatibility mode), in which case:
  - The adapter must still choose best-effort default ports, and
  - The edge must be marked `confidence: 'inferred' | 'unknown'`.

---

## 7. Mapping: Current Model → Graph IR (Derivation Layer)

Graph IR must be derivable from the current `ArchitectureModel` without loss of existing behavior.

### 7.1 Entity mapping

- Plate → `GraphPlate` (1:1 field mapping)
- Block → `GraphNode(kind='block')`
  - `GraphNode.id = Block.id`
  - `GraphNode.placementId = Block.placementId`
  - `GraphNode.position = Block.position`
  - `payload.category = Block.category`
  - `payload.name = Block.name`
  - `payload.properties = Block.metadata`
- ExternalActor → `GraphNode(kind='externalActor')`
  - `GraphNode.id = ExternalActor.id`
  - `payload.type = ExternalActor.type` (e.g. `internet`)
  - `payload.name = ExternalActor.name`
- Connection → `GraphEdge`
  - `GraphEdge.id = Connection.id`
  - `from.nodeId = Connection.sourceId`
  - `to.nodeId = Connection.targetId`

### 7.2 Deriving ports

For each node, populate `ports` from the well-known port catalogs (Section 5). Port IDs must be stable and deterministic.

Recommended port ID convention:

- `${nodeId}:${direction}:${name}`
  - Example: `block-123:in:internal`
  - Example: `ext-internet:out:http`

### 7.3 Deriving protocol and selecting ports for legacy connections (Phase 1)

Legacy connections do not encode `http|internal|data|async`. Phase 1 derives best-effort semantics:

1. If `Connection.metadata.protocol` exists and matches supported values, treat as explicit:
   - `edge.protocol = metadata.protocol`
   - `edge.confidence = 'explicit'`

2. Else infer protocol based on endpoints (recommended heuristic):
   - If `source` or `target` is `internet` external actor → `http`
   - Else if `target` is `database` or `storage` → `data`
   - Else → `internal`
   - Set `edge.confidence = 'inferred'`

3. Else (if endpoints missing/unknown) → `unknown`

Then select `from.portId` and `to.portId`:

- Choose the first port on each node matching the inferred protocol and direction:
  - from: an `out` port supporting `edge.protocol`
  - to: an `in` port supporting `edge.protocol`
- If no match exists (e.g., receiver-only node lacks outbound), set portId omitted and mark `confidence: 'unknown'`.

This approach maintains backward compatibility while enabling protocol-aware analysis without changing stored connections.

---

## 8. Graph Validation Rules (Operate on Graph IR)

Graph IR validation is separate from (but compatible with) the existing rule engine. In Phase 1, it can run in parallel for diagnostics and readiness.

### 8.1 Structural invariants

- **ID uniqueness**: all plate/node/edge IDs are unique within their sets.
- **Referential integrity**:
  - `edge.from.nodeId` and `edge.to.nodeId` must exist as nodes.
  - If `portId` is present, it must resolve to a port on that node.
- **No self edges**: `from.nodeId !== to.nodeId`.
- **No duplicate edges**: at most one edge per ordered pair `(from.nodeId, to.nodeId, protocol)` (or stricter, depending on Phase 2 policy).

### 8.2 DAG invariant

- The flow graph must be a **DAG** (no directed cycles).
- If `async` semantics eventually require feedback loops, this rule is revisited explicitly (see Escalation Triggers at the end).

### 8.3 Port/protocol invariants

- If ports are specified:
  - from port must be `direction='out'`
  - to port must be `direction='in'`
  - `edge.protocol` must be compatible with both ports (Section 6.2)
- If ports are omitted (Phase 1 compatibility):
  - Edge must be `confidence != 'explicit'` and must record why in metadata (recommended).

### 8.4 Domain invariants (mirrors current rules)

- Receiver-only enforcement (Phase 1 parity):
  - database/storage nodes must not be `from` of any edge with `confidence != 'unknown'`
- Placement invariants:
  - block nodes must reference an existing subnet plate in `placementId` (same as current domain model)

---

## 9. Generation Pipeline Using Graph IR

Graph IR is designed to become the canonical input for generation (Phase 2). In Phase 1, it is an intermediate artifact used for ordering and semantics without changing existing generator contracts.

### 9.1 Phase 1 (Derived Graph, existing generators unchanged)

Recommended conceptual pipeline:

```
ArchitectureModel
  → Normalize (existing)
  → Validate (existing rule engine)
  → Derive Graph IR (pure function)
  → Graph validation (non-blocking or warning-only in Phase 1)
  → Generation (existing generators consume ArchitectureModel)
```

Uses in Phase 1:

- Topological order computation for deterministic planning/explanations
- Protocol-aware mapping experiments for Phase 5/8 readiness
- Pre-simulation groundwork (Milestone 9)

### 9.2 Phase 2+ (Graph canonical)

Target conceptual pipeline:

```
Graph IR (canonical)
  → Normalize graph (ports, references, ordering)
  → Validate graph (graph rules + domain rules)
  → Provider mapping (protocol-aware)
  → Generate (Terraform/Bicep/Pulumi)
```

---

## 10. Migration Strategy (Flat Model → Graph IR)

This migration is intentionally incremental (ADR-0006).

### Phase 1: Introduce derivation layer (no storage changes)

- Graph IR is derived at runtime from existing architecture JSON.
- Existing model remains canonical for storage, validation, and generation.

### Phase 2: Promote Graph IR to canonical (compatibility projection)

- Store Graph IR as canonical representation.
- Provide a compatibility projection to emit the legacy flat shape for any subsystem that still expects it.
- Make protocol and ports explicit; stop relying on inference.

### Phase 3: UI interacts with graph directly

- Connections become port-to-port operations.
- Visualization uses ports to route edges and display protocol intent.

---

## 11. Roadmap Alignment

This spec is designed to align to existing roadmap phases:

- **Phase 5 (Core Model & Multi-Cloud Bridge)**:
  - Introduces explicit provider tagging and expands connection semantics (`http|internal|data|async`).
  - Graph IR provides the structure (ports + protocol edges) needed to express these without ad-hoc heuristics.

- **Phase 6 (Provider Integration)**:
  - Provider-specific UI (themes, toggles, property extensions) can attach to GraphNode payload/provider metadata while keeping the flow layer stable.

- **Milestone 8 (Multi-Cloud Platform)**:
  - Provider adapters map Graph IR semantics into provider-specific networking/security constructs.
  - Graph IR enables consistent cross-provider interpretation of intent.

- **Milestone 9 (Architecture Simulation)**:
  - Simulation operates naturally on a DAG with typed edges and ports (reachability, propagation, ordering).

---

## 12. Escalation Triggers (When to revisit constraints)

Revisit the "DAG only" constraint if any of the following becomes required:

- Modeling explicit feedback loops as first-class (e.g., async event loops) where cycles are essential.
- Supporting bidirectional protocols as separate directed edges causes loss of clarity.
- Provider mapping requires explicit dependency edges distinct from communication edges.

If triggered, extend Graph IR with:
- an explicit edge category (`communication` vs `dependency`), and/or
- an explicit graph mode (`dag` vs `digraph`) with revised validation.
