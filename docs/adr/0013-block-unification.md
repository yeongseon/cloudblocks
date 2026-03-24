# ADR-0013: Block Unification — Unified Block Model with Traits

**Status**: Accepted
**Date**: 2026-03
**Supersedes**: [ADR-0003](0003-lego-style-composition-model.md), [ADR-0012](0012-modular-surface-visual-language.md)

## Context

CloudBlocks has carried Lego-derived terminology (plate, brick, stud, stub) since its inception. This creates three problems:

1. **Legal risk**: "LEGO" is a registered trademark. Using Lego-derived terms in an unaffiliated product creates trademark concerns.
2. **Cognitive overhead**: Two separate concepts (plate vs block) for what users perceive as one thing — "a block on the canvas."
3. **Scalability bottleneck**: The binary `kind: 'container' | 'resource'` discriminator cannot express hybrid resources (e.g., ECS Cluster = contains children + has ports, Azure Container Apps Environment = network boundary + container).

The codebase already moved toward unification:

- `NodeBase` → `ContainerNode` / `LeafNode` with `kind` discriminator (packages/schema)
- `Plate` and `Block` are deprecated type aliases
- Unified store APIs (`addNode`, `removeNode`) exist alongside legacy wrappers (`addPlate`, `addBlock`)

ADR-0012 addressed Lego branding in documentation but kept the plate/block/brick vocabulary in code. This ADR completes the unification.

### Scale of change

| Term        | Occurrences | Files |
| ----------- | ----------- | ----- |
| plate/Plate | ~3,400      | ~205  |
| stud/stub   | ~1,134      | ~80   |
| brick/Brick | ~152        | ~22   |
| lego/Lego   | ~145        | ~40   |

## Decision

### 1. UI Principle: Everything is a "Block"

Users see only two concepts: **Block** and **Connection**.

- A VPC is a block. A VM is a block. A Subnet is a block.
- There is no "container" or "resource" distinction in the UI.
- The left panel, palette, tooltips, and all user-facing text use "Block" exclusively.
- Cloud service names (VPC, VM, Subnet) are the primary identity labels.

### 2. Internal Model: `kind` + `traits`

Internally, the code preserves behavioral correctness through two orthogonal axes:

**`kind: 'container' | 'resource'`** — Structural invariant only.

- Answers one question: "Can this block have children in the node tree?"
- `container`: has `frame` (width/height), supports child nodes, cascade drag/delete.
- `resource`: leaf node, no children, no frame.
- This enum is **frozen** — no new values will be added. Ever.

**`traits: BlockTraits`** — Behavioral capabilities, extensible.

- Answers: "What can this block do?"
- Driven by the block type registry (RESOURCE_RULES), not stored per-instance.
- Enables hybrid blocks (container + connectable, container + boundary, etc.).

```typescript
// Structural invariant — frozen, never extended
type BlockKind = 'container' | 'resource';

// Behavioral capabilities — extensible via registry
type BlockTraits = Partial<{
  containment: {
    allowedChildTypes?: string[]; // which block types can be placed inside
  };
  connectable: {
    inbound: number; // max inbound ports
    outbound: number; // max outbound ports
  };
  boundary: {
    scope: 'network' | 'security' | 'organization';
  };
}>;
```

**Why two axes instead of one?**

- `kind` provides exhaustive `switch` for structural operations (drag, delete, render, serialize). TypeScript enforces completeness.
- `traits` provides extensibility without enum bloat. New capabilities (e.g., `cost`, `iac`, `abstract`) can be added without touching `kind`.
- Hybrid blocks are natural: a `container` with `connectable` trait = ECS Cluster, K8s Namespace, Azure Container Apps Environment.

### 3. Terminology Mapping

| Old term (banned)              | New code term                                            | New UI term                    | Notes                            |
| ------------------------------ | -------------------------------------------------------- | ------------------------------ | -------------------------------- |
| plate, Plate                   | `ContainerBlock` (component), `kind: 'container'` (type) | "Block" (+ cloud service name) | Users never see "container"      |
| block, Block (as LeafNode)     | `ResourceBlock` (component), `kind: 'resource'` (type)   | "Block" (+ cloud service name) | Users never see "resource"       |
| brick, Brick                   | `ConnectionRenderer`, `EdgePath`                         | "Connection"                   | Drop all brick references        |
| stud, stub                     | `Port`, `PortAnchor`                                     | "Port"                         | Connection point on a block      |
| lego, Lego                     | —                                                        | "CloudBlock" (brand only)      | Zero occurrences in code/docs    |
| PlateProfile                   | `BlockProfile` or `styleId`                              | —                              | Visual preset                    |
| PlateType                      | `ContainerLayer`                                         | —                              | Container hierarchy level        |
| endpoint (as connection point) | `Port`                                                   | "Port"                         | Unify with stub/stud replacement |

### 4. Banned Terms

The following terms are banned from all mutable files in `apps/`, `packages/`, and `docs/` (excluding archived/historical files):

`plate`, `brick`, `stud`, `stub`, `lego`

A CI grep gate will enforce this. Case-insensitive match.

### 5. Schema Evolution

**Before (current):**

```typescript
interface NodeBase {
  kind: NodeKind; /* ... */
}
interface ContainerNode extends NodeBase {
  kind: 'container';
  size: Size;
}
interface LeafNode extends NodeBase {
  kind: 'resource';
}
type ResourceNode = ContainerNode | LeafNode;
type Plate = ContainerNode; // deprecated
type Block = LeafNode; // deprecated
```

**After:**

```typescript
type BlockKind = 'container' | 'resource';

interface BlockBase {
  id: string;
  name: string;
  kind: BlockKind;
  provider: ProviderType;
  category: ResourceCategory;
  resourceType: string;
  parentId: string | null;
  position: Position;
  metadata: Record<string, unknown>;
  config?: Record<string, unknown>;
  subtype?: string;
  aggregation?: Aggregation;
  roles?: BlockRole[];
  profileId?: string;
  canvasTier?: CanvasTier;
}

interface ContainerBlock extends BlockBase {
  kind: 'container';
  resourceType: ContainerCapableResourceType;
  frame: Size; // renamed from 'size' for clarity
}

interface ResourceBlock extends BlockBase {
  kind: 'resource';
}

type Block = ContainerBlock | ResourceBlock;

// Ports replace endpoints + stubs
interface Port {
  id: string;
  blockId: string;
  direction: 'input' | 'output';
  semantic: 'http' | 'event' | 'data';
}

// PortAnchor replaces stub geometry
type PortAnchor =
  | { type: 'face'; face: 'n' | 'e' | 's' | 'w'; t: number }
  | { type: 'absolute'; x: number; y: number };

// Connection unchanged
interface Connection {
  id: string;
  from: string; // Port ID
  to: string; // Port ID
  metadata: Record<string, unknown>;
}

// Traits — derived from RESOURCE_RULES registry, not stored per-instance
type BlockTraits = Partial<{
  containment: { allowedChildTypes?: string[] };
  connectable: { inbound: number; outbound: number };
  boundary: { scope: 'network' | 'security' | 'organization' };
}>;
```

### 6. Traits are Registry-Derived, Not Instance-Stored

Traits are **not** serialized on each block instance. They are derived from `RESOURCE_RULES` at runtime:

```typescript
function getTraits(resourceType: string): BlockTraits {
  const rule = RESOURCE_RULES[resourceType];
  if (!rule) return {};
  const traits: BlockTraits = {};
  if (rule.containerCapable) {
    traits.containment = { allowedChildTypes: rule.allowedChildren };
  }
  const ports = CATEGORY_PORTS[rule.category];
  if (ports.inbound > 0 || ports.outbound > 0) {
    traits.connectable = ports;
  }
  // boundary scope can be added to RESOURCE_RULES when needed
  return traits;
}
```

This keeps the serialized model lean and avoids trait drift between instances.

### 7. File/Directory Renames

| Old                                 | New                         |
| ----------------------------------- | --------------------------- |
| `entities/plate/`                   | `entities/container-block/` |
| `PlateSprite.tsx`                   | `ContainerBlockSprite.tsx`  |
| `PlateSvg.tsx`                      | `ContainerBlockSvg.tsx`     |
| `BlockSprite.tsx`                   | `ResourceBlockSprite.tsx`   |
| `BlockSvg.tsx`                      | `ResourceBlockSvg.tsx`      |
| `BrickConnector.tsx`                | `ConnectionRenderer.tsx`    |
| `connectionBrickGeometry.ts`        | `connectionGeometry.ts`     |
| `blockGeometry.ts` (stub functions) | `portGeometry.ts`           |
| `endpointAnchors.ts`                | `portAnchors.ts`            |

### 8. Store API Renames

| Old                         | New                                                         |
| --------------------------- | ----------------------------------------------------------- |
| `addPlate()`                | removed — use `addBlock()` with `kind: 'container'`         |
| `removePlate()`             | removed — use `removeBlock()` (behavior branches on `kind`) |
| `addBlock()` (leaf-only)    | `addBlock()` (unified, accepts any `kind`)                  |
| `removeBlock()` (leaf-only) | `removeBlock()` (unified, cascades based on `kind`)         |
| `movePlatePosition()`       | `moveBlock()` (unified, cascades based on `kind`)           |
| `moveBlockPosition()`       | `moveBlock()` (unified)                                     |

### 9. Migration Strategy

**Order**: schema → persistence → store → UI → ports → docs → CI gate

**Phase 1 — Schema + Persistence** (1 PR)

- Rename types in `packages/schema`
- Add persistence migration layer (legacy `plates[]`/`blocks[]` → `blocks[]`)
- Golden JSON fixture tests for legacy and new formats

**Phase 2 — Store** (1 PR)

- Unify `addPlate`/`addBlock` → `addBlock`
- Unify `movePlatePosition`/`moveBlockPosition` → `moveBlock`
- Delete legacy wrappers

**Phase 3 — UI Components** (1-2 PRs)

- Rename Plate components → ContainerBlock components
- Rename Block components → ResourceBlock components
- Update DOM attributes (`data-plate-id` → `data-container-block-id`)
- Update SceneCanvas render order

**Phase 4 — Ports** (1 PR)

- Rename stub/stud → Port/PortAnchor
- Rename endpoint → Port where appropriate
- Update geometry and routing files

**Phase 5 — Connections** (1 PR)

- Rename brick → ConnectionRenderer/EdgePath
- Update connection geometry files

**Phase 6 — Documentation** (1 PR)

- Update all mutable docs: ROADMAP, README, DOMAIN_MODEL, specs, user guides
- Create new design spec replacing BRICK_DESIGN_SPEC (historical doc stays as-is)
- Update AGENTS.md rules (Universal Stud Standard → Universal Block Standard or remove)

**Phase 7 — CI Gate + Cleanup** (1 PR)

- Add banned-terms CI grep
- Remove deprecated type aliases
- Final sweep

Each PR must:

- Load legacy workspaces correctly (persistence backward compatibility)
- Save in the new canonical format
- Pass all tests with ≥90% branch coverage
- Have zero banned terms in changed files

### 10. Historical Documents Policy

Documents marked "Historical (Superseded)" — including `BRICK_DESIGN_SPEC.md`, `VISUAL_DESIGN_SPEC.md`, `BRICK_GUIDEBOOK.md`, and old ADRs — remain as immutable snapshots. They will contain banned terms; the CI gate excludes them via path allowlist.

If needed, these files may be moved to a `docs/archive/` directory to reduce confusion, but their content is never modified.

## Consequences

### Positive

- **Zero legal risk**: No Lego-derived terminology in active code or documentation.
- **Simplified mental model**: Users see only "Block" and "Connection." No plate/block distinction.
- **Future-proof**: `traits` system handles hybrid blocks (ECS Cluster, K8s Namespace, Container Apps) without schema changes.
- **Cleaner codebase**: One unified `Block` type replaces `Plate` + `Block` + `NodeBase` + `ContainerNode` + `LeafNode`.
- **Type safety preserved**: `kind` discriminator enables exhaustive `switch` for structural operations.

### Negative

- **Large migration**: ~205 files, ~3,400+ occurrences of "plate" alone. High mechanical effort.
- **Temporary instability**: During migration, the codebase will have mixed old/new terminology across PRs.
- **Historical document confusion**: Old specs still reference plate/brick/stud terminology.

### Neutral

- **Effort estimate**: 7 PRs across 2-3 weeks (parallelizable by domain).
- **No behavioral change**: The refactor is purely terminological + structural. No user-facing behavior changes.
- **Existing workspaces**: Persistence migration handles legacy data transparently.

## Related Documents

- [ADR-0003](0003-lego-style-composition-model.md) (superseded — original plate/block/connection model)
- [ADR-0012](0012-modular-surface-visual-language.md) (superseded — partial Lego branding removal)
- [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md) (to be updated)
- [MODULAR_SURFACE_SPEC.md](../design/MODULAR_SURFACE_SPEC.md) (to be updated)
- [RESOURCE_CATEGORY_STRATEGY.md](../concept/RESOURCE_CATEGORY_STRATEGY.md) (traits extend this)
