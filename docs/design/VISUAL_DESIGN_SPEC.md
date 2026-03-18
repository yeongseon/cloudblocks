# Visual Design Spec — Lego-Style Cloud Architecture

**Status**: Accepted
**Date**: 2025-03
**Related**: [ADR-0003](../adr/0003-lego-style-composition-model.md), [ADR-0005](../adr/0005-2d-first-editor-with-25d-rendering.md) (Rendering has evolved to 2:1 dimetric isometric projection)

---

## 1. Design Vision

CloudBlocks' visual identity is a **toy-like, tactile Lego baseplate** where cloud resources sit as colorful building bricks. The aesthetic is warm, approachable, and educational — not cold/technical. Users should feel like they're playing with building blocks in a **2:1 dimetric isometric perspective**.


### Target Audience

CloudBlocks is designed as an **educational tool** first. The primary users are:

- **Cloud beginners** — students, junior developers, career switchers learning cloud architecture for the first time
- **Non-engineers** — product managers, designers, business stakeholders who need to understand infrastructure
- **Educators** — instructors teaching cloud concepts in classrooms or workshops

These users may not know what "VPC", "subnet", or "load balancer" means. The UI must **teach through interaction**, not assume prior knowledge.

### Reference

```
+------------------------------------------------------+
|  Cloud Architecture — Lego Style                     |
|                                                       |
|  ┌── VPC (blue baseplate) ──────────────────┐        |
|  │  ┌── Public Subnet ──┐  ┌── Private ──┐ │  Legend |
|  │  │  [ALB]  →  [EC2]  │→ │ [App] [RDS] │ │  ───── |
|  │  │  (purple)  (orange)│  │ (orange)(blue)│ │  VPC  |
|  │  └───────────────────-┘  │      ↗ [S3] │ │  Sub.. |
|  │                          └─────────────-┘ │  ALB  |
|  └──────────────────────────────────────────-┘  ...  |
|                                                       |
|  Internet → ALB → EC2 → App → RDS → S3  (flow bar)  |
+------------------------------------------------------+
```

### Key Qualities

| Quality | Description |
|---------|-------------|
| **Tactile** | Blocks look like real Lego bricks — studs, rounded edges, plastic sheen |
| **Warm** | Light background, soft shadows, friendly color palette |
| **Clear** | Every service type has a distinct color + icon |
| **Layered** | VPC → Subnet → Block hierarchy is visually obvious via baseplate nesting |
| **Informative** | Legend panel + flow diagram give context at a glance |
| **Educational** | Tooltips explain "what" and "why", labels use plain language alongside technical terms |
| **Forgiving** | Placement rules guide rather than punish — show valid spots, explain constraints |

---

## 2. Color System

### 2.1 Block Colors (by category)

These map to the `BlockCategory` type in `shared/types/index.ts`.

| Category | Color | Hex | Visual Reference |
|----------|-------|-----|-----------------|
| `gateway` | Purple | `#7B1FA2` | ALB, App Gateway, Load Balancer |
| `compute` | Orange | `#F57C00` | EC2, VM, Container App |
| `database` | Dark Blue | `#1565C0` | RDS, SQL Database |
| `storage` | Green | `#2E7D32` | S3, Blob Storage |
| `function` | Cyan | `#00838F` | Lambda, Azure Function |
| `queue` | Pink | `#AD1457` | SQS, Service Bus Queue |
| `event` | Indigo | `#283593` | EventGrid, SNS |
| `timer` | Brown | `#4E342E` | CloudWatch Timer |

### 2.2 Plate Colors

| Plate | Color | Hex | Opacity |
|-------|-------|-----|---------|
| Network (VPC) | Royal Blue | `#1565C0` | 1.0 (opaque) |
| Subnet — Public | Bright Green | `#388E3C` | 1.0 (opaque) |
| Subnet — Private | Steel Blue | `#1976D2` | 1.0 (opaque) |

### 2.3 Connection Colors

| Connection Context | Color | Hex |
|-------------------|-------|-----|
| External → Gateway | White | `#FFFFFF` |
| Gateway → Compute | Green | `#4CAF50` |
| Compute → Compute | Blue | `#42A5F5` |
| Compute → Database | Blue | `#42A5F5` |
| Compute → Storage | Amber | `#FFC107` |
| Default | Light Gray | `#B0BEC5` |

### 2.4 Scene Colors

| Element | Value |
|---------|-------|
| Canvas background | `#E8DCC8` (warm beige, "wooden table") |
| Grid lines | Hidden (baseplates provide structure) |
| Ambient light | `0.6` intensity |
| Directional light | `1.2` intensity, warm white |
| Shadow | Soft, subtle, `shadow-radius: 4` |

---

## 3. Block Geometry — Lego Brick

CloudBlocks uses a **3-layer Lego-style visual system**. Blocks (resource layer) render as realistic Lego bricks with studs on top, where Applications (application layer) can sit.

 > **Canonical size specification**: See [BRICK_DESIGN_SPEC.md](./BRICK_DESIGN_SPEC.md) for detailed stud/pixel dimensions and resource mappings.

### 3.1 Brick Size Tiers (5 Levels)

Each block category maps to a specific brick size based on architectural weight:

| Tier | Name | Studs | Pixel Size | Hostable | Resources |
|------|------|-------|------------|----------|-----------|
| 1 | **signal** | 1×2 | 40×80 | No | timer, event |
| 2 | **light** | 2×2 | 80×80 | Yes (1 app) | function |
| 3 | **service** | 2×4 | 80×160 | No | gateway, queue, storage |
| 4 | **core** | 3×4 | 120×160 | Yes (3-4 apps) | compute |
| 5 | **anchor** | 4×6 | 160×240 | No | database |

> **Hostable**: Only `light` (function) and `core` (compute) can host user applications. Other resources are managed services.

### 3.2 Brick Body

Blocks are rendered as **isometric 3D shapes** with a diamond-shaped top face and two visible side faces.

```
      / \
     / O \   ← stud (cylinder on top) — apps sit here
    / / \ \
   | |   | |
   | ICON  | ← service icon and label on side face
    \     /
     \___/
```

| Property | Value | Notes |
|----------|-------|-------|
| Projection | 2:1 Dimetric Isometric | `W=64, H=32` |
| Stud unit | `40px` (Logical) | Maps to isometric grid units |
| Corner radius | `0.08` | Rounded edges (SVG path corner profile) |
| Material | `meshStandardMaterial` | `roughness: 0.35`, `metalness: 0.05` — ABS plastic look |

### 3.3 Studs & Application Slots

Studs on brick top surface serve as **application placement slots** for hostable resources only. In isometric view, these are rendered as cylindrical protrusions with elliptical tops.

| Brick Size | Stud Grid | Hostable | App Slots | Example |
|------------|-----------|----------|-----------|---------|
| signal (1×2) | 1×2 | No | 0 | Timer (trigger only) |
| light (2×2) | 2×2 | Yes | 1 | Function + nodejs handler |
| service (2×4) | 2×4 | No | 0 | Gateway (managed, no apps) |
| core (3×4) | 3×4 | Yes | 3-4 | Compute + nginx + python + redis |
| anchor (4×6) | 4×6 | No | 0 | Database (managed, no apps) |

> **Key rule**: Applications can only be placed on **hostable** resources (`compute`, `function`). Managed services (`gateway`, `queue`, `storage`, `database`) do not host user applications.

| Property | Value |
|----------|-------|
| Stud rx | `19` (SVG/screen px) |
| Stud ry | `9.5` (SVG/screen px) |
| Stud height | `7px` (cylinder extrusion) |
| Stud structure | 3 layers: shadow ellipse + top ellipse + inner ring |
| Spacing | 1 SCALE unit (64px) center-to-center, isometric diamond grid |
| Color | Same hue as brick body; see BRICK_DESIGN_SPEC.md §3.6 for exact values |

> **INVIOLABLE**: All studs use identical dimensions. See [BRICK_DESIGN_SPEC.md §0](./BRICK_DESIGN_SPEC.md#0-universal-stud-standard-inviolable) for the canonical standard.


### 3.4 Application Layer (1×1 Cylinders)

Applications are **small cylindrical pieces** that sit on top of resource bricks:

| Property | Value |
|----------|-------|
| Shape | Cylinder (like Lego stud) |
| Size | 1×1 stud (40×40 px base) |
| Height | 20px (shorter than brick) |
| Position | On stud slots of parent brick |

| App Category | Examples | Color |
|--------------|----------|-------|
| web-server | nginx, apache | `#4CAF50` Green |
| runtime | nodejs, deno | `#8BC34A` Light Green |
| language | java, python | `#FF9800` Orange |
| database | postgres, redis | `#2196F3` Blue |
| package | npm, docker | `#9C27B0` Purple |

### 3.5 Service Icon

Rendered as an `<Html>` overlay on the block's front face.

| Property | Value |
|----------|-------|
| Position | Center of block, slightly above midpoint |
| Size | `20px` icon + `10px` label text |
| Background | White rounded rectangle, `opacity: 0.9` |
| Font | `'Inter', system-ui, sans-serif`, weight 600 |

Service icons use Unicode/emoji for MVP (future: custom SVG icons):

| Category | Icon | Friendly Name | Plain-Language Subtitle |
|----------|------|---------------|------------------------|
| `gateway` | `LB` (text badge) | Load Balancer | "Distributes incoming traffic" |
| `compute` | `VM` (text badge) | Virtual Machine | "Runs your application code" |
| `database` | `DB` (text badge) | Database | "Stores structured data" |
| `storage` | `S3` (text badge) | Object Storage | "Stores files and media" |
| `function` | `FN` (text badge) | Function | "Runs code on demand" |
| `queue` | `MQ` (text badge) | Message Queue | "Buffers messages between services" |
| `event` | `EV` (text badge) | Event Hub | "Routes events to subscribers" |
| `timer` | `TM` (text badge) | Timer | "Triggers actions on a schedule" |

> **Educational principle**: Block labels always show the **friendly name** (e.g., "Load Balancer"), not the cloud-specific abbreviation (e.g., "ALB"). The cloud-specific name appears in the tooltip and properties panel.

### 3.6 Selection / Hover

| State | Effect |
|-------|--------|
| Hover | `emissiveIntensity: 0.15`, cursor: `pointer` |
| Selected | White outline glow (`emissiveIntensity: 0.25`) + base ring |
| Connection source | Green glow (`emissive: #4CAF50`, `intensity: 0.3`) |

---

## 4. Plate Geometry — Lego Baseplate

Plates render as thick, opaque Lego baseplates with a dense stud grid. Plate sizes scale with **learning complexity**.

 > **Canonical size specification**: See [BRICK_DESIGN_SPEC.md](./BRICK_DESIGN_SPEC.md) for detailed stud/pixel dimensions.

### 4.1 Plate Size Tiers (Learning Levels)

| Level | Name | Subnet (Studs) | VNet (Studs) | Capacity | Learning Scenario |
|-------|------|----------------|--------------|----------|-------------------|
| 입문 (Beginner) | **S** | 4×6 | 8×12 | 1-2 blocks | "내 첫 번째 VM" |
| 기초 (Basic) | **M** | 6×8 | 12×16 | 3-4 blocks | "웹서버-DB 구성" |
| 중급 (Intermediate) | **L** | 8×10 | 16×20 | 5-6 blocks | "Hub-Spoke 아키텍처" |

### 4.2 Baseplate Body

| Property | VNet | Subnet | Notes |
|----------|------|--------|-------|
| Height (thickness) | `0.5` | `0.35` | Visible side thickness |
| Material | `meshStandardMaterial` | same | `roughness: 0.5`, `metalness: 0.0` |
| Opacity | `1.0` | `1.0` | Fully opaque (not translucent) |
| Side rendering | Left and Right faces | Isometric 3D depth |

### 4.3 Stud Grid

| Property | Value |
|----------|-------|
| Stud rx | `19` (SVG/screen px) — **identical to block studs** |
| Stud ry | `9.5` (SVG/screen px) |
| Stud height | `7px` (cylinder extrusion) |
| Stud structure | 3 layers: shadow ellipse + top ellipse + inner ring |
| Spacing | 1 SCALE unit (64px) center-to-center, isometric diamond grid |
| Color | Same hue as plate body; see BRICK_DESIGN_SPEC.md §4.5 for exact values |

> **INVIOLABLE**: Plate studs are the SAME SIZE as block studs. This is the Lego principle — same gauge enables assembly. See [BRICK_DESIGN_SPEC.md §0](./BRICK_DESIGN_SPEC.md#0-universal-stud-standard-inviolable).

### 4.4 Subnet Boundary

Subnets inside a Network plate use a **dashed border** instead of solid edges:

| Property | Value |
|----------|-------|
| Border style | Dashed line (LineDashedMaterial) |
| Dash size | `0.3` |
| Gap size | `0.15` |
| Color | White (`#FFFFFF`) |
| Opacity | `0.6` |

### 4.5 Label

| Property | Value |
|----------|-------|
| Position | Bottom-center of plate, outside the plate body |
| Style | White text on semi-transparent dark badge |
| Font size | `14px` (network), `12px` (subnet) |
| Icon prefix | Lock icon for private subnet, globe for network |

### 4.6 Learning Scenario Examples

#### 입문 (S): "내 첫 번째 VM"
```
┌─ VNet-S (8×12) ───────────┐
│  ┌─ Subnet-S (4×6) ────┐  │
│  │  ┌────────────┐     │  │
│  │  │  ┌──┐      │     │  │
│  │  │  │🐍│ python│     │  │
│  │  │  └──┘      │     │  │
│  │  │  compute   │     │  │
│  │  └────────────┘     │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

#### 기초 (M): "웹서버-DB 구성"
```
┌─ VNet-M (12×16) ─────────────────────────────────────┐
│  ┌─ Subnet-M "Public" ───┐  ┌─ Subnet-M "Private" ──┐│
│  │ ┌────────┐ ┌────────┐ │  │ ┌─────────────────┐   ││
│  │ │gateway │ │compute │─│──│ │    database     │   ││
│  │ └────────┘ └────────┘ │  │ └─────────────────┘   ││
│  └───────────────────────┘  └───────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## 5. Connection Arrows

Connections render as thick, colored, straight-segment arrows (not thin Bezier curves).

### 5.1 Line

| Property | Value |
|----------|-------|
| Geometry | SVG path with stroked line (`stroke-width` equivalent to radius `0.04`) |
| Path | Straight with slight vertical lift at midpoint (`+0.3`) |
| Material | `meshStandardMaterial` with connection color |
| Segments | 20 |

### 5.2 Arrowhead

| Property | Value |
|----------|-------|
| Shape | Cone |
| Radius | `0.12` |
| Height | `0.25` |
| Color | Same as line |
| Orientation | Points along connection direction |

---

## 6. Scene Setup

### 6.1 Camera

| Property | Value |
|----------|-------|
| Position | `[14, 14, 14]` |
| FOV | `45` |
| Controls | OrbitControls — zoom + pan only, rotation disabled |
| Min distance | `5` |
| Max distance | `35` |

### 6.2 Lighting

| Light | Position | Intensity | Notes |
|-------|----------|-----------|-------|
| Ambient | — | `0.6` | Warm fill |
| Directional (main) | `[10, 20, 10]` | `1.2` | Main shadow caster, warm white |
| Directional (fill) | `[-5, 10, -5]` | `0.3` | Fill light to soften shadows |
| Point (accent) | `[-10, 10, -10]` | `0.15` | Subtle accent |

Shadow settings:
- `shadow-mapSize: [2048, 2048]`
- Soft shadow enabled

### 6.3 Background

| Property | Value |
|----------|-------|
| Canvas background | `#E8DCC8` (warm beige — "wooden table") |
| Grid | **Hidden** — baseplates provide all structure |
| Floor plane | Optional subtle gradient or flat color, no grid lines |

---

## 7. Bottom Panel — StarCraft-Style 4-Panel Layout

CloudBlocks uses a **StarCraft-inspired 4-panel bottom bar** for context-aware interaction. This pattern is battle-tested (25+ years of RTS games), legally safe (UI layouts are functional, not copyrightable), and educationally effective.

### 7.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MAIN CANVAS                                │
│                     (2:1 Dimetric Isometric View)                       │
├─────────────┬─────────────────────┬─────────────┬──────────────────────┤
│   MINIMAP   │   DETAIL PANEL      │  PORTRAIT   │   COMMAND CARD       │
│     (1)     │       (2)           │    (3)      │       (4)            │
│   200px     │      flex-1         │   120px     │      200px           │
│   160px h   │      160px h        │   160px h   │      160px h         │
└─────────────┴─────────────────────┴─────────────┴──────────────────────┘
```


| Panel | Width | Height | Purpose |
|-------|-------|--------|---------|
| Minimap | `200px` fixed | `160px` | Architecture overview, click-to-navigate |
| Detail | `flex-1` | `160px` | Resource properties with **inline editing** |
| Portrait | `120px` fixed | `160px` | Large resource icon |
| Command Card | `200px` fixed | `160px` | Action/creation buttons (4×3 grid) |

### 7.2 Panel 1: Minimap

Shows bird's-eye view of the entire architecture.

```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │   ▪───▪       │  │  ← Resources as colored dots
│  │     ↓         │  │  ← Connections as thin lines
│  │   ┌─▪─┐       │  │  ← Viewport indicator (dashed)
│  │   │   │       │  │
│  │   └───┘       │  │
│  └───────────────┘  │
│  🔍 Zoom: 100%      │
└─────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#1A1A2E` (dark) |
| Border | `1px solid #333`, radius `8px` |
| Resource dots | Colored by category (matches block colors) |
| Connections | `1px` lines |
| Viewport | White dashed rectangle |
| Click | Pan canvas to location |
| Drag | Move viewport rectangle |

### 7.3 Panel 2: Detail Panel

Shows resource properties with **inline editing** capability.

#### State: Nothing Selected
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              Welcome to CloudBlocks!                │
│                                                     │
│    Select a resource to view its properties,       │
│    or use the Command Card to create new ones.     │
│                                                     │
│              💡 Tip: Start with Network            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State: Single Resource Selected
```
┌─────────────────────────────────────────────────────┐
│  📦 web-server-1                    [Rename]        │
├─────────────────────────────────────────────────────┤
│  Type        Virtual Machine                        │
│  Size        [Standard_B2s     ▼]  ← Editable      │
│  vCPU        2                                      │
│  RAM         4 GB                                   │
│  Region      [Korea Central    ▼]  ← Editable      │
│  Network     main-vpc / public-subnet               │
└─────────────────────────────────────────────────────┘
```

#### State: Multiple Resources Selected (Wireframe Grid)
```
┌─────────────────────────────────────────────────────┐
│  Selected: 3 resources                              │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │  🟠 VM  │  │  🟠 VM  │  │  🔵 DB  │             │
│  │ web-1   │  │ web-2   │  │ main-db │             │
│  └─────────┘  └─────────┘  └─────────┘             │
│                                                     │
│  Common actions available in Command Card →        │
└─────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Border | `1px solid #E0E0E0`, radius `8px` |
| Padding | `16px` |
| Label font | `Inter`, `12px`, `#78909C` |
| Value font | `Inter`, `14px`, `#212121`, weight `500` |

### 7.4 Panel 3: Portrait

Large icon display of selected resource.

```
┌─────────────┐          ┌─────────────┐
│             │          │             │
│     ☁️      │    →     │    ┌───┐    │
│             │  select  │    │🖥️ │    │
│ CloudBlocks │          │    └───┘    │
│             │          │   Virtual   │
│             │          │   Machine   │
└─────────────┘          └─────────────┘
  (no selection)          (VM selected)
```

| Property | Value |
|----------|-------|
| Background | `#F5F5F5` |
| Border | `1px solid #E0E0E0`, radius `8px` |
| Icon size | `48px × 48px` |
| Label font | `Inter`, `12px`, `#424242`, weight `600` |

### 7.5 Panel 4: Command Card

**Context-sensitive action grid** — the core interaction mechanism.
Follows the StarCraft RTS command pattern: **selection → action menu → sub-action**.

#### 7.5.1 Command Card State Machine

The Command Card has **4 states** determined by what is currently selected
and whether the user has entered a sub-action:

```
                    ┌────────────────────┐
                    │  Nothing Selected  │
                    │   CreationMode     │
                    └────────┬───────────┘
                             │  select entity
                 ┌───────────┴───────────┐
                 ▼                       ▼
       ┌─────────────────┐    ┌──────────────────┐
       │ Plate Selected  │    │  Block Selected   │
       │ PlateActionMode │    │  BlockActionMode  │
       └────────┬────────┘    └──────────────────┘
                │ click "Deploy"
                ▼
       ┌─────────────────┐
       │ PlateCreation   │
       │ (Build Sub-menu)│
       └─────────────────┘
          ESC / ← = back to PlateActionMode
```

| State | Trigger | Content |
|-------|---------|---------|
| **CreationMode** | Nothing selected | Resource creation buttons with Tech Tree tabs |
| **PlateActionMode** | Plate selected | Plate action buttons (Deploy, Delete, Config, Move, Rename) |
| **BlockActionMode** | Block selected | Block action buttons (Link, Edit, Delete, Copy, Config, etc.) |
| **PlateCreationMode** | "Deploy" clicked in PlateActionMode | Context-filtered resource build menu for the selected plate |

**Key principle**: Selecting a plate NEVER jumps straight to the build menu.
The user must explicitly choose the "Deploy" action first (like an SCV choosing "Build" in StarCraft).

#### 7.5.2 CreationMode (Nothing Selected)

Tabbed 3×3 resource grid. Categories: Infra, Compute, Data, Edge, Messaging.
Resources are enabled/disabled via the Tech Tree (§7.6).

```
┌──────────────────────┐
│  Create Resource     │
├──────┬──────┬──────┬─┤
│Infra │Comp. │ Data │…│  ← Category tabs (5 tabs, paging)
├══════╪══════╪══════╪═╤
│  NW  │ Pub  │ Priv │ │  ← 3×3 grid per tab
│  ✓   │  ✓   │  ✓   │ │
├──────┼──────┼──────┼─┤
│  FW  │ NSG  │ Bast │ │
│  ✗   │  ✗   │  ✗   │ │
├──────┼──────┼──────┼─┤
│ IntLB│ DNS  │      │ │
│  ✗   │  ✓   │      │ │
└──────┴──────┴──────┴─┘
  Hotkeys: Q W E / A S D / Z X C
```

#### 7.5.3 PlateActionMode (Plate Selected)

When a **Plate** (VNet, Subnet) is selected, show plate-level action commands.
The header shows the plate identity (e.g., "VNet Actions" or "Public Subnet Actions").

```
┌──────────────────────┐
│  VNet Actions        │
├──────┬──────┬──────┬─┤
│  🚀  │  ⚙️  │  🗑️  │ │
│Deploy│Config│Delete│ │  ← Deploy opens build sub-menu
├──────┼──────┼──────┼─┤
│  ↔️  │  📝  │      │ │
│ Move │Rename│      │ │
├──────┼──────┼──────┼─┤
│      │      │      │ │
│      │      │      │ │
└──────┴──────┴──────┴─┘
```

**Plate Action Grid Definition**:

| Position | Action | Hotkey | Description |
|----------|--------|--------|-------------|
| Q | Deploy | Q | Enter PlateCreationMode — show resources deployable to this plate |
| W | Config | W | Open plate configuration (CIDR, naming, tags) |
| E | Delete | E | Delete the plate (with confirmation if it contains children) |
| A | Move | A | Enter move mode for repositioning the plate |
| S | Rename | S | Trigger inline rename in DetailPanel |

**Deploy action**: Transitions to PlateCreationMode (§7.5.5).
Pressing ESC or a "Back" button returns to PlateActionMode.

#### 7.5.4 BlockActionMode (Block Selected)

When a **Block** (VM, Database, Storage, etc.) is selected, show block-level action commands.
The header shows the block identity (e.g., "VM Actions").

```
┌──────────────────────┐
│  VM Actions          │
├──────┬──────┬──────┬─┤
│  🔗  │  ✏️  │  ⚙️  │ │
│ Link │ Edit │Config│ │
├──────┼──────┼──────┼─┤
│  ↔️  │  📋  │  📝  │ │
│ Move │ Copy │Rename│ │
├──────┼──────┼──────┼─┤
│  ➕  │      │  🗑️  │ │
│ App  │      │Delete│ │
└──────┴──────┴──────┴─┘
```

**Block Action Grid Definition**:

| Position | Action | Hotkey | Description |
|----------|--------|--------|-------------|
| Q | Link | Q | Enter connect tool — draw connection from this block |
| W | Edit | W | Open inline property editor in DetailPanel |
| E | Config | E | Open advanced configuration modal |
| A | Move | A | Enter move mode — reposition or move to different plate |
| S | Copy | S | Duplicate the block within the same plate |
| D | Rename | D | Trigger inline rename in DetailPanel |
| Z | Add App | Z | Layer an application block on top |
| C | Delete | C | Delete the block (and its connections) |

#### 7.5.5 PlateCreationMode (Deploy Sub-action)

Entered only via "Deploy" action in PlateActionMode.
Shows a context-filtered resource grid based on the selected plate type.

**Context filtering rules**:

| Plate Type | Available Resources |
|------------|-------------------|
| VNet (Network) | Public Subnet, Private Subnet, Function, Queue, Event, Timer, App Service |
| Public Subnet | Storage, DNS, CDN, Front Door, VM, AKS, ACI, Firewall, NSG, Bastion |
| Private Subnet | Storage, SQL, Cosmos DB, Key Vault, VM, AKS, ACI |

```
┌──────────────────────┐
│ ← Deploy on VNet     │  ← "←" button returns to PlateActionMode
├──────┬──────┬──────┬─┤
│  🌍  │  🔒  │  ⚡  │ │
│Public│Privat│ Func │ │
├──────┼──────┼──────┼─┤
│  📨  │  🔔  │  ⏰  │ │
│Queue │Event │Timer │ │
├──────┼──────┼──────┼─┤
│  🌐  │      │      │ │
│AppSvc│      │      │ │
└──────┴──────┴──────┴─┘
  ESC = back to PlateActionMode
```

**Navigation**: ESC key or "←" header button returns to PlateActionMode.

#### 7.5.6 Command Card Styling

| Property | Value |
|----------|-------|
| Background | `#FAFAFA` |
| Border | `1px solid #E0E0E0`, radius `8px` |
| Grid | `3 columns × 3 rows` |
| Button size | `44px × 44px` |
| Button gap | `4px` |
| Disabled state | `opacity: 0.4`, no hover |
| Hotkey hint | Small text below icon |
| Back button | `←` icon in header, returns to previous mode |

### 7.6 Tech Tree — Resource Dependencies (Azure)

Command Card uses a **Tech Tree** system inspired by RTS build orders. Resources unlock based on dependencies.

#### 7.6.1 Dependency Categories

| Category | Resources | Requirement |
|----------|-----------|-------------|
| **ALWAYS ENABLED** | VNet, Blob Storage, DNS, CDN, Front Door | None (roots) |
| **REQUIRES VNET** | VM, AKS, Internal LB, Firewall, NSG, Bastion, VPN Gateway | VNet must exist |
| **VNET OPTIONAL** | Azure SQL, Functions, App Service, Container Instances, Cosmos DB, Key Vault | Works without VNet, can add later |

#### 7.6.2 Azure Tech Tree Matrix

```
ALWAYS ENABLED (처음부터 생성 가능)
├── Network (VNet)      → VM, AKS, FW, LB, NSG 등 unlock
├── Storage (Blob)      → 독립적
├── Edge (DNS/CDN)      → 독립적
└── Monitor             → 독립적

REQUIRES VNET (VNet 생성 후)
├── Virtual Machines    → NIC가 Subnet에 연결
├── AKS (Kubernetes)    → 항상 Azure 네트워킹 사용
├── Internal LB         → Subnet 내 IP 필요
├── Azure Firewall      → 전용 Subnet 필요
├── NSG                 → Subnet/NIC에 연결
├── Bastion             → VNet 필요
├── VPN Gateway         → VNet 필요
└── Private Endpoint    → Subnet에 배치

VNET OPTIONAL (Public 먼저, Private 나중에)
├── Azure SQL Database  → Public 기본, Private Endpoint 선택
├── Azure Functions     → VNet 통합 선택적
├── App Service         → VNet 통합 선택적
├── Container Instances → VNet 배포 선택적
├── Cosmos DB           → Public 기본
└── Key Vault           → Private Endpoint 선택적
```

#### 7.6.3 Educational Value

> **핵심 교훈**: Azure에서 많은 PaaS 서비스는 Public으로 시작하고, 나중에 Private Endpoint로 보안을 강화합니다.

This teaches users the real Azure pattern: start simple (public), harden later (private networking).

#### 7.6.4 Category Drill-Down

When user clicks a category button (e.g., "PaaS"):

```
┌──────────────────────┐
│  PaaS Services       │
├──────┬──────┬──────┬─┤
│  ←   │ K8S  │ App  │ │  ← Back button
│ Back │      │Service│ │
├──────┼──────┼──────┼─┤
│ Func │ ACI  │ Logic│ │
│      │      │ Apps │ │
├──────┼──────┼──────┼─┤
│      │      │      │ │
│      │      │      │ │
└──────┴──────┴──────┴─┘
```

### 7.7 State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────┐                    ┌──────────────┐      │
│  │   EMPTY      │ ── create VNet ──→ │  HAS_VNET    │      │
│  │  (initial)   │                    │              │      │
│  └──────────────┘                    └──────┬───────┘      │
│         │                                   │               │
│         │ click resource                    │ click resource│
│         ▼                                   ▼               │
│  ┌──────────────┐                    ┌──────────────┐      │
│  │  SELECTED    │                    │  SELECTED    │      │
│  │ (limited cmd)│                    │  (full cmd)  │      │
│  └──────────────┘                    └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

| State | Minimap | Detail | Portrait | Command Card |
|-------|---------|--------|----------|--------------|
| Empty | Empty grid | Welcome | Logo | Roots only enabled |
| Has VNet, none selected | Architecture | Tips | Logo | All creation enabled |
| Single selected | Highlight | Editable props | Resource icon | Actions |
| Multi-selected | Highlight all | Wireframe grid | Multi icon | Common actions |

### 7.8 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| `≥1200px` | Full 4-panel |
| `900-1199px` | 3-panel (hide Minimap) |
| `600-899px` | 2-panel (hide Minimap + Portrait) |
| `<600px` | Tab bar (Map / Info / Create) |

### 7.9 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus between panels |
| `Arrow keys` | Navigate Command Card grid |
| `Enter` | Activate button |
| `Escape` | Deselect, return to create mode |
| `Delete` | Delete selected resource |
| `Ctrl+C/V` | Copy/paste resource |

### 7.10 Legacy: Flow Diagram

> **Deprecated in favor of Bottom Panel**. The previous flow diagram concept is replaced by the Detail Panel's wireframe view for multi-selection.

If needed for presentation mode, Flow Diagram can be shown as an **overlay** above the Bottom Panel:

```
 ☁ Internet → [Load Balancer] → [VM] → [Database] → [Storage]
```

---

## 8. Typography

| Usage | Font | Size | Weight |
|-------|------|------|--------|
| Block label | Inter, system-ui | `11px` | `600` |
| Plate label | Inter, system-ui | `13px` | `600` |
| Legend header | Inter, system-ui | `14px` | `700` |
| Legend item | Inter, system-ui | `13px` | `500` |
| Flow diagram | Inter, system-ui | `12px` | `500` |
| Toolbar | system-ui | `13px` | `500` |

---

## 9. Educational UX

CloudBlocks is built for users who may encounter cloud infrastructure concepts for the first time. Every visual and interactive element should **teach by showing**, not assume prior knowledge.

### 9.1 Design Principles for Education

| Principle | Implementation |
|-----------|---------------|
| **Show, don't tell** | Visual hierarchy (baseplate nesting) teaches containment without explanation |
| **Plain language first** | Labels say "Load Balancer" not "ALB"; technical names appear in tooltips |
| **Explain constraints** | When a placement is invalid, show *why* ("Databases go in Private Subnets for security") |
| **Progressive disclosure** | Basic view is simple; details reveal on hover/click, not all at once |
| **Real-world analogies** | Tooltips use analogies: "A Load Balancer is like a receptionist distributing visitors to available offices" |

### 9.2 Tooltip System

Every block, plate, and connection has an educational tooltip on hover.

#### Block Tooltips

```
┌──────────────────────────────────┐
│  🟠  Virtual Machine             │
│  ──────────────────────────────  │
│  Runs your application code.     │
│  Like a computer in the cloud    │
│  that's always on.               │
│                                  │
│  Cloud name: Azure VM / AWS EC2  │
│  Category: Compute               │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Trigger | Hover (300ms delay) |
| Position | Above block, centered |
| Width | `240px` max |
| Content | Friendly name, one-line description, real-world analogy, cloud-specific name |
| Background | White, `border-radius: 8px`, subtle shadow |
| Dismiss | On pointer leave |

#### Plate Tooltips

| Plate Type | Tooltip Description |
|------------|-------------------|
| Network (VPC) | "A private network in the cloud. Like a fenced compound where your services live." |
| Subnet (Public) | "A section of your network that can be reached from the internet. Like a lobby open to visitors." |
| Subnet (Private) | "A section of your network hidden from the internet. Like a back office only employees can access." |

#### Connection Tooltips

| Connection | Tooltip Description |
|------------|-------------------|
| Internet → Gateway | "Users from the internet send requests to your load balancer." |
| Gateway → Compute | "The load balancer forwards requests to a server that runs your app." |
| Compute → Database | "Your app reads and writes data to the database." |
| Compute → Storage | "Your app uploads and downloads files from storage." |

### 9.3 Command Card — Educational Mode

> **Note**: The Block Palette (left sidebar) has been replaced by the **Command Card** in the Bottom Panel (§7.5). Resource creation now uses the Command Card's Tech Tree system.

The Command Card provides educational context through:

1. **Tech Tree dependencies** — Users learn "Network first" naturally
2. **Disabled states with tooltips** — "Create a Network first to unlock Virtual Machines"
3. **Category drill-down** — PaaS → specific services teaches service hierarchy
4. **Context switching** — Creation mode vs Action mode teaches different workflows

### 9.4 Validation Messages — Educational Tone

Validation messages explain the *why*, not just the *what*.

| Tone | Bad (Technical) | Good (Educational) |
|------|----------------|-------------------|
| Placement error | "Invalid placement: database on public subnet" | "Databases should be in a Private Subnet to keep them safe from direct internet access." |
| Connection error | "Invalid connection: storage → compute" | "Storage doesn't initiate connections — it waits for other services to read/write. Try connecting from your VM to Storage instead." |
| Missing connection | "Orphan block detected" | "This Load Balancer isn't connected to anything yet. Connect it to a Virtual Machine so it can forward traffic." |

### 9.5 Bottom Panel — Educational Annotations

The Bottom Panel (§7) provides educational context at every step:

| Panel | Educational Feature |
|-------|---------------------|
| Minimap | Visual overview helps spatial understanding |
| Detail | Plain-language property names with tooltips |
| Portrait | Large icon reinforces resource identification |
| Command Card | Tech Tree teaches dependencies; disabled states explain "why not" |

#### Disabled Button Tooltips

When a Command Card button is disabled, hovering shows an educational explanation:

| Button | Disabled Tooltip |
|--------|------------------|
| VM | "Create a Network first. Virtual Machines need a network to connect to." |
| AKS | "Create a Network first. Kubernetes clusters run inside a virtual network." |
| Internal LB | "Create a Network first. Internal load balancers distribute traffic within a network." |
| Firewall | "Create a Network first. Firewalls protect traffic entering your network." |

### 9.6 Detail Panel — Educational Property Display

The Detail Panel (§7.3) displays resource properties with educational context:

```
┌─────────────────────────────────────────────────────┐
│  📦 web-server-1                                    │
├─────────────────────────────────────────────────────┤
│  Type        Virtual Machine                        │
│              ℹ️ "Runs your application code"        │
│                                                     │
│  Size        Standard_B2s                           │
│              ℹ️ "2 vCPUs, 4GB RAM — good for        │
│                  small web servers"                 │
│                                                     │
│  Network     main-vpc / public-subnet               │
│              ℹ️ "Connected to the internet          │
│                  through this network"              │
└─────────────────────────────────────────────────────┘
```

Hover on ℹ️ icons reveals plain-language explanations for technical properties.

### 9.7 Naming Convention

All user-facing labels follow this convention:

| Context | Show | Example |
|---------|------|---------|
| Block label (on canvas) | Friendly name | "Load Balancer" |
| Command Card button | Friendly name + icon | "🔗 Link" |
| Detail Panel property | Technical + explanation | "Size: Standard_B2s (2 vCPU, 4GB)" |
| Disabled button tooltip | Educational explanation | "Create a Network first..." |
| Tooltip header | Friendly name | "Virtual Machine" |
| Tooltip detail | Cloud-specific name | "Cloud name: Azure VM / AWS EC2" |
| Properties panel | Both | "Virtual Machine (EC2)" |
| Code generation output | Cloud-specific name | `azurerm_virtual_machine` |
| Legend | Friendly name + role | "Load Balancer — Distributes traffic" |
| Flow diagram | Friendly name | "Load Balancer" |

> **Rule**: The user never *needs* to know the cloud-specific abbreviation to use CloudBlocks. It's always available but never required.

---

## 10. Implementation Notes

### Dependencies

- Current renderer uses SVG primitives + CSS transforms + DOM layering
- Block body corners/studs are implemented with SVG path/ellipse primitives
- Thick connection lines use SVG path stroke + marker arrowheads
- Subnet dashed borders use SVG `stroke-dasharray`
- No new dependencies required

### File Changes (Estimated)

| File | Change |
|------|--------|
| `shared/types/index.ts` | Update `BLOCK_COLORS`, `PLATE_COLORS`; add `RESOURCE_DEPENDENCIES`, `COMMAND_ACTIONS` |
| `entities/block/BlockSvg.tsx` | Rounded SVG block body, studs, icon overlay, educational tooltip |
| `entities/plate/PlateModel.tsx` | Opaque baseplate, dashed subnet borders |
| `entities/connection/ConnectionPath.tsx` | SVG path, colored arrows |
| `widgets/scene-canvas/SceneCanvas.tsx` | Update lighting, background, camera |
| `widgets/bottom-panel/BottomPanel.tsx` | **New** — 4-panel container |
| `widgets/bottom-panel/Minimap.tsx` | **New** — Architecture overview |
| `widgets/bottom-panel/DetailPanel.tsx` | **New** — Resource properties |
| `widgets/bottom-panel/Portrait.tsx` | **New** — Resource icon display |
| `widgets/bottom-panel/CommandCard.tsx` | **New** — Action/creation grid |
| `widgets/bottom-panel/useTechTree.ts` | **New** — Dependency logic |
| `app/App.tsx` | Add BottomPanel to layout |

### Removed Components

| File | Reason |
|------|--------|
| `widgets/block-palette/BlockPalette.tsx` | Replaced by Command Card |
| `widgets/flow-diagram/FlowDiagram.tsx` | Replaced by Detail Panel wireframe |
| `widgets/legend-panel/LegendPanel.tsx` | Optional overlay, not primary UI |

### Constraints

- **No domain model changes** — visual only, `ArchitectureModel` stays the same
- **No new npm dependencies** — current SVG + CSS renderer covers required visuals
- **FSD layer rules apply** — new widgets go in `widgets/`, no upward imports
- **TypeScript strict mode** — no `as any`, no `@ts-ignore`
- **2D-first model preserved** — rendering is projection only (ADR-0005)
- **Educational tone** — all user-facing text uses plain language; technical terms appear as secondary info

---

## 11. Lego Minifigure Character

CloudBlocks features a **Lego minifigure mascot** that represents DevOps personas and cloud provider identity. The character is rendered as an inline SVG component, matching the isometric Lego aesthetic of the builder.

### 11.1 Design Concept

The minifigure is a simplified, isometric-style Lego person constructed from basic SVG primitives (ellipses, rects, paths). It follows the same visual language as blocks and plates — same color derivation, same stud standard on the head, same isometric projection.

```
        ╭─────╮
        │ ⬬   │  ← stud (Universal Stud Standard)
        │ 😊  │  ← head (cylinder, Bright Yellow #F2CD37)
        ╰──┬──╯
      ┌────┴────┐
      │  LOGO   │  ← torso (cloud provider logo)
      │ ╭─┤├─╮  │  ← arms + hands
      └────┬────┘
        ┌──┴──┐
        │     │  ← legs (Medium Stone Grey #969696)
        └─────┘
```

### 11.2 Cloud Provider Logo Strategy

Each minifigure variant carries a **cloud provider logo on the torso**, establishing visual identity for the target cloud platform.

| Provider | Logo Position | Torso Color | Logo | Status |
|----------|--------------|-------------|------|--------|
| **Azure** | Center torso | Dark Azure `#078DCE` | Azure icon (simplified) | **Phase 3 — Active** |
| **AWS** | Center torso | Dark Orange `#FF9900` | AWS icon (simplified) | **Planned — Phase 3+** |
| **GCP** | Center torso | White `#FFFFFF` | GCP icon (4-color) | **Planned — Phase 3+** |

> **Implementation order**: Azure first (matches current Azure-first platform focus). AWS and GCP variants follow when multi-cloud support ships (Milestone 8).

#### Logo Rendering Rules

- Logos are simplified geometric SVG — no raster images, no external assets
- Logo must remain legible at 48px minifigure height
- Logo colors follow each provider's official brand palette
- Logo area: approximately 60% of torso front face width

### 11.3 Minifigure Anatomy

| Part | Shape | Color | Notes |
|------|-------|-------|-------|
| **Stud** | Ellipse (Universal Stud Standard) | Bright Yellow `#F2CD37` | `rx=12, ry=6, h=5px` — same as all studs |
| **Head** | Cylinder (ellipse top + rect body) | Bright Yellow `#F2CD37` | Simple face: 2 dot eyes + smile arc |
| **Torso** | Tapered rectangle | Provider-dependent (see §11.2) | Cloud logo on front face |
| **Arms** | Diagonal rects | Provider torso color | Angled ~30° from torso |
| **Hands** | Small circles | Bright Yellow `#F2CD37` | "C" hook shape in detailed view |
| **Legs** | Two rectangles + hip bar | Medium Stone Grey `#969696` | Standard DevOps/engineer pants |

### 11.4 Isometric Rendering

The minifigure follows the same 2:1 dimetric isometric projection as all other elements.

- **Perspective**: 3/4 view — show top of head (stud visible), one side of torso, slight leg offset
- **Layering** (SVG DOM order, back to front): Back Arm → Back Leg → Torso → Front Leg → Front Arm → Head → Stud
- **Face shading**: Use `blockFaceColors.ts` pattern — top face lighter, side face 15-20% darker
- **Scale**: Minifigure height ≈ 1.5× block height for visual proportion

### 11.5 Component Interface

```typescript
// apps/web/src/entities/character/MinifigureSvg.tsx

interface MinifigureProps {
  provider: 'azure' | 'aws' | 'gcp';
  x?: number;
  y?: number;
  scale?: number;
  className?: string;
}
```

**FSD Location**: `apps/web/src/entities/character/MinifigureSvg.tsx`

### 11.6 Size & Placement

| Property | Value |
|----------|-------|
| Default height | `64px` (SVG viewBox) |
| Min legible size | `48px` |
| Canvas placement | Near architecture elements, not overlapping blocks |
| Depth ordering | Uses `depthKey()` utility for correct z-order |

### 11.7 DevOps Engineer Theme

The default minifigure represents a **DevOps Engineer** persona:

| Accessory | Visual | Status |
|-----------|--------|--------|
| Hardhat / Headset | Small helmet shape on head | Optional (v1: bare head) |
| Laptop / Wrench | Held item in hand | Planned (v2) |
| Terminal badge | Small `>_` icon on torso | Optional accent |

### 11.8 Future Variants (Planned)

| Variant | Persona | Distinguishing Feature |
|---------|---------|----------------------|
| DevOps Engineer | Default | Cloud provider logo torso |
| Security Engineer | SecOps | Dark Red `#720E0F` torso + shield icon |
| Data Engineer | DataOps | Indigo `#283593` torso + database icon |
| Platform Engineer | PlatformOps | Bright Bluish Green `#008F9B` torso + Kubernetes icon |

> **Note**: All variants follow the same anatomy (§11.3). Only torso color and logo differ.

### 11.9 Constraints

- **Universal Stud Standard**: Head stud uses identical dimensions (`rx=12, ry=6, h=5px`)
- **No raster images**: All graphics are inline SVG paths — no PNG/JPG logos
- **CC0/Apache-compatible assets only**: No trademarked logos — use simplified geometric approximations
- **No external dependencies**: Raw SVG elements, no icon libraries
- **Isometric consistency**: Must match existing block/plate projection angles
