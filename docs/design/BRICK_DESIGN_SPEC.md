# Brick Design Specification

**Status**: Canonical draft aligned to `main`  
**Date**: 2026-03-18  
**Related**: [VISUAL_DESIGN_SPEC.md](./VISUAL_DESIGN_SPEC.md), [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md), [provider.md](../engine/provider.md), [ADR-0003](../adr/0003-lego-style-composition-model.md), [ADR-0005](../adr/0005-2d-first-editor-with-25d-rendering.md)

---

## Document Scope

This document merges the legacy brick sizing spec with the user's multi-cloud Brick Design Spec v1.0 into a single canonical reference for brick geometry, rendering, profiles, provider themes, connection semantics, and interaction states.

It follows one rule throughout:

- **Implemented sections** describe behavior that exists on the `main` branch.
- **Partial sections** describe behavior where some pieces exist on `main`, but the system is incomplete or inconsistent.
- **Planned sections** preserve approved design intent that is not yet implemented.

### Status Legend

- **✅ Implemented** — code exists on `main`
- **🚧 Partial** — some code exists, but the design is incomplete, inconsistent, or only partially wired
- **📋 Planned** — design target only; no production implementation yet

### Canonical Reality Check

This merged spec intentionally corrects older documentation drift:

- The current brick renderer is **pure SVG + CSS + DOM layering**, not React Three Fiber / Three.js.
- The current projection is still **2:1 dimetric isometric**.
- The current block visual system is **Azure-first**.
- The current app/application layer is **not implemented**.
- The current connection type model supports **`dataflow | http | internal | data | async`**, while default connection creation still uses `dataflow`.
- The current provider-neutral abstractions live mostly in **plate profiles**, **example CIDRs**, and the **minifigure provider palette**, not in the brick renderer.

---

## 0. Universal Stud Standard (INVIOLABLE)

**Implementation status**: 🚧 Partial — the shared stud geometry and 3-layer structure are implemented on `main` in `apps/web/src/shared/components/IsometricStud.tsx`, but the inherited "`viewBox = screen size`" rule below is preserved verbatim from the legacy spec and no longer holds universally because blocks and plates render inside CSS-sized wrappers.

> **This section defines a HARD CONSTRAINT. No implementation, SVG, CSS, or code may violate this rule. Any change that results in non-uniform stud sizes is a blocking defect.**

### 0.1 The Lego Principle

Real Lego works because **every stud is identical**. A 1×1 brick, a 2×4 brick, a 48×48 baseplate — they all have studs of **exactly the same diameter and height**. This is not a coincidence; it is the fundamental engineering constraint that makes the entire system interoperable. Bricks connect because studs fit uniformly. If studs were different sizes on different bricks, nothing would snap together.

**CloudBlocks follows this exact principle.** Our visual system is a Lego simulation. If our studs are different sizes on different elements, we have broken the core metaphor and the visual will look wrong.

### 0.2 Canonical Stud Dimensions

All studs everywhere — background, plates, blocks, any future element — use these **exact** proportions:

| Property | Value | Description |
|----------|-------|-------------|
| **Stud cell** | 1 stud unit = `STUD_SIZE_PX` (40px logical) | Center-to-center spacing between studs |
| **Stud diameter** | 37.5% of stud cell | The visible stud top is 37.5% of the cell width |
| **Stud height** | 5 SVG units (scaled to viewBox) | Cylinder height of the 3D extrusion |
| **Stud shape** | Isometric ellipse (rx:ry = 2:1) | Matches 2:1 dimetric projection |
| **Stud structure** | 3 layers: shadow ellipse + top ellipse + inner ring | Consistent 3D appearance |

#### SVG Stud Template (Canonical)

Every stud in the system renders from this template. Only **colors** change per element.

```svg
<symbol id="stud" overflow="visible">
  <!-- Shadow (cylinder side, visible below top) -->
  <ellipse cx="0" cy="0" rx="12" ry="6" fill="{shadow-color}" />
  <!-- Top face (offset upward by stud height) -->
  <ellipse cx="0" cy="-5" rx="12" ry="6" fill="{top-color}" />
  <!-- Inner ring (concentric, on top face, for 3D depth) -->
  <ellipse cx="0" cy="-5" rx="7.2" ry="3.6" fill="{highlight-color}" opacity="0.3" />
</symbol>
```

### 0.3 viewBox = Screen Size (1:1 Mapping)

All SVGs use `viewBox` dimensions that **equal their screen render size**. This means SVG units = screen pixels. Therefore, stud dimensions in SVG are identical to screen dimensions — no scaling math needed.

| Element | Footprint | viewBox (= screen px) | Stud Count |
|---------|-----------|----------------------|------------|
| timer | 1×2 | 95 × 95 | 2 |
| event | 1×2 | 95 × 95 | 2 |
| function | 2×2 | 158 × 127 | 4 |
| gateway | 2×4 | 190 × 158 | 8 |
| queue | 2×4 | 190 × 158 | 8 |
| storage | 2×4 | 190 × 158 | 8 |
| compute | 3×4 | 222 × 190 | 12 |
| database | 4×6 | 285 × 222 | 24 |
| internet | 2×2 | ~158 × 127 | 4 (cylinder) |
| network plate | 16×20 | 1152 × 586 | 320 |
| subnet plate | 6×8 | 448 × 234 | 48 |
| Background (CSS) | — | 64px/cell | infinite grid |

Since viewBox = screen size, every stud in every SVG uses:

| Dimension | Value | Derivation |
|-----------|-------|------------|
| `rx` | **12** | 37.5% of cell width: `64 × 0.375 / 2 = 12` |
| `ry` | **6** | Half of rx (2:1 isometric ratio) |
| `height` | **5** | Visual cylinder extrusion |

> **No element-specific calculations.** Every stud everywhere uses rx=12, ry=6, height=5. The viewBox=screen approach eliminates all scaling confusion.

### 0.4 Rules (HARD CONSTRAINTS — Zero Exceptions)

1. **UNIFORM SIZE**: Every stud, on every element, at every zoom level, must render at the same visual diameter on screen. There is ONE stud size in the CloudBlocks universe.

2. **UNIFORM SHAPE**: Every stud uses the 3-layer structure (shadow + top + inner ring). No element may use a different stud shape (no flat circles, no filled rectangles, no custom shapes).

3. **UNIFORM SPACING**: Studs are spaced at exactly 1 stud-unit intervals on an isometric grid. The center-to-center distance is always 1 SCALE unit (64px) regardless of element type.

4. **NO SCALING EXCEPTIONS**: Blocks do NOT get "one big stud." Blocks get a proper stud grid matching their footprint (e.g., a 3×4 core block has 12 individual studs in a 3×4 grid). This is how real Lego works — a 2×4 brick has 8 studs, not 1 giant oval.

5. **COLOR ONLY VARIES**: The only property that changes between elements is stud color (shadow, top, highlight). Shape, size ratio, spacing — all fixed.

6. **BACKGROUND MATCHES**: The canvas background stud pattern uses the exact same stud visual dimensions and spacing as plates and blocks.

### 0.5 Enforcement

- Any PR that introduces a stud with non-standard dimensions is **auto-rejected**
- The stud `<symbol>` definition must be imported/referenced, not hand-coded per element
- Visual regression tests should verify stud uniformity across all element types
- This section (§0) takes **absolute precedence** over any other section in this document or VISUAL_DESIGN_SPEC.md that might contradict it

---

## 1. Overview — ✅ Implemented

CloudBlocks uses a **3-layer Lego-style design system**:

1. **Application Layer** — software pieces placed on hostable resources
2. **Resource Layer** — cloud resource bricks
3. **Plate Layer** — network boundary plates

That hierarchy is still the right conceptual model, but only layers 2 and 3 are implemented on `main`.

### 1.1 Layer Status Matrix

| Layer | Purpose | Current code reality | Status |
|------|---------|----------------------|--------|
| Application | Represent software running on resources | No `App` entity, no renderer, no placement model | 📋 Planned |
| Resource | Represent cloud resources as bricks | 8 block categories rendered via `BlockSvg.tsx` | ✅ Visuals implemented |
| Plate | Represent network and subnet boundaries | 8 plate profiles rendered via `PlateSvg.tsx` | ✅ Implemented |
| Connections | Represent directional architecture flow | Single `dataflow` connection with SVG bezier path | 🚧 Partial |
| Provider theming | Support Azure/AWS/GCP brick themes | Azure-first blocks, provider-neutral plate IDs, multi-provider minifigure accents | 🚧 Partial |
| UX state model | Formal builder state machine | Ad hoc store fields only | 📋 Planned |

### 1.2 Canonical Rendering Stack

The current renderer on `main` is:

- **Pure SVG components** for blocks, plates, studs, connections, and minifigure
- **Absolute-positioned HTML wrappers** for sprites and interaction hit targets
- **CSS transforms** for viewport pan/zoom
- **Zustand** for domain and UI state
- **interactjs** for drag behavior
- **zundo** for undo/redo history

No React Three Fiber or Three.js package is present in `apps/web/package.json`.

### 1.3 Current Component Map

| Concern | Component / file | Current role |
|---------|------------------|--------------|
| Shared stud symbol | `apps/web/src/shared/components/IsometricStud.tsx` | Defines canonical stud `<defs>` and `<use>` grid |
| Resource brick SVG | `apps/web/src/entities/block/BlockSvg.tsx` | Draws top face, side faces, label, icon, stud grid |
| Resource wrapper | `apps/web/src/entities/block/BlockSprite.tsx` | Handles selection, drag, connect, delete, diff classes |
| Plate SVG | `apps/web/src/entities/plate/PlateSvg.tsx` | Draws isometric plate faces and stud grid |
| Plate wrapper | `apps/web/src/entities/plate/PlateSprite.tsx` | Handles selection, drag, drop target highlighting |
| Connection path | `apps/web/src/entities/connection/ConnectionPath.tsx` | Draws quadratic bezier with arrow markers |
| External actor | `apps/web/src/entities/connection/ExternalActorSprite.tsx` | Renders Internet actor sprite |
| Projection math | `apps/web/src/shared/utils/isometric.ts` | Screen/world projection, depth sort, snapping |
| Visual profile metadata | `apps/web/src/shared/types/visualProfile.ts` | Tier, footprint, hostability, app capacity |
| Canonical types | `apps/web/src/shared/types/index.ts` | Categories, profiles, colors, interfaces |

### 1.4 Design Goals

| Goal | Current outcome |
|------|------------------|
| Preserve the Lego metaphor | Implemented via stud grids, stacked layers, shaded faces |
| Teach architectural weight through size | Implemented visually for resources and plates |
| Keep the domain model provider-neutral where possible | Implemented for `network`/`subnet` naming and example CIDRs |
| Avoid bespoke per-element drawing rules | Implemented through shared stud defs and parameterized SVG components |
| Support multi-cloud provider theming | Planned for bricks; only small hooks exist today |
| Support software-on-resource teaching model | Planned only |

### 1.5 Reality-First Notes

The most important implementation caveats on `main` are:

- Resource **visual** sizes vary by category, but resource **logical placement size** still uses a uniform `DEFAULT_BLOCK_SIZE`.
- The universal stud standard is implemented via shared SVG defs, but not every inherited statement in the old spec still matches wrapper sizing behavior.
- Multi-cloud support currently exists more in naming and code-generation extension points than in the brick renderer itself.

---

## 2. Application Layer (1×1 Studs) — 📋 Planned

Applications remain part of the canonical brick design, but they do **not** exist as runtime entities or rendered pieces on `main`.

### 2.1 Concept

Applications are small pieces that sit on hostable resource bricks and represent software the user operates rather than managed infrastructure the provider operates.

This section remains canonical because the resource layer already encodes hostability and app capacity, even though the actual app model has not shipped.

### 2.2 Hostability Rules Already Present in Code

`apps/web/src/shared/types/visualProfile.ts` already carries the metadata needed for the future application layer:

| Resource category | Hostable? | `appCapacity` | Current rationale |
|-------------------|-----------|---------------|-------------------|
| `compute` | Yes | 4 | Primary workload host |
| `function` | Yes | 1 | Single hosted handler/runtime |
| `gateway` | No | 0 | Managed edge service |
| `queue` | No | 0 | Managed message service |
| `storage` | No | 0 | Managed object store |
| `database` | No | 0 | Managed data service |
| `event` | No | 0 | Event router |
| `timer` | No | 0 | Trigger |

### 2.3 Planned Application Placement Rules

| Resource type | Accepts apps? | Planned rationale |
|---------------|---------------|-------------------|
| `compute` | ✅ Yes | VMs/containers host multiple software components |
| `function` | ✅ Yes | Serverless runtime hosts one handler/application unit |
| `gateway` | ❌ No | Provider-managed ingress |
| `queue` | ❌ No | Provider-managed queueing |
| `storage` | ❌ No | Provider-managed storage |
| `database` | ⚠️ Split model | Managed DB = no apps; self-hosted DB should be modeled as app on compute |
| `event` | ❌ No | Event routing trigger |
| `timer` | ❌ No | Scheduler trigger |

### 2.4 Planned Application Taxonomy

```ts
export type AppCategory =
  | 'web-server'
  | 'runtime'
  | 'language'
  | 'database-engine'
  | 'package';

export interface AppDefinition {
  id: string;
  name: string;
  category: AppCategory;
  icon: string;
  color: string;
}
```

Suggested built-in examples preserved from the legacy spec:

| Category | Examples |
|----------|----------|
| Web Server | `nginx`, `apache`, `caddy` |
| Runtime | `nodejs`, `deno`, `bun` |
| Language | `java`, `python`, `go`, `rust` |
| Database Engine | `postgres`, `mysql`, `redis` |
| Package / Container | `npm`, `docker`, `k8s` |

### 2.5 Planned Visual Form

| Property | Planned value |
|----------|---------------|
| Shape | 1×1 cylinder / stud-like piece |
| Placement | On the top face of a hostable resource |
| Height | Shorter than a full resource brick |
| Render technology | Inline SVG or reusable React component |
| Capacity layout | Auto-arranged within the host block's top stud area |

### 2.6 What Exists Today

The future app layer already has three implementation hooks:

- `hostable`
- `appCapacity`
- visual tiering that distinguishes `compute` and `function`

What is still missing:

- `App` entity type
- app collection on the architecture model
- app placement/storage
- app renderer
- validation rules for app capacity and compatibility
- app serialization and code-generation semantics

---

## 3. Resource Layer (Blocks) — ✅ Implemented

The resource layer is largely implemented as a **visual system**, but not yet as a fully footprint-accurate spatial model.

### 3.1 Canonical Block Categories

`apps/web/src/shared/types/index.ts` defines the current block taxonomy:

```ts
export type BlockCategory =
  | 'compute'
  | 'database'
  | 'storage'
  | 'gateway'
  | 'function'
  | 'queue'
  | 'event'
  | 'timer';
```

### 3.2 Visual Tier System

`apps/web/src/shared/types/visualProfile.ts` defines five brick size tiers:

```ts
export type BrickSizeTier = 'signal' | 'light' | 'service' | 'core' | 'anchor';
export type BrickSurface = 'studded';
export type BrickSilhouette = 'tower' | 'heavy' | 'shield' | 'module';
```

Current category-to-tier mapping:

| Category | Tier | Footprint (studs) | Hostable | App capacity |
|----------|------|-------------------|----------|--------------|
| `timer` | `signal` | 1×2 | No | 0 |
| `event` | `signal` | 1×2 | No | 0 |
| `function` | `light` | 2×2 | Yes | 1 |
| `gateway` | `service` | 2×4 | No | 0 |
| `queue` | `service` | 2×4 | No | 0 |
| `storage` | `service` | 2×4 | No | 0 |
| `compute` | `core` | 3×4 | Yes | 4 |
| `database` | `anchor` | 4×6 | No | 0 |

### 3.3 Category Matrix: Visual Footprint, Placement Rule, Color

| Category | Tier | Stud layout | Current placement rule | Base top color |
|----------|------|-------------|------------------------|----------------|
| `timer` | signal | `[1,2]` | Network plate only | `#5C2D91` |
| `event` | signal | `[1,2]` | Network plate only | `#D83B01` |
| `function` | light | `[2,2]` | Network plate only | `#FFB900` |
| `gateway` | service | `[2,4]` | Public subnet only | `#0078D4` |
| `queue` | service | `[2,4]` | Network plate only | `#737373` |
| `storage` | service | `[2,4]` | Any subnet | `#7FBA00` |
| `compute` | core | `[3,4]` | Any subnet | `#F25022` |
| `database` | anchor | `[4,6]` | Private subnet only | `#00A4EF` |

### 3.4 Current Visual Constraints

On `main`, all blocks share the same high-level visual rules:

- `surface` is always `'studded'`
- `silhouette` varies by category (`'tower' | 'heavy' | 'shield' | 'module'`)
- the top face is an isometric diamond
- the left and right walls are always rendered
- side-wall height is tier-based via `getBlockWorldHeight(category)` from `designTokens.ts`
- `TIER_HEIGHTS` in `designTokens.ts` currently maps: `signal: 0.5`, `light: 0.6`, `service: 0.8`, `core: 1.0`, `anchor: 1.2`
- the top face always renders a stud grid using the category footprint
- text label goes on the left wall; emoji icon goes on the right wall

This means the **size tier system and silhouette taxonomy are both implemented in runtime rendering/profile data**, while logical placement footprint is still uniform in the store model.

### 3.5 Current Block Visual Profile API

```ts
export interface BlockVisualProfile {
  tier: BrickSizeTier;
  surface: BrickSurface;
  silhouette: BrickSilhouette;
  footprint: [number, number];
  hostable: boolean;
  appCapacity: number;
}
```

Current runtime data:

```ts
export const BLOCK_VISUAL_PROFILES: Record<BlockCategory, BlockVisualProfile> = {
  timer:    { tier: 'signal',  surface: 'studded', silhouette: 'module', footprint: [1, 2], hostable: false, appCapacity: 0 },
  event:    { tier: 'signal',  surface: 'studded', silhouette: 'module', footprint: [1, 2], hostable: false, appCapacity: 0 },
  function: { tier: 'light',   surface: 'studded', silhouette: 'module', footprint: [2, 2], hostable: true,  appCapacity: 1 },
  gateway:  { tier: 'service', surface: 'studded', silhouette: 'shield', footprint: [2, 4], hostable: false, appCapacity: 0 },
  queue:    { tier: 'service', surface: 'studded', silhouette: 'module', footprint: [2, 4], hostable: false, appCapacity: 0 },
  storage:  { tier: 'service', surface: 'studded', silhouette: 'heavy',  footprint: [2, 4], hostable: false, appCapacity: 0 },
  compute:  { tier: 'core',    surface: 'studded', silhouette: 'tower',  footprint: [3, 4], hostable: true,  appCapacity: 4 },
  database: { tier: 'anchor',  surface: 'studded', silhouette: 'heavy',  footprint: [4, 6], hostable: false, appCapacity: 0 },
};
```

### 3.6 Current Block Color System (Azure-First)

The current block palette is Azure-first and implemented in `apps/web/src/shared/types/index.ts` and `apps/web/src/entities/block/blockFaceColors.ts`.

#### Base Colors

```ts
export const BLOCK_COLORS: Record<BlockCategory, string> = {
  compute:  '#F25022',
  database: '#00A4EF',
  storage:  '#7FBA00',
  gateway:  '#0078D4',
  function: '#FFB900',
  queue:    '#737373',
  event:    '#D83B01',
  timer:    '#5C2D91',
};
```

#### Stud Colors

| Category | Stud main | Stud shadow | Stud highlight |
|----------|-----------|-------------|----------------|
| `compute` | `#ff693b` | `#e34113` | `#FFB4A0` |
| `database` | `#33b8f5` | `#008acc` | `#99DCFA` |
| `storage` | `#99d11a` | `#6b9d00` | `#CCE88C` |
| `gateway` | `#3393de` | `#0066b8` | `#99C9EE` |
| `function` | `#ffca33` | `#e6a600` | `#FFE599` |
| `queue` | `#8c8c8c` | `#616161` | `#C6C6C6` |
| `event` | `#e16233` | `#c03400` | `#F0B099` |
| `timer` | `#7546aa` | `#4d1e82` | `#BAA3D5` |

#### Face Shading

For each category:

- top face uses `BLOCK_COLORS[category]`
- top edge stroke uses `topFaceStroke`
- right side uses a darker shade
- left side uses the darkest shade

That shading is implemented per category in `blockFaceColors.ts`.

### 3.7 Shape System Status — Implemented in Visual Profiles

The silhouette taxonomy from the v1.0 spec is now implemented in `visualProfile.ts` and assigned per category in `BLOCK_VISUAL_PROFILES`.

| Silhouette family | Meaning | Current category assignment |
|-------------------|---------|-----------------------------|
| `tower` | vertical workload host | `compute` |
| `heavy` | durable, weight-bearing, stateful | `database`, `storage` |
| `shield` | boundary / protection / ingress | `gateway` |
| `module` | compact managed service or trigger | `function`, `queue`, `event`, `timer` |

Current constraints:

- silhouette must not change stud sizing
- silhouette values are part of runtime profile data and available to renderer logic
- silhouette must still project cleanly into the same 2:1 dimetric system
- current renderer geometry remains consistent with existing block face/wall structure

### 3.8 Important Reality Gap: Visual Footprint vs Logical Footprint

This is the main reason the section is marked **partial**.

The renderer uses real per-category stud footprints, but the store currently uses:

```ts
export const DEFAULT_BLOCK_SIZE: Size = {
  width: 2.4,
  height: 2.4,
  depth: 2.4,
};
```

Consequences on `main`:

- all blocks share the same logical clamp size during movement
- `nextGridPosition()` does not pack blocks by actual stud footprint
- no collision or overlap detection uses the visual block size
- the visual size hierarchy teaches the right concept, but the editor does not yet enforce it spatially

---

## 4. Plate Layer (Network Boundaries) — ✅ Implemented

Plate profiles and rendering are implemented, but provider-specific placement rules and multi-cloud visual themes are still planned.

### 4.1 Canonical Plate Types

```ts
export type PlateType = 'network' | 'subnet';
export type SubnetAccess = 'public' | 'private';
```

Cloud-neutral naming is intentional:

- `network` is used instead of Azure-only `vnet`
- `subnet` stays shared across Azure, AWS, and GCP terminology

### 4.2 Plate Profile System — Implemented

`apps/web/src/shared/types/index.ts` defines 8 profiles.

#### Network Profiles

| Profile ID | Display name | Studs | World size | `worldHeight` | Recommended capacity | Learning level | Example CIDRs |
|------------|--------------|-------|------------|---------------|----------------------|----------------|---------------|
| `network-sandbox` | Sandbox | 8×12 | 8×12 | 0.7 | 2 | beginner | azure/aws/gcp: `10.0.0.0/24` |
| `network-application` | Application | 12×16 | 12×16 | 0.7 | 4 | intermediate | azure/aws/gcp: `10.1.0.0/20` |
| `network-platform` | Platform | 16×20 | 16×20 | 0.7 | 6 | advanced | azure/aws/gcp: `10.0.0.0/16` |
| `network-hub` | Hub | 20×24 | 20×24 | 0.7 | 8 | expert | azure/aws/gcp: `10.0.0.0/8` |

#### Subnet Profiles

| Profile ID | Display name | Studs | World size | `worldHeight` | Recommended capacity | Learning level | Example CIDRs |
|------------|--------------|-------|------------|---------------|----------------------|----------------|---------------|
| `subnet-utility` | Utility | 4×6 | 4×6 | 0.5 | 2 | beginner | azure/aws/gcp: `10.0.0.0/28` |
| `subnet-service` | Service | 6×8 | 6×8 | 0.5 | 4 | intermediate | azure/aws/gcp: `10.0.1.0/26` |
| `subnet-workload` | Workload | 8×10 | 8×10 | 0.5 | 6 | advanced | azure/aws/gcp: `10.0.2.0/24` |
| `subnet-scale` | Scale | 10×12 | 10×12 | 0.5 | 8 | expert | azure/aws/gcp: `10.0.4.0/22` |

### 4.3 Plate Profile Interface

```ts
export interface PlateProfile {
  id: PlateProfileId;
  type: PlateType;
  displayName: string;
  displayNameKo: string;
  description: string;
  studsX: number;
  studsY: number;
  worldWidth: number;
  worldDepth: number;
  worldHeight: number;
  recommendedCapacity: number;
  exampleCidrs: {
    azure: string;
    aws: string;
    gcp: string;
  };
  learningLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  studColors: StudColorSpec;
}
```

### 4.4 Defaults — Implemented

```ts
export const DEFAULT_PLATE_PROFILE: Record<PlateType, PlateProfileId> = {
  network: 'network-platform',
  subnet: 'subnet-service',
};
```

Defaults on `main`:

- new networks default to `network-platform`
- new subnets default to `subnet-service`

### 4.5 Current Plate Color System — Implemented

#### Face Colors

| Plate kind | Top face | Top stroke | Left side | Right side |
|------------|----------|------------|-----------|------------|
| Network | `#2563EB` | `#60A5FA` | `#1D4ED8` | `#1E40AF` |
| Public subnet | `#22C55E` | `#4ADE80` | `#16A34A` | `#15803D` |
| Private subnet | `#6366F1` | `#818CF8` | `#4F46E5` | `#4338CA` |

#### Stud Colors

| Plate kind | Stud main | Stud shadow | Stud highlight |
|------------|-----------|-------------|----------------|
| Network | `#42A5F5` | `#1565C0` | `#90CAF9` |
| Public subnet | `#66BB6A` | `#2E7D32` | `#A5D6A7` |
| Private subnet | `#7986CB` | `#3949AB` | `#C5CAE9` |

### 4.6 Visual Hierarchy — Implemented

Plate side-wall thickness is semantic, not size-tier based:

| Layer | `worldHeight` | Meaning |
|------|---------------|---------|
| Network plate | `0.7` | Thick base network boundary |
| Subnet plate | `0.5` | Medium child boundary inside network |
| Resource block | `0.8` | Separate brick rule in renderer |

Important note:

- network and subnet **plate** thicknesses are stored in the domain model
- resource block side-wall height is currently a renderer constant, not a domain-model size field

### 4.7 Current Multi-Cloud Abstraction — Partial

The following parts are already cloud-neutral:

- `PlateType` uses `network` / `subnet`
- profile IDs avoid provider naming
- `exampleCidrs` stores Azure/AWS/GCP values per profile
- provider terms can be layered on top without changing the architecture model

Provider terminology mapping:

| Provider | Network term | Child boundary term | Current domain model term |
|----------|--------------|---------------------|---------------------------|
| Azure | VNet | Subnet | `network` / `subnet` |
| AWS | VPC | Subnet | `network` / `subnet` |
| GCP | VPC Network | Subnet | `network` / `subnet` |

### 4.8 Planned Provider-Specific Placement Rules

The user's v1.0 spec adds provider-specific placement guidance. That guidance is retained as planned, but not yet implemented in validation.

Canonical direction:

- Azure keeps the existing public/private subnet emphasis and current block placement rules
- AWS may introduce provider-specific expectations for internet-facing gateways and managed services
- GCP may introduce provider-specific networking terminology and examples
- provider-specific rules must be additive and must not break the shared `network` / `subnet` abstraction

Until implemented:

- placement validation remains provider-agnostic
- the current ruleset is effectively Azure-first

### 4.9 Legacy Migration — Implemented

`apps/web/src/shared/types/schema.ts` migrates older plates that do not have `profileId`.

Migration behavior:

1. infer the closest profile from existing `type` + `size`
2. assign `profileId`
3. rewrite `plate.size` to the profile's canonical world size

This makes the plate profile system backward compatible with older saved workspaces.

---

## 5. SVG Specifications — ✅ Implemented

Blocks, plates, studs, connections, and the minifigure are implemented as SVG. Application SVGs remain planned.

### 5.1 Current Rendering Architecture — Implemented

| Visual element | Implementation | Status |
|----------------|----------------|--------|
| Shared stud symbol | `StudDefs` + `StudGrid` | ✅ |
| Resource bricks | `BlockSvg.tsx` | ✅ |
| Plate sprites | `PlateSvg.tsx` | ✅ |
| Connections | `ConnectionPath.tsx` | ✅ |
| External actor | `internet.svg` via `ExternalActorSprite.tsx` | ✅ |
| Minifigure | `MinifigureSvg.tsx` | ✅ |
| App sprites | none | 📋 |

### 5.2 Application SVGs — Planned

The legacy spec described `apps/{name}.svg` assets. That approach is not present on `main`.

Planned requirement:

- application pieces may be implemented as inline SVG React components rather than static files
- the visual form should remain a simple 1×1 cylinder/stud-like piece
- application rendering must reuse the universal stud geometry language where practical

### 5.3 Resource Block SVG — Implemented

`apps/web/src/entities/block/BlockSvg.tsx` generates block SVGs dynamically, and `apps/web/src/shared/tokens/designTokens.ts` provides shared height tokens.

#### Block Geometry Constants

```ts
import {
  BLOCK_MARGIN,
  BLOCK_PADDING,
  TILE_H,
  TILE_W,
  TILE_Z,
  getBlockWorldHeight,
} from '../../shared/tokens/designTokens';
```

#### Block Face Geometry

```ts
const screenWidth = (studsX + studsY) * TILE_W / 2;
const diamondHeight = (studsX + studsY) * TILE_H / 2;
const sideWallPx = Math.round(getBlockWorldHeight(category) * TILE_Z);
const svgHeight = diamondHeight + sideWallPx + BLOCK_PADDING;
```

#### Top and Side Faces

Each block SVG renders:

1. top face polygon
2. left side polygon
3. right side polygon
4. top-left highlight line
5. stud grid
6. label on left wall
7. icon on right wall

#### Block Stud Grid Behavior

Unlike an older version of the size spec, blocks do **not** render a single large stud. The current implementation matches the Lego rule correctly:

- `timer` / `event` render 2 studs
- `function` renders 4 studs
- `gateway` / `queue` / `storage` render 8 studs
- `compute` renders 12 studs
- `database` renders 24 studs

This is one of the most important corrections the current implementation makes relative to stale older text.

### 5.4 Current Block ViewBox and Wrapper Sizes

`BlockSvg` viewBox dimensions and `BlockSprite` wrapper sizes are not always equal.

| Category | Studs | SVG viewBox width | SVG viewBox height | CSS wrapper width | CSS wrapper height |
|----------|-------|-------------------|--------------------|-------------------|--------------------|
| `timer` | 1×2 | 96 | 84 | 72 | 82 |
| `event` | 1×2 | 96 | 84 | 72 | 82 |
| `function` | 2×2 | 128 | 100 | 95 | 86 |
| `gateway` | 2×4 | 192 | 132 | 120 | 110 |
| `queue` | 2×4 | 192 | 132 | 120 | 110 |
| `storage` | 2×4 | 192 | 132 | 120 | 110 |
| `compute` | 3×4 | 224 | 148 | 140 | 128 |
| `database` | 4×6 | 320 | 196 | 160 | 136 |

Implication:

- shared stud geometry is preserved
- old "viewBox = screen size" language should now be read as design intent, not literal runtime behavior

### 5.5 Plate SVG — Implemented

`apps/web/src/entities/plate/PlateSvg.tsx` uses the same geometric pattern as blocks.

#### Plate Geometry Constants

```ts
const TILE_W = 64;
const TILE_H = 32;
const TILE_Z = 32;
const margin = 10;
const padding = 10;
```

#### Plate Geometry

```ts
const screenWidth = (studsX + studsY) * TILE_W / 2;
const diamondHeight = (studsX + studsY) * TILE_H / 2;
const sideWallPx = Math.round(worldHeight * TILE_Z);
const svgHeight = diamondHeight + sideWallPx + padding;
```

Each plate SVG renders:

1. top face polygon
2. left side polygon
3. right side polygon
4. stud grid for the full profile footprint
5. optional label on the left wall
6. optional emoji on the right wall

### 5.6 Current Plate Labels and Emojis

`PlateSprite.tsx` hardcodes current semantic labels:

| Plate kind | Label | Emoji |
|------------|-------|-------|
| Network | `Virtual Network` | `🌐` |
| Public subnet | `Public Subnet` | `🔓` |
| Private subnet | `Private Subnet` | `🔒` |

### 5.7 Universal Stud SVG — Implemented

The actual shared stud definition on `main` is:

```tsx
<g id={studId}>
  <ellipse cx="0" cy="5" rx="12" ry="6" fill={studColors.shadow} />
  <ellipse cx="0" cy="0" rx="12" ry="6" fill={studColors.main} />
  <ellipse cx="0" cy="0" rx="7.2" ry="3.6" fill={studColors.highlight} opacity="0.3" />
</g>
```

This is the true runtime canonical stud structure.

### 5.8 Stud Grid Placement Math — Implemented

Both `BlockSvg` and `PlateSvg` use the same grid algorithm.

```ts
const halfW = screenWidth / 2 - margin;
const halfH = diamondHeight / 2;

const stepXx = halfW / studsX;
const stepXy = halfH / studsX;
const stepZx = -halfW / studsY;
const stepZy = halfH / studsY;

const startX = cx + stepXx * 0.5 + stepZx * 0.5;
const startY = topY + stepXy * 0.5 + stepZy * 0.5;
```

For each stud:

```ts
x = startX + gx * stepXx + gz * stepZx;
y = startY + gx * stepXy + gz * stepZy;
```

### 5.9 Connection SVG — Implemented

Connections use SVG paths, not canvas or WebGL.

#### Current path shape

```ts
const midX = (srcScreen.x + tgtScreen.x) / 2;
const midY = Math.min(srcScreen.y, tgtScreen.y) - 40;
const pathD = `M ${srcScreen.x} ${srcScreen.y} Q ${midX} ${midY} ${tgtScreen.x} ${tgtScreen.y}`;
```

#### Current arrow rendering

Two strokes are drawn:

- background stroke: `4px`
- foreground stroke: `2px`
- arrow markers are attached to the foreground and background paths separately

#### Current diff-aware coloring

| Diff state | Background stroke | Foreground stroke |
|------------|-------------------|-------------------|
| `unchanged` | `#1e293b` | `#64748b` |
| `added` | `#166534` | `#22c55e` |
| `modified` | `#854d0e` | `#eab308` |
| `removed` | `#991b1b` | `#ef4444` |

### 5.10 External Actor Rendering — Implemented

Connections may terminate on an external actor:

```ts
export interface ExternalActor {
  id: string;
  name: string;
  type: 'internet';
}
```

Current implementation:

- only one external actor type exists: `internet`
- it renders as a separate sprite outside the plate stack
- it participates in connection rules and world-position calculations

---

## 6. TypeScript Type Definitions — ✅ Implemented

Core brick, plate, and connection types are implemented. Application types, provider-selectable brick themes, semantic connection kinds, and design tokens are still planned.

### 6.1 Core Domain Types — Implemented

```ts
export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  subnetAccess?: SubnetAccess;
  profileId?: PlateProfileId;
  parentId: string | null;
  children: string[];
  position: Position;
  size: Size;
  metadata: Record<string, unknown>;
}

export interface Block {
  id: string;
  name: string;
  category: BlockCategory;
  placementId: string;
  position: Position;
  metadata: Record<string, unknown>;
  provider?: ProviderType;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  metadata: Record<string, unknown>;
}
```

### 6.2 Connection Type — Implemented

```ts
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';
```

Current rule:

- the architecture model supports five connection kinds
- `addConnection` in `domainSlice.ts` still defaults newly created connections to `type: 'dataflow'`

### 6.3 Plate Profile Types — Implemented

```ts
export type NetworkProfileId =
  | 'network-sandbox'
  | 'network-application'
  | 'network-platform'
  | 'network-hub';

export type SubnetProfileId =
  | 'subnet-utility'
  | 'subnet-service'
  | 'subnet-workload'
  | 'subnet-scale';

export type PlateProfileId = NetworkProfileId | SubnetProfileId;
```

Helper API:

```ts
export function getPlateProfile(profileId: PlateProfileId): PlateProfile;
export function buildPlateSizeFromProfileId(profileId: PlateProfileId): Size;
export function inferLegacyPlateProfileId(legacyPlate: {
  type: PlateType;
  size: { width: number; depth: number };
}): PlateProfileId;
export function getPlateStudColors(plate: {
  type: PlateType;
  subnetAccess?: SubnetAccess;
}): StudColorSpec;
```

### 6.4 Visual Profile Types — Implemented

```ts
export type BrickSizeTier = 'signal' | 'light' | 'service' | 'core' | 'anchor';
export type BrickSurface = 'studded';
export type BrickSilhouette = 'tower' | 'heavy' | 'shield' | 'module';

export interface BlockVisualProfile {
  tier: BrickSizeTier;
  surface: BrickSurface;
  silhouette: BrickSilhouette;
  footprint: [number, number];
  hostable: boolean;
  appCapacity: number;
}
```

### 6.5 Provider Types — Partial

There are two separate provider-related type surfaces today.

#### Domain block provider

```ts
export type ProviderType = 'azure' | 'aws' | 'gcp';

export interface Block {
  // ...
  provider?: ProviderType;
}
```

This provider field is part of the core `Block` interface in `shared/types/index.ts`.

#### Character / theme accent provider

```ts
export type CloudProvider = 'azure' | 'aws' | 'gcp';
```

This is currently used only by the minifigure.

#### Code generation provider

```ts
export type ProviderName = 'azure';
```

This is used by generation and confirms that the infrastructure pipeline is still Azure-only.

### 6.6 Current Provider Accent Palette — Implemented for Minifigure Only

From `minifigureFaceColors.ts`:

| Provider | Torso top | Torso front | Torso side |
|----------|-----------|-------------|------------|
| Azure | `#078DCE` | `#067AB3` | `#0570A4` |
| AWS | `#FF9900` | `#E68A00` | `#CC7A00` |
| GCP | `#FFFFFF` | `#EBEBEB` | `#E0E0E0` |

These are **not** yet the block palette system; they are only existing multi-provider visual hooks.

### 6.7 Planned Multi-Cloud Brick Theme Types

To support the user's provider-specific color palettes without breaking the current category model, the future type direction is:

```ts
export type PlannedBrickProvider = 'azure' | 'aws' | 'gcp';

export interface PlannedProviderPalette {
  provider: PlannedBrickProvider;
  categories: Record<BlockCategory, {
    topFace: string;
    topStroke: string;
    leftSide: string;
    rightSide: string;
    studMain: string;
    studShadow: string;
    studHighlight: string;
  }>;
}
```

Rules for that future type:

- category slots stay stable across providers
- only the theme changes
- stud geometry does not change
- provider switch must not alter block footprint, tier, hostability, or placement rules at the domain level

### 6.8 Planned Application Types

```ts
export interface App {
  id: string;
  definitionId: string;
  hostBlockId: string;
  slotIndex: number;
  metadata: Record<string, unknown>;
}
```

This does not exist yet in the architecture model.

### 6.9 Planned Design Token Types

The current implementation uses hardcoded constants in TypeScript and CSS. A formal token layer is still planned.

```ts
export interface BrickDesignTokens {
  geometry: {
    tileW: number;
    tileH: number;
    tileZ: number;
    studRx: number;
    studRy: number;
    studHeight: number;
    blockWallHeight: number;
    networkPlateHeight: number;
    subnetPlateHeight: number;
  };
  motion: {
    dragBounceMs: number;
    dropBounceMs: number;
    selectionPulseMs: number;
  };
  themes: {
    providers: Record<'azure' | 'aws' | 'gcp', unknown>;
    plates: Record<'network' | 'publicSubnet' | 'privateSubnet', unknown>;
  };
}
```

---

## 7. 2:1 Dimetric Isometric Projection — ✅ Implemented

Projection math is implemented in `apps/web/src/shared/utils/isometric.ts`.

### 7.1 Canonical Constants

```ts
export const SCALE = 64;
const TILE_W = SCALE;
const TILE_H = SCALE / 2;
const TILE_Z = SCALE / 2;
export const GRID_CELL = 3.0;
```

Resolved values:

| Constant | Value |
|----------|-------|
| `SCALE` | `64` |
| `TILE_W` | `64` |
| `TILE_H` | `32` |
| `TILE_Z` | `32` |
| `GRID_CELL` | `3.0` world units |

### 7.2 World-to-Screen Formula

```ts
screenX = originX + (worldX - worldZ) * TILE_W / 2
screenY = originY + (worldX + worldZ) * TILE_H / 2 - worldY * TILE_Z
```

Interpretation:

- `X` axis moves right-back
- `Z` axis moves left-back
- `Y` axis moves up / elevation

### 7.3 Screen-to-World Formula

```ts
worldX = sx / TILE_W + sy / TILE_H
worldZ = sy / TILE_H - sx / TILE_W
```

This is used with a selected `worldY` plane when reversing pointer coordinates.

### 7.4 Drag Delta Projection

```ts
dWorldX = dxScreen / TILE_W + dyScreen / TILE_H
dWorldZ = dyScreen / TILE_H - dxScreen / TILE_W
```

This is what powers block and plate dragging in the sprite wrappers.

### 7.5 Bounding Box Conversion

```ts
screenWidth  = (width + depth) * TILE_W / 2
screenHeight = (width + depth) * TILE_H / 2 + height * TILE_Z
```

That formula is used by `worldSizeToScreen()` to size plate wrappers.

### 7.6 Depth Sorting — Implemented

```ts
sortKey = layer * 1_000_000 + frontness
frontness = worldX + worldZ + worldY
```

Current layer usage:

| Layer number | Meaning |
|--------------|---------|
| `0` | plates |
| `1` | external actors / minifigure |
| `2` | blocks |

### 7.7 Current Scene Layering

`SceneCanvas.tsx` renders in this order:

1. plate layer
2. connection SVG layer
3. actor layer
4. minifigure layer
5. block layer

That order is reinforced by z-index math.

### 7.8 Spatial Model Notes

The editor remains **2D-first** conceptually:

- plates store world positions
- blocks store positions relative to parent plates
- the 2.5D appearance is projection, not a true 3D editing model

Absolute block world position is resolved as:

```ts
[
  parentPlate.position.x + block.position.x,
  parentPlate.position.y + parentPlate.size.height,
  parentPlate.position.z + block.position.z,
]
```

### 7.9 External Actor Position

`apps/web/src/shared/utils/position.ts` currently fixes the Internet actor at:

```ts
export const EXTERNAL_ACTOR_POSITION: [number, number, number] = [-3, 0, 5];
```

That is implementation detail, not a cross-provider design invariant.

---

## 8. Placement Rules — ✅ Implemented

Category-to-container validation is implemented. True footprint-aware placement, collision handling, and provider-specific overrides are not.

### 8.1 Implemented Placement Validation

`apps/web/src/entities/validation/placement.ts` defines the current rules.

| Block category | Allowed plate | Implemented rule |
|----------------|--------------|------------------|
| `compute` | any subnet | `plate.type === 'subnet'` |
| `database` | private subnet | `plate.type === 'subnet' && plate.subnetAccess === 'private'` |
| `gateway` | public subnet | `plate.type === 'subnet' && plate.subnetAccess === 'public'` |
| `storage` | any subnet | `plate.type === 'subnet'` |
| `function` | network only | `plate.type === 'network'` |
| `queue` | network only | `plate.type === 'network'` |
| `event` | network only | `plate.type === 'network'` |
| `timer` | network only | `plate.type === 'network'` |

This reflects the current serverless/network modeling choice on `main`.

### 8.2 Drag-to-Create Gatekeeping — Implemented

`canPlaceBlock(category, plate)` creates a stub block and reuses the same validation function. This powers:

- valid drop target highlighting
- invalid drop target highlighting
- actual block creation on pointer release

### 8.3 Plate Creation and Initial Positioning — Implemented

In `domainSlice.ts`:

- root networks are created at `{ x: 0, y: 0, z: 0 }`
- child subnets are positioned relative to their parent network
- subnet positions are clamped inside the parent network
- child subnet elevation is set to `parentPlate.position.y + parentPlate.size.height`

### 8.4 Block Creation and Initial Positioning — Implemented

When a block is added:

- it is assigned to a parent plate by `placementId`
- it gets the next grid position from `nextGridPosition(existingBlocksOnPlate, plate.size)`
- its initial local `y` is set to `0.5`

`nextGridPosition()` currently uses:

```ts
const blockWidth = DEFAULT_BLOCK_SIZE.width;
const blockDepth = DEFAULT_BLOCK_SIZE.depth;
const spacing = 0.2;
const stepX = blockWidth + spacing;
const stepZ = blockDepth + spacing;
```

Again, this uses the uniform logical block size, not visual stud footprint.

### 8.5 Movement and Snapping — Implemented

Both plates and blocks:

- drag in screen space
- convert to world-space delta through `screenDeltaToWorld()`
- snap to the world grid on drag end through `snapToGrid()`

Current snap function:

```ts
export function snapToGrid(worldX: number, worldZ: number): { x: number; z: number } {
  return {
    x: Math.round(worldX / GRID_CELL) * GRID_CELL,
    z: Math.round(worldZ / GRID_CELL) * GRID_CELL,
  };
}
```

### 8.6 Containment Clamping — Implemented

Plates and blocks are clamped within parent bounds using:

```ts
minX = -(parentSize.width / 2) + childSize.width / 2;
maxX =  parentSize.width / 2  - childSize.width / 2;
minZ = -(parentSize.depth / 2) + childSize.depth / 2;
maxZ =  parentSize.depth / 2  - childSize.depth / 2;
```

This works today for:

- subnet inside network containment
- block inside plate containment

### 8.7 Profile Resize Behavior — Implemented

`setPlateProfile(plateId, profileId)`:

1. rewrites the plate size from the profile
2. keeps the same plate identity
3. reclamps child subnet position if needed

That means profile changes are already part of the editing model.

### 8.8 Known Placement Gaps

These are the missing pieces that keep this section in **partial** state:

- no collision detection between blocks
- no occupancy grid based on actual block footprint
- no app-layer placement rules
- no provider-specific placement overrides
- no rule that validates semantic plate capacity against actual occupied area

### 8.9 Planned Provider-Specific Placement Layer

Future provider rules must sit on top of the current abstraction:

- shared rules stay defined at `network` / `subnet` level
- provider adapters may add extra guidance or validation messages
- provider-specific rules must not require the domain model to rename `network` or `subnet`

---

## 9. Connection Model — ✅ Implemented

The current system has a strong directional model and solid rendering, with five modeled connection types.

### 9.1 Current Connection Type

```ts
export type ConnectionType = 'dataflow' | 'http' | 'internal' | 'data' | 'async';
```

`domainSlice.ts` currently creates new connections as:

```ts
{
  id: generateId('conn'),
  sourceId,
  targetId,
  type: 'dataflow',
  metadata: {},
}
```

### 9.2 Current Direction Rule — Implemented

Connections encode **initiator direction**.

That means:

- arrow points from the caller / sender / initiator
- responses are implied
- reverse arrows are not required for request-response behavior

### 9.3 Implemented Allowed Connection Matrix

`apps/web/src/entities/validation/connection.ts` defines the current matrix:

| Source | Allowed targets |
|--------|-----------------|
| `internet` | `gateway` |
| `gateway` | `compute`, `function` |
| `compute` | `database`, `storage` |
| `function` | `storage`, `database`, `queue` |
| `queue` | `function` |
| `timer` | `function` |
| `event` | `function` |

Explicit rules:

- `database` is receiver-only
- `storage` is receiver-only
- self-connections are invalid
- missing source or target IDs are invalid

### 9.4 Current Rendering Rules — Implemented

Each connection:

- resolves endpoint world positions
- projects them into screen coordinates
- draws a quadratic bezier
- adds an arrow marker
- recolors by diff state when diff mode is active

### 9.5 Current Connect UX — Implemented

The builder currently supports connect mode using UI store fields:

```ts
export type ToolMode = 'select' | 'connect' | 'delete';
connectionSource: string | null;
```

Behavior:

1. first click selects a source block
2. second click on a different valid block creates the connection
3. invalid targets are highlighted during connect mode

### 9.6 Semantic Connection Types — Implemented in Model

The richer connection semantics are now implemented in `ConnectionType`.

```ts
export type ConnectionType =
  | 'dataflow'
  | 'http'
  | 'internal'
  | 'data'
  | 'async';
```

Current meanings:

| Kind | Intended meaning | Current creation behavior |
|------|------------------|---------------------------|
| `dataflow` | generic directional flow | default in `addConnection` |
| `http` | ingress/API request flow | supported by type union |
| `internal` | private service-to-service call | supported by type union |
| `data` | database/storage data access | supported by type union |
| `async` | queue/event/timer messaging | supported by type union |

Current implementation notes:

- semantic type is now represented in the model type system
- initiator direction must remain unchanged
- UI creation flow still defaults to `dataflow`
- semantic-specific styling/filtering UX remains future work

### 9.7 What Is Missing

- renderer styling by semantic type
- migration rules from legacy `dataflow` usage to richer kinds
- validation messages aware of semantic kind
- UI affordance to choose connection kind at creation time

---

## 10. UX State Machine — 📋 Planned

The user's v1.0 spec adds a formal state machine. `main` does not yet implement that machine.

### 10.1 What Exists Today

The current UI state is distributed across store fields:

```ts
selectedId: string | null;
toolMode: 'select' | 'connect' | 'delete';
connectionSource: string | null;
draggedBlockCategory: BlockCategory | null;
draggedResourceName: string | null;
```

This provides working behavior, but not an explicit canonical state machine.

### 10.2 Planned Canonical States

The future builder state machine should use these top-level interaction states:

| Planned state | Meaning |
|---------------|---------|
| `idle` | nothing selected; default browse state |
| `selecting` | inspecting or manipulating a selected entity |
| `dragging` | moving an existing plate or block |
| `placing` | dragging a new resource toward a valid target |
| `connecting` | selecting source and target endpoints |

### 10.3 Planned Transitions

| From | Trigger | To |
|------|---------|----|
| `idle` | click entity | `selecting` |
| `idle` | start dragging new palette item | `placing` |
| `idle` | start connect tool | `connecting` |
| `selecting` | drag selected entity | `dragging` |
| `selecting` | click empty canvas | `idle` |
| `dragging` | drop entity | `selecting` |
| `placing` | drop on valid plate | `selecting` |
| `placing` | cancel / invalid drop | `idle` |
| `connecting` | pick source + target | `selecting` |
| `connecting` | cancel | `idle` |

### 10.4 Planned Visual Feedback Rules

The state machine should standardize the feedback that already exists piecemeal today:

| State | Visual signals |
|-------|----------------|
| `selecting` | selection outline, details panel context |
| `dragging` | dragging class, shadow, bounce/drop animation |
| `placing` | valid/invalid drop target highlights |
| `connecting` | source highlight, valid/invalid target highlighting, preview path |
| `idle` | no active emphasis |

### 10.5 Why This Is Planned, Not Implemented

Current behavior is spread across:

- `toolMode`
- `connectionSource`
- drag refs local to sprite components
- CSS classes triggered by component state

That is sufficient for shipping behavior, but it is not yet a canonical state machine with explicit transitions, guards, or testable statechart semantics.

---

## 11. Implementation Checklist — 🚧 Partial

This checklist replaces the old milestone list with a reality-based status board.

### 11.1 Completed on `main`

#### Stud System

- [x] Shared universal stud renderer via `IsometricStud.tsx`
- [x] 3-layer stud structure (shadow + top + inner ring)
- [x] Per-element stud color theming without geometry changes
- [x] Stud grids on both blocks and plates

#### Resource Bricks

- [x] Parameterized `BlockSvg` renderer
- [x] Eight block categories
- [x] Five visual size tiers
- [x] Category-specific stud layouts
- [x] Category-specific face shading and stud colors
- [x] Label + icon rendering on side faces

#### Plates

- [x] Parameterized `PlateSvg` renderer
- [x] Eight plate profiles
- [x] Profile-based sizing
- [x] Network / subnet default profiles
- [x] Public vs private subnet visual treatment
- [x] Legacy plate migration by inferred profile
- [x] Plate profile editing support in the store

#### Projection / Scene

- [x] 2:1 dimetric projection math
- [x] Depth sorting
- [x] Screen/world drag projection
- [x] World-grid snap on drag end
- [x] DOM/CSS/SVG render stack without WebGL dependency

#### Connections

- [x] Directional connection model
- [x] Current allowed-connection validation rules
- [x] SVG bezier path renderer with arrow markers
- [x] Diff-aware connection recoloring

### 11.2 Partial on `main`

- [x] Resource size tiers render correctly
- [ ] Resource logical footprint matches rendered footprint (planned for #254)
- [x] Multi-cloud plate examples exist via `exampleCidrs`
- [x] Multi-cloud brick themes exist for Azure/AWS/GCP
- [x] Multi-provider minifigure accents exist
- [ ] Provider-selectable brick palette exists in the editor
- [x] Connect mode exists
- [x] Semantic connection kinds exist beyond `dataflow` (type union is implemented)

### 11.3 Planned Work

#### Application Layer

- [ ] Add `App` entity type
- [ ] Add application placement and serialization
- [ ] Add `AppSprite` / `AppSvg`
- [ ] Enforce host app capacity by block type
- [ ] Add built-in application catalog

#### Shape System

- [x] Add non-`standard` silhouettes in visual profile types
- [x] Implement `tower`, `heavy`, `shield`, `module` silhouette assignments
- [ ] Preserve current stud grid logic across silhouette variants
- [ ] Update hitboxes and selection outlines for new shapes

#### Multi-Cloud Brick Themes

- [ ] Add provider-selectable brick palettes
- [ ] Extend Azure-first block colors into provider theme registry
- [ ] Wire provider choice into rendering
- [ ] Add provider-specific icon packs where appropriate
- [ ] Add provider-specific placement guidance in validation copy

#### Connections

- [x] Add semantic types: `http`, `internal`, `data`, `async`
- [ ] Style connections by semantic type
- [ ] Add UI for choosing connection kind
- [ ] Add migration path from legacy `dataflow`

#### UX State Model

- [ ] Replace ad hoc tool-state combination with explicit interaction state machine
- [ ] Add canonical transition guards
- [ ] Centralize hover/drag/connect visual semantics
- [ ] Add tests at the state-machine level

#### Design Tokens

- [ ] Extract geometry constants into token registry
- [ ] Extract plate and block theme tokens
- [ ] Extract motion timing tokens
- [ ] Standardize provider theme token shape

### 11.4 Release Gates for Future Brick Work

Any future brick-system change is blocked until it preserves:

- universal stud dimensions and 3-layer structure
- 2:1 dimetric projection
- provider-neutral domain types (`network`, `subnet`)
- backward compatibility for saved workspaces where feasible

---

## 12. Open Questions — 📋 Planned

1. **Footprint-accurate placement**: should resource placement move from uniform `DEFAULT_BLOCK_SIZE` to true per-category occupied area, or stay visually pedagogical for now?

2. **Application modeling**: should apps be first-class entities in the architecture model, or lightweight decorations attached to blocks?

3. **Provider theming scope**: should provider switching change only color/icon language, or also default placement guidance and example templates?

4. **Connection migration**: when semantic connection kinds ship, should old `dataflow` connections stay as-is or auto-map by source/target categories?

5. **Shape system rollout**: should all categories adopt new silhouettes at once, or should the project start with the most semantically distinct cases (`gateway`, `compute`, `database`)?

### Revisit Triggers

A more complex design is justified if any of these become true:

- block collision bugs become common because visual and logical footprints diverge too much
- multi-cloud provider selection becomes a user-facing feature, not just a code-generation concern
- the application layer ships and needs true top-surface slot layout
- connection styling needs to distinguish transport semantics clearly in the canvas

---

## Appendix A. Reference Dimensions

### A.1 Current Resource SVG Geometry

| Category | Studs | Tier | ViewBox width | ViewBox height | Wall height px |
|----------|-------|------|---------------|----------------|----------------|
| `timer` | 1×2 | signal | 96 | 84 | 26 |
| `event` | 1×2 | signal | 96 | 84 | 26 |
| `function` | 2×2 | light | 128 | 100 | 26 |
| `gateway` | 2×4 | service | 192 | 132 | 26 |
| `queue` | 2×4 | service | 192 | 132 | 26 |
| `storage` | 2×4 | service | 192 | 132 | 26 |
| `compute` | 3×4 | core | 224 | 148 | 26 |
| `database` | 4×6 | anchor | 320 | 196 | 26 |

### A.2 Current Resource Wrapper Dimensions

| Category | Wrapper width | Wrapper height |
|----------|---------------|----------------|
| `timer` | 72 | 82 |
| `event` | 72 | 82 |
| `function` | 95 | 86 |
| `gateway` | 120 | 110 |
| `queue` | 120 | 110 |
| `storage` | 120 | 110 |
| `compute` | 140 | 128 |
| `database` | 160 | 136 |

### A.3 Current Plate Screen Dimensions by Profile

Using `worldSizeToScreen(width, height, depth)`:

| Profile ID | World size | `worldHeight` | Screen width | Screen height |
|------------|------------|---------------|--------------|---------------|
| `network-sandbox` | 8×12 | 0.7 | 640 | 342.4 |
| `network-application` | 12×16 | 0.7 | 896 | 470.4 |
| `network-platform` | 16×20 | 0.7 | 1152 | 598.4 |
| `network-hub` | 20×24 | 0.7 | 1408 | 726.4 |
| `subnet-utility` | 4×6 | 0.5 | 320 | 176 |
| `subnet-service` | 6×8 | 0.5 | 448 | 240 |
| `subnet-workload` | 8×10 | 0.5 | 576 | 304 |
| `subnet-scale` | 10×12 | 0.5 | 704 | 368 |

### A.4 Stud Invariants

| Property | Runtime value |
|----------|---------------|
| Outer `rx` | `12` |
| Outer `ry` | `6` |
| Shadow/body offset | `5` on Y |
| Inner ring `rx` | `7.2` |
| Inner ring `ry` | `3.6` |
| Inner ring opacity | `0.3` |

### A.5 Current World-Space Defaults

| Concern | Value |
|---------|-------|
| `DEFAULT_BLOCK_SIZE.width` | `2.4` |
| `DEFAULT_BLOCK_SIZE.height` | `2.4` |
| `DEFAULT_BLOCK_SIZE.depth` | `2.4` |
| block spawn local `y` | `0.5` |
| snap grid cell | `3.0` |
| network default profile | `network-platform` |
| subnet default profile | `subnet-service` |

---

## Appendix B. Canonical Source Map

Use these files as the code references for implemented sections:

| Topic | Source file |
|-------|-------------|
| Stud geometry | `apps/web/src/shared/components/IsometricStud.tsx` |
| Block categories and plate profiles | `apps/web/src/shared/types/index.ts` |
| Block visual tiers and hostability | `apps/web/src/shared/types/visualProfile.ts` |
| Block faces and stud colors | `apps/web/src/entities/block/blockFaceColors.ts` |
| Plate face colors | `apps/web/src/entities/plate/plateFaceColors.ts` |
| Resource SVG renderer | `apps/web/src/entities/block/BlockSvg.tsx` |
| Plate SVG renderer | `apps/web/src/entities/plate/PlateSvg.tsx` |
| Connection SVG renderer | `apps/web/src/entities/connection/ConnectionPath.tsx` |
| Placement validation | `apps/web/src/entities/validation/placement.ts` |
| Connection validation | `apps/web/src/entities/validation/connection.ts` |
| Projection math | `apps/web/src/shared/utils/isometric.ts` |
| Endpoint positioning | `apps/web/src/shared/utils/position.ts` |
| Scene composition | `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` |
| Store actions and placement behavior | `apps/web/src/entities/store/slices/domainSlice.ts` |
| Legacy schema migration | `apps/web/src/shared/types/schema.ts` |
| Provider accents (minifigure) | `apps/web/src/entities/character/minifigureFaceColors.ts` |
| Azure provider mapping | `apps/web/src/features/generate/provider.ts` |
| Azure-only generator provider enum | `apps/web/src/features/generate/types.ts` |

---

## Appendix C. Deduplication Decisions

This canonical spec intentionally consolidates repeated content from the legacy size spec and the user's v1.0 draft:

- category definitions now live once in **§3 Resource Layer**
- plate profile definitions now live once in **§4 Plate Layer**
- connection semantics now live once in **§9 Connection Model**
- UX interaction states now live once in **§10 UX State Machine**
- implementation progress now lives once in **§11 Implementation Checklist**
- provider abstraction lives once across **§4**, **§6**, and **§9** without repeating per-category tables

The rule for future edits is simple:

- do not duplicate geometry rules outside **§0**, **§5**, and **§7**
- do not duplicate type definitions outside **§6**
- do not duplicate placement rules outside **§8**
- do not duplicate connection semantics outside **§9**
- do not duplicate implementation status outside **§11**
