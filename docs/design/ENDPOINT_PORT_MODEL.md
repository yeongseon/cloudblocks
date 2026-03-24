# Endpoint & Port Domain Model

**Status**: Active
**Date**: 2026-03
**Schema Version**: v4 (introduced in M22 Core Lock)
**Related**: [model.ts](../../packages/schema/src/model.ts), [endpoints.ts](../../packages/schema/src/endpoints.ts), [enums.ts](../../packages/schema/src/enums.ts)

---

## 0. Purpose

This document defines the **Endpoint and Port** architecture introduced in Schema v4 (M22 Core Lock). It replaces the legacy port-anchor-based connection model with a typed, directional endpoint system.

### Terminology

| Term           | Definition                                                                                                                          | Layer          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Endpoint**   | A typed connection point on a block. Every block has 6 endpoints (3 semantics × 2 directions). Persisted in the architecture model. | Domain model   |
| **Port**       | The visual representation of an endpoint on the canvas. A small colored dot rendered on the block face.                             | UI / rendering |
| **Connection** | A link between two endpoints (output → input). Stored as `{ from: endpointId, to: endpointId }`.                                    | Domain model   |
| **Block**      | A resource in the architecture (container block or resource block). Replaces legacy node/container terminology in UI.               | Domain model   |

> **Note**: In code, the type names `ContainerBlock`, `ResourceBlock`, `Block`, `Endpoint`, and `Connection` are canonical. The terms "Block", "Port", and "Endpoint" are used in UI strings. See §6 for the full terminology mapping.

---

## 1. Endpoint Model

### 1.1 Interface

```typescript
export interface Endpoint {
  id: string;
  blockId: string;
  direction: EndpointDirection; // 'input' | 'output'
  semantic: EndpointSemantic; // 'http' | 'event' | 'data'
}
```

### 1.2 Deterministic IDs

Endpoint IDs are deterministic — computed from the block ID, direction, and semantic type:

```
endpoint-{blockId}-{direction}-{semantic}
```

Examples:

- `endpoint-vm-1-input-http`
- `endpoint-vm-1-output-data`
- `endpoint-sql-db-1-input-event`

This deterministic scheme ensures:

- No UUID proliferation
- Stable references across save/load cycles
- Parseable IDs for reverse lookups

### 1.3 Generation

Every block auto-generates 6 endpoints (3 semantics × 2 directions):

```typescript
function generateEndpointsForBlock(blockId: string): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const direction of ['input', 'output']) {
    for (const semantic of ['http', 'event', 'data']) {
      endpoints.push({
        id: `endpoint-${blockId}-${direction}-${semantic}`,
        blockId,
        direction,
        semantic,
      });
    }
  }
  return endpoints;
}
```

### 1.4 Direction

| Direction | Meaning               | Visual position     |
| --------- | --------------------- | ------------------- |
| `input`   | Receives traffic/data | Left face of block  |
| `output`  | Sends traffic/data    | Right face of block |

Direction is relative to the **block**, not the connection. A connection always flows from an `output` endpoint to an `input` endpoint.

### 1.5 Semantic Types

| Semantic | Traffic type          | Port color        | Use case                                     |
| -------- | --------------------- | ----------------- | -------------------------------------------- |
| `http`   | HTTP/REST requests    | `#3B82F6` (Blue)  | Web APIs, REST calls, HTTP traffic           |
| `event`  | Async events/messages | `#F59E0B` (Amber) | Event-driven, pub/sub, async messaging       |
| `data`   | Data flow / storage   | `#14B8A6` (Teal)  | Database access, storage I/O, data pipelines |

---

## 2. Connection Model

### 2.1 Interface

```typescript
export interface Connection {
  id: string;
  from: string; // Endpoint ID (must be output direction)
  to: string; // Endpoint ID (must be input direction)
  metadata: Record<string, unknown>;
}
```

### 2.2 Constraints

1. **Direction rule**: `from` must reference an `output` endpoint; `to` must reference an `input` endpoint.
2. **No self-connections**: A block cannot connect to itself (validated by checking `from.blockId !== to.blockId`).
3. **Semantic matching**: `from` and `to` must share the same `EndpointSemantic` (e.g., an `http` output connects to an `http` input).
4. **Single occupancy**: Each endpoint can participate in at most one connection. Occupied ports are dimmed (`PORT_COLOR_OCCUPIED: #475569`).

### 2.3 Connection Resolution

To resolve a connection's source/target blocks and type:

```typescript
function resolveConnectionBlocks(conn: { from: string; to: string }): {
  sourceId: string;
  targetId: string;
  type: string;
} {
  const fromParsed = parseEndpointId(conn.from);
  const toParsed = parseEndpointId(conn.to);
  return {
    sourceId: fromParsed?.blockId ?? conn.from,
    targetId: toParsed?.blockId ?? conn.to,
    type: SEMANTIC_TO_TYPE[fromParsed?.semantic ?? 'data'] ?? 'dataflow',
  };
}
```

---

## 3. Port Rendering (UI Layer)

### 3.1 Visual Design

Ports are small elliptical dots rendered on block faces in the SVG canvas. They represent endpoints visually.

| Property        | Value | Source                             |
| --------------- | ----- | ---------------------------------- |
| Dot size (rx)   | 4px   | `PORT_DOT_RX` in `designTokens.ts` |
| Dot size (ry)   | 2.5px | `PORT_DOT_RY` in `designTokens.ts` |
| Stroke width    | 1.5px | `PORT_DOT_STROKE_WIDTH`            |
| Default opacity | 0.7   | `PORT_DOT_OPACITY`                 |
| Active opacity  | 1.0   | `PORT_DOT_ACTIVE_OPACITY`          |
| Glow radius     | 4px   | `PORT_GLOW_RADIUS`                 |

### 3.2 Port States

| State        | Appearance                         | When                                  |
| ------------ | ---------------------------------- | ------------------------------------- |
| **Idle**     | Semantic color, 0.7 opacity        | Normal view, no interaction           |
| **Hover**    | Semantic color, 1.0 opacity + glow | Mouse over port in connect mode       |
| **Active**   | Full color + animated glow         | Port selected as connection source    |
| **Occupied** | Slate (`#475569`), dimmed          | Already connected to another endpoint |
| **Invalid**  | Hidden or red indicator            | Connection would violate rules        |

### 3.3 Port Layout on Block Face

Ports are positioned on the left (input) and right (output) faces of isometric blocks:

```
        ┌──────────────┐
       ╱              ╱│
      ╱              ╱ │
     ╱──────────────╱  │
     │              │  │
  ●  │    Block     │  ●   ← Ports (● = colored dots)
  ●  │              │  ●
  ●  │              │  ●
     │              │ ╱
     └──────────────┘╱

  Input ports         Output ports
  (left face)         (right face)
```

Each face shows up to 3 ports (one per semantic type: http, event, data), stacked vertically.

---

## 4. Drag-to-Connect Interaction

### 4.1 Flow

1. User enters **Connect mode** (via toolbar or keyboard shortcut)
2. Ports become visible on all blocks
3. User clicks an **output port** → connection drag starts
4. A temporary SVG line follows the cursor
5. Valid **input ports** on other blocks highlight with glow
6. Invalid ports (wrong semantic, same block, occupied) are dimmed
7. User releases on a valid input port → connection created with snap animation
8. If released on invalid target → connection cancelled, line disappears

### 4.2 Validation Rules (during drag)

```
✅ Valid: output → input, same semantic, different block, both unoccupied
❌ Invalid: same direction, different semantic, same block, occupied target
```

### 4.3 Snap Animation

When a valid connection is made, a brief snap animation plays:

- Connection line elastically snaps to the target port
- Brief scale pulse on both source and target ports
- Duration: 200ms (matches `motion.duration-normal`)

---

## 5. Schema v4 Migration

### 5.1 v3 → v4 Changes

| v3 (Legacy)                                     | v4 (Current)                            | Notes                                                    |
| ----------------------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| `Connection.sourceId` / `targetId`              | `Connection.from` / `to` (endpoint IDs) | Connections reference endpoints, not blocks              |
| `ConnectionType` enum                           | `EndpointSemantic` enum                 | `dataflow`→`data`, `async`→`event`, `http`→`http`        |
| `sourcePortAnchor` / `targetPortAnchor` (index) | Deterministic endpoint IDs              | No more index-based port-anchor references               |
| No endpoint concept                             | `Endpoint[]` in model                   | Endpoints are first-class model entities                 |
| `ExternalActor`                                 | Folded into blocks                      | External actors are now blocks with special resourceType |

### 5.2 Legacy Type Mapping

```typescript
// ConnectionType → EndpointSemantic
'http'      → 'http'
'async'     → 'event'
'data'      → 'data'
'dataflow'  → 'data'
'internal'  → 'data'
```

### 5.3 Deprecated Types (kept for migration)

```typescript
/** @deprecated Use EndpointSemantic for v4 connections. */
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';

/** @deprecated Use ContainerBlock instead. */
export type Container = ContainerBlock;

/** @deprecated Use ResourceBlock instead. */
export type Node = ResourceBlock;
```

These aliases exist in `packages/schema/src/` for backward compatibility during migration and will be removed in a future milestone.

---

## 6. UI Terminology Mapping

The following terms are used in user-facing strings (tooltips, labels, panel headers). Code identifiers retain their TypeScript names.

| Code Identifier   | UI Display Term | Context                                                          |
| ----------------- | --------------- | ---------------------------------------------------------------- |
| `Block`           | **Block**       | Generic reference to any element on canvas                       |
| `ContainerBlock`  | **Container**   | A block that holds child blocks (deprecated: "container node")   |
| `ResourceBlock`   | **Block**       | A leaf resource (deprecated: "leaf node")                        |
| `Endpoint`        | **Endpoint**    | Connection point on a block (deprecated: "Port Anchor")          |
| Port (visual dot) | **Port**        | The rendered visual dot on block faces (deprecated: "UI Anchor") |
| `Connection`      | **Connection**  | A link between two endpoints                                     |

> **Important**: These are UI-only terms. Code should continue using the TypeScript type names (`ContainerBlock`, `ResourceBlock`, `Endpoint`, etc.).

---

## 7. Architecture Model (Complete v4)

```typescript
export interface ArchitectureModel {
  id: string;
  name: string;
  version: string;
  blocks: Block[]; // All blocks (container blocks + resources)
  endpoints: Endpoint[]; // All endpoints (auto-generated per block)
  connections: Connection[]; // Endpoint-to-endpoint connections
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### 7.1 Invariants

1. For every block in `blocks`, exactly 6 endpoints exist in `endpoints` (3 semantics × 2 directions).
2. Every `connection.from` references an `output` endpoint ID that exists in `endpoints`.
3. Every `connection.to` references an `input` endpoint ID that exists in `endpoints`.
4. `connection.from` and `connection.to` must have the same `EndpointSemantic`.
5. No two connections share the same endpoint (single occupancy).
6. `endpoint.blockId` references a valid block in `blocks`.

---

_This specification is the authoritative reference for the Endpoint/Port domain model in CloudBlocks Schema v4. For the full schema types, see [`packages/schema/src/model.ts`](../../packages/schema/src/model.ts). For theme-related port colors, see [THEME_SYSTEM_SPEC.md](THEME_SYSTEM_SPEC.md) §5._
