# Visual Design Spec — Lego-Style Cloud Architecture

**Status**: Accepted
**Date**: 2025-03
**Related**: [ADR-0003](../adr/0003-lego-style-composition-model.md), [ADR-0005](../adr/0005-2d-first-editor-with-25d-rendering.md)

---

## 1. Design Vision

CloudBlocks' visual identity is a **toy-like, tactile Lego baseplate** where cloud resources sit as colorful 3D bricks. The aesthetic is warm, approachable, and educational — not cold/technical. Users should feel like they're playing with building blocks, not writing infrastructure code.

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

Each block renders as a realistic Lego brick with studs on top.

### 3.1 Brick Body

```
 ___________
|  O  O  O  |   ← studs (cylinders on top)
|           |
|   ICON    |   ← service icon on front face
|   Label   |
|___________|
```

| Property | Value | Notes |
|----------|-------|-------|
| Width | `1.2` | Slightly wider than current `1.0` |
| Height | `0.9` | Slightly shorter for squat brick feel |
| Depth | `1.2` | Square footprint |
| Corner radius | `0.08` | Rounded edges (RoundedBoxGeometry from drei) |
| Material | `meshStandardMaterial` | `roughness: 0.35`, `metalness: 0.05` — ABS plastic look |

### 3.2 Studs

Each brick has a 2x2 grid of studs on top.

| Property | Value |
|----------|-------|
| Stud radius | `0.12` |
| Stud height | `0.1` |
| Stud count | 4 (2x2 grid) |
| Spacing | `0.35` center-to-center |
| Color | Same as brick body (slightly lighter emissive: +0.05) |

### 3.3 Service Icon

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

### 3.4 Selection / Hover

| State | Effect |
|-------|--------|
| Hover | `emissiveIntensity: 0.15`, cursor: `pointer` |
| Selected | White outline glow (`emissiveIntensity: 0.25`) + base ring |
| Connection source | Green glow (`emissive: #4CAF50`, `intensity: 0.3`) |

---

## 4. Plate Geometry — Lego Baseplate

Plates render as thick, opaque Lego baseplates with a dense stud grid.

### 4.1 Baseplate Body

| Property | Value | Notes |
|----------|-------|-------|
| Height (thickness) | `0.5` (network), `0.35` (subnet) | Visible side thickness |
| Material | `meshStandardMaterial` | `roughness: 0.5`, `metalness: 0.0` |
| Opacity | `1.0` | Fully opaque (not translucent) |
| Side rendering | Visible — distinct darker shade on sides | 3D depth illusion |

### 4.2 Stud Grid

| Property | Value |
|----------|-------|
| Stud radius | `0.1` |
| Stud height | `0.06` |
| Spacing | Matches `GRID_CELL` (1.5) |
| Color | Same as plate body |

### 4.3 Subnet Boundary

Subnets inside a Network plate use a **dashed border** instead of solid edges:

| Property | Value |
|----------|-------|
| Border style | Dashed line (LineDashedMaterial) |
| Dash size | `0.3` |
| Gap size | `0.15` |
| Color | White (`#FFFFFF`) |
| Opacity | `0.6` |

### 4.4 Label

| Property | Value |
|----------|-------|
| Position | Bottom-center of plate, outside the plate body |
| Style | White text on semi-transparent dark badge |
| Font size | `14px` (network), `12px` (subnet) |
| Icon prefix | Lock icon for private subnet, globe for network |

---

## 5. Connection Arrows

Connections render as thick, colored, straight-segment arrows (not thin Bezier curves).

### 5.1 Line

| Property | Value |
|----------|-------|
| Geometry | `TubeGeometry` following path (radius `0.04`) |
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

## 7. UI Overlays

### 7.1 Legend Panel (Right Side)

A floating card on the right side of the canvas listing all service types with their colors and educational descriptions.

```
┌─ Legend ──────────────────────────┐
│                                    │
│  ■ Network (VPC)                   │
│    Your private cloud network      │
│                                    │
│  ■ Public Subnet                   │
│    Internet-accessible zone        │
│                                    │
│  ■ Private Subnet                  │
│    Internal-only zone              │
│                                    │
│  ■ Load Balancer                   │
│    Distributes traffic             │
│                                    │
│  ■ Virtual Machine                 │
│    Runs application code           │
│                                    │
│  ■ Database                        │
│    Stores structured data          │
│                                    │
│  ■ Object Storage                  │
│    Stores files & media            │
│                                    │
└────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Position | Fixed, right side, vertically centered |
| Background | White, `border-radius: 12px`, `box-shadow` |
| Width | `220px` |
| Each row | Color swatch (16x16 rounded square) + friendly name + subtitle |
| Font (name) | `'Inter', system-ui`, `13px`, weight `600` |
| Font (subtitle) | `'Inter', system-ui`, `11px`, weight `400`, color `#78909C` |

### 7.2 Flow Diagram (Bottom Bar)

A horizontal flow visualization showing the architecture's connection chain. Uses friendly names and provides hover explanations for educational context.

```
 ☁ Internet → [Load Balancer] → [VM] → [App Server] → [Database] → [Storage]
```

| Property | Value |
|----------|-------|
| Position | Fixed, bottom center |
| Background | White, `border-radius: 12px`, `box-shadow`, `padding: 12px 24px` |
| Layout | `display: flex`, `gap: 12px`, `align-items: center` |
| Block chips | Colored rounded rectangle + icon + **friendly name** |
| Arrows | `→` character or SVG arrow, color `#90A4AE` |
| Font | `'Inter', system-ui`, `12px` |
| Hover | Shows one-line explanation (e.g., "Splits traffic across servers") |

The flow diagram is **auto-generated** from the architecture's connection graph using topological sort.

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

### 9.3 Block Palette — Educational Mode

The block palette (left sidebar) shows blocks with educational context:

```
┌─ Add Resource ──────────────┐
│                              │
│  🟣 Load Balancer            │
│  Distributes incoming        │
│  traffic across servers      │
│                              │
│  🟠 Virtual Machine          │
│  Runs your application       │
│  code                        │
│                              │
│  🔵 Database                 │
│  Stores structured data      │
│  (tables, rows)              │
│                              │
│  🟢 Object Storage           │
│  Stores files and media      │
│  (images, videos, backups)   │
│                              │
└──────────────────────────────┘
```

Each palette item shows:
1. Color swatch matching the block color
2. Friendly name (not abbreviation)
3. One-line plain-language description

### 9.4 Validation Messages — Educational Tone

Validation messages explain the *why*, not just the *what*.

| Tone | Bad (Technical) | Good (Educational) |
|------|----------------|-------------------|
| Placement error | "Invalid placement: database on public subnet" | "Databases should be in a Private Subnet to keep them safe from direct internet access." |
| Connection error | "Invalid connection: storage → compute" | "Storage doesn't initiate connections — it waits for other services to read/write. Try connecting from your VM to Storage instead." |
| Missing connection | "Orphan block detected" | "This Load Balancer isn't connected to anything yet. Connect it to a Virtual Machine so it can forward traffic." |

### 9.5 Legend Panel — Educational Annotations

The Legend panel (§7.1) includes brief role descriptions alongside each item:

```
┌─ Legend ──────────────────────────┐
│                                    │
│  ■ Network (VPC)                   │
│    Your private cloud network      │
│                                    │
│  ■ Public Subnet                   │
│    Internet-accessible zone        │
│                                    │
│  ■ Private Subnet                  │
│    Internal-only zone              │
│                                    │
│  ■ Load Balancer                   │
│    Distributes traffic             │
│                                    │
│  ■ Virtual Machine                 │
│    Runs application code           │
│                                    │
│  ■ Database                        │
│    Stores structured data          │
│                                    │
│  ■ Object Storage                  │
│    Stores files & media            │
│                                    │
└────────────────────────────────────┘
```

### 9.6 Flow Diagram — Educational Labels

The bottom flow bar (§7.2) uses friendly names and can show a one-line explanation of each step on hover:

```
 ☁ Internet → [Load Balancer] → [VM] → [App Server] → [Database] → [Storage]
                  ↑                        ↑                ↑
           "Splits traffic"        "Runs your code"   "Saves data"
```

### 9.7 Naming Convention

All user-facing labels follow this convention:

| Context | Show | Example |
|---------|------|---------|
| Block label (on canvas) | Friendly name | "Load Balancer" |
| Block palette | Friendly name + subtitle | "Load Balancer — Distributes incoming traffic" |
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

- `@react-three/drei` already provides `RoundedBox` — use for block body
- `TubeGeometry` from Three.js for thick connection lines
- `LineDashedMaterial` from Three.js for subnet dashed borders
- No new dependencies required

### File Changes (Estimated)

| File | Change |
|------|--------|
| `shared/types/index.ts` | Update `BLOCK_COLORS`, `PLATE_COLORS`, `SUBNET_ACCESS_COLORS`, `DEFAULT_BLOCK_SIZE`; add `BLOCK_FRIENDLY_NAMES`, `BLOCK_DESCRIPTIONS`, `BLOCK_ANALOGIES`, `PLATE_TOOLTIPS` |
| `entities/block/BlockModel.tsx` | Complete rewrite — RoundedBox, 2x2 studs, icon overlay, educational tooltip, new materials |
| `entities/plate/PlateModel.tsx` | Rewrite — opaque baseplate, thicker body, dashed subnet borders, educational tooltip, new colors |
| `entities/connection/ConnectionLine.tsx` | Rewrite — TubeGeometry, colored arrows, context-based color |
| `widgets/scene-canvas/SceneCanvas.tsx` | Update lighting, background, camera, remove grid |
| `widgets/block-palette/BlockPalette.tsx` | Update to show friendly names + descriptions (educational mode) |
| `app/App.css` | Background color update |
| `widgets/legend-panel/LegendPanel.tsx` | **New file** — right-side legend overlay with educational annotations |
| `widgets/flow-diagram/FlowDiagram.tsx` | **New file** — bottom flow bar overlay with hover explanations |
| `app/App.tsx` | Add Legend and FlowDiagram to layout |

### Constraints

- **No domain model changes** — visual only, `ArchitectureModel` stays the same
- **No new npm dependencies** — `@react-three/drei` already has `RoundedBox`
- **FSD layer rules apply** — new widgets go in `widgets/`, no upward imports
- **TypeScript strict mode** — no `as any`, no `@ts-ignore`
- **2D-first model preserved** — rendering is projection only (ADR-0005)
- **Educational tone** — all user-facing text uses plain language; technical terms appear as secondary info
