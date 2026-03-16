# Brick & Plate Size Specification

**Status**: Accepted  
**Date**: 2025-03  
**Related**: [VISUAL_DESIGN_SPEC.md](./VISUAL_DESIGN_SPEC.md), [DOMAIN_MODEL.md](../model/DOMAIN_MODEL.md), [ADR-0003](../adr/0003-lego-style-composition-model.md)

---

## 0. Universal Stud Standard (INVIOLABLE)

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

## 1. Overview

CloudBlocks uses a **3-layer Lego-style size system**:

1. **Application Layer** (1×1) — Software running on resources (nginx, mysql, nodejs...)
2. **Resource Layer** (2×2 ~ 4×6) — Cloud infrastructure resources (compute, database...)
3. **Plate Layer** (6×8 ~ 16×20) — Network boundaries (VNet, Subnet)

This creates visual hierarchy that teaches cloud architecture through relative scale and stacking.

### Design Goals

| Goal | Rationale |
|------|-----------|
| **3-layer hierarchy** | Apps → Resources → Network, learners see the stack |
| **Visual proportions** | App(1×1) < Function(2×2) < Compute(3×4) < Database(4×6) |
| **Staged learning** | Plate sizes match learning progression (beginner → intermediate) |
| **Consistent stud grid** | All sizes align to stud units for clean placement |

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER (1×1)                                        │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                       │
│  │🌐│ │☕│ │🐍│ │🐘│ │🔴│ │📦│ │🟢│ │⚡│                       │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                       │
│  nginx java python postgres redis npm node deno                 │
│  → Sits ON TOP of Resource bricks                               │
└─────────────────────────────────────────────────────────────────┘
         ↓ placed on
┌─────────────────────────────────────────────────────────────────┐
│  RESOURCE LAYER (2×2 ~ 4×6)                                     │
│  ┌────┐  ┌────────┐  ┌──────────┐  ┌────────────────┐          │
│  │func│  │gateway │  │ compute  │  │    database    │          │
│  │2×2 │  │  2×4   │  │   3×4    │  │      4×6       │          │
│  └────┘  └────────┘  └──────────┘  └────────────────┘          │
│  → Sits ON TOP of Plate                                         │
└─────────────────────────────────────────────────────────────────┘
         ↓ placed on
┌─────────────────────────────────────────────────────────────────┐
│  PLATE LAYER (Subnet, VNet)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                        VNet                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐               │   │
│  │  │  Subnet Public  │  │ Subnet Private  │               │   │
│  │  └─────────────────┘  └─────────────────┘               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  → Base layer (floor)                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Application Layer (1×1 Studs)

Applications are **small cylindrical pieces** (like Lego studs) that sit on top of Resource bricks. They represent **software you operate** — not managed cloud services.

> **Key distinction**: Applications are only placed on **hostable resources** (`compute`, `function`). Managed services like `gateway`, `queue`, `storage`, and managed `database` are complete resources with built-in behavior — they don't host user applications.

### 2.1 Application Placement Rules

| Resource Type | Accepts Apps? | Rationale |
|---------------|---------------|-----------|
| `compute` | ✅ Yes (3-4) | VMs/containers host your software stack |
| `function` | ✅ Yes (1) | Serverless hosts your handler code |
| `gateway` | ❌ No | Managed load balancer — no user code |
| `queue` | ❌ No | Managed messaging — no user code |
| `storage` | ❌ No | Managed object store — no user code |
| `database` | ⚠️ Conditional | See Managed vs Self-hosted below |
| `timer` | ❌ No | Trigger only — no runtime |
| `event` | ❌ No | Router only — no runtime |

### 2.2 Managed vs Self-hosted

CloudBlocks distinguishes between **managed services** (cloud provider operates) and **self-hosted software** (you operate):

| Approach | Example | How to Model |
|----------|---------|--------------|
| **Managed DB** | Azure SQL, RDS | `database` block alone (no apps) |
| **Self-hosted DB** | PostgreSQL on VM | `compute` block + `postgres` app |
| **Managed Cache** | Azure Cache, ElastiCache | `database` block alone (no apps) |
| **Self-hosted Cache** | Redis on VM | `compute` block + `redis` app |

> **Teaching principle**: If you install/configure it yourself, it's an **app on compute**. If the cloud provider manages it, it's a **standalone resource block**.

### 2.3 Application Types

| Category | Examples | Icon | Color | Placed On |
|----------|----------|------|-------|-----------|
| **Web Server** | nginx, apache, caddy | 🌐 | `#4CAF50` Green | compute |
| **Runtime** | nodejs, deno, bun | ⚡ | `#8BC34A` Light Green | compute, function |
| **Language** | java, python, go, rust | ☕🐍🐹🦀 | `#FF9800` Orange | compute, function |
| **Database Engine** | postgres, mysql, redis | 🐘🐬🔴 | `#2196F3` Blue | compute (self-hosted) |
| **Package/Container** | npm, docker, k8s | 📦🐳☸️ | `#9C27B0` Purple | compute |

### 2.4 Visual Specification

| Property | Value |
|----------|-------|
| Shape | Cylinder (like Lego stud) |
| Size | 1×1 stud (40×40 px base) |
| Height | 20px (shorter than brick) |
| Position | On top of hostable Resource brick |

### 2.5 Canonical Examples

#### Example 1: Self-hosted Web Server
```
    ┌──┐ ┌──┐ ┌──┐           ← Apps: nginx, python, redis
    │🌐│ │🐍│ │🔴│
    └──┘ └──┘ └──┘
┌──────────────────┐         ← Resource: compute (core 3×4)
│     compute      │
└──────────────────┘
```
**Teaching**: "You install nginx, python, and redis on your VM."

#### Example 2: Serverless Function
```
        ┌──┐                 ← App: nodejs handler
        │⚡│
        └──┘
    ┌────────┐               ← Resource: function (light 2×2)
    │function│
    └────────┘
```
**Teaching**: "Your code runs on the cloud's serverless platform."

#### Example 3: Managed Database (No Apps)
```
┌────────────────────────┐   ← Resource: database (anchor 4×6)
│       database         │      No apps — managed by cloud provider
│    (Azure SQL/RDS)     │
└────────────────────────┘
```
**Teaching**: "The cloud provider manages the database software for you."

---

## 3. Resource Layer (Brick Sizes)

Brick size represents **architectural weight** — a composite measure of:

| Factor | Description |
|--------|-------------|
| **Statefulness** | Does it hold data that must persist? |
| **Blast Radius** | What breaks if this fails? |
| **Replacement Cost** | How hard is it to recreate? |

Larger bricks are harder to replace and more central to the architecture.

> **Design principle**: Size = Architectural Weight, NOT app capacity. A database is large because it's stateful and critical, not because it hosts many apps.

### 3.1 Size Tiers (5 Levels)

| Tier | Name | Studs (X×Y) | Architectural Weight | Hostable? | Use Case |
|------|------|-------------|---------------------|-----------|----------|
| 1 | **signal** | 1×2 | Minimal — ephemeral triggers | No | timer, event |
| 2 | **light** | 2×2 | Low — stateless, replaceable | Yes (1 app) | function |
| 3 | **service** | 2×4 | Medium — standard managed services | No | gateway, queue, storage |
| 4 | **core** | 3×4 | High — primary workload hosts | Yes (3-4 apps) | compute |
| 5 | **anchor** | 4×6 | Critical — stateful, hard to replace | No (managed) | database |

> **Stud unit**: 1 stud = 40px.  
> **Hostable**: Can user applications be placed on this resource?

### 3.2 Resource → Brick Size Mapping

| Resource | Brick Size | Hostable | Architectural Weight |
|----------|------------|----------|---------------------|
| `timer` | signal (1×2) | No | Ephemeral trigger |
| `event` | signal (1×2) | No | Lightweight router |
| `function` | light (2×2) | Yes (1) | Stateless, auto-scaled |
| `gateway` | service (2×4) | No | Managed load balancer |
| `queue` | service (2×4) | No | Managed messaging |
| `storage` | service (2×4) | No | Managed object store |
| `compute` | core (3×4) | Yes (3-4) | Primary workload host |
| `database` | anchor (4×6) | No | Stateful, critical data |

### 3.3 Visual Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ARCHITECTURAL WEIGHT: Minimal ──────────────────────────► Critical    │
│                                                                         │
│   signal (1×2)       light (2×2)         service (2×4)                 │
│   ┌──┐               ┌────┐              ┌────────┐                    │
│   │  │               │ ⚡ │ ← hostable   │        │ ← managed          │
│   └──┘               └────┘              │        │   (no apps)        │
│   timer, event       function            └────────┘                    │
│   (trigger only)     (1 app)             gateway, queue, storage        │
│                                                                         │
│   core (3×4)                             anchor (4×6)                  │
│   ┌──────────────┐                       ┌────────────────────┐        │
│   │ 🌐  ☕  🔴   │ ← hostable            │                    │        │
│   │              │   (3-4 apps)          │     (managed)      │        │
│   │              │                       │     (no apps)      │        │
│   └──────────────┘                       └────────────────────┘        │
│   compute                                database                       │
│   (your app stack)                       (cloud-managed data)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Plate Layer (Network Boundaries)

### 4.1 Learning-Level Plate Sizes

Plate sizes are **UI teaching presets**, not infrastructure semantics. They determine canvas size for different learning scenarios.

> **Important**: Plate size = "learning level" for UI purposes. It does NOT affect the architecture model or code generation. Users can place any valid architecture on any plate size.

| Level | Plate Type | Studs (X×Y) | Pixel Size (W×H) | Recommended Capacity | Learning Scenario |
|-------|------------|-------------|------------------|----------------------|-------------------|
| 입문 | **Subnet-S** | 4×6 | 160×240 | 1-2 blocks | Single resource placement |
| 입문 | **VNet-S** | 8×12 | 320×480 | 1-2 subnets | Basic network concept |
| 기초 | **Subnet-M** | 6×8 | 240×320 | 3-4 blocks | Public/Private separation |
| 기초 | **VNet-M** | 12×16 | 480×640 | 3-4 subnets | Multi-tier architecture |
| 중급 | **Subnet-L** | 8×10 | 320×400 | 5-6 blocks | Complex service groups |
| 중급 | **VNet-L** | 16×20 | 640×800 | 5+ subnets | Hub-Spoke, multi-VNet |

> **Capacity is a soft guideline**, not a hard limit. The UI should guide learners toward appropriate complexity without blocking valid placements.

### 4.2 Learning Scenario Examples

#### 입문 (Beginner): "내 첫 번째 VM"

```
┌─ VNet-S (8×12) ─────────────────┐
│                                  │
│  ┌─ Subnet-S (4×6) ──────┐      │
│  │                        │      │
│  │  ┌────────────┐       │      │
│  │  │  ┌──┐      │       │      │
│  │  │  │🐍│ ← python app │      │
│  │  │  └──┘      │       │      │
│  │  │  compute   │       │      │
│  │  │   (core)   │       │      │
│  │  └────────────┘       │      │
│  │                        │      │
│  └────────────────────────┘      │
│                                  │
└──────────────────────────────────┘

Learning goals:
- VNet = private network boundary
- Subnet = where resources live
- VM (compute) = runs application code
- App (python) = software running on VM
```

#### 기초 (Basic): "웹서버-DB 구성"

```
┌─ VNet-M (12×16) ───────────────────────────────────────────────────┐
│                                                                     │
│  ┌─ Subnet-M (6×8) "Public" ────┐  ┌─ Subnet-M (6×8) "Private" ──┐ │
│  │                               │  │                              │ │
│  │  ┌────────┐  ┌────────────┐  │  │  ┌────────────────────┐      │ │
│  │  │  🌐    │  │ 🌐  ☕  🔴 │  │  │  │    🐘   🔧         │      │ │
│  │  │gateway │  │  compute   │──│──│  │     database       │      │ │
│  │  │(service)│  │   (core)   │  │  │  │     (anchor)      │      │ │
│  │  └────────┘  └────────────┘  │  │  └────────────────────┘      │ │
│  │                               │  │                              │ │
│  └───────────────────────────────┘  └──────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Learning goals:
- Public subnet = internet-facing (gateway, web server)
- Private subnet = internal only (database)
- Traffic flow: Internet → Gateway → Compute → Database
- App stack: nginx(gateway) → java+redis(compute) → postgres(database)
```

#### 중급 (Intermediate): "Hub-Spoke 아키텍처"

```
                    ┌─ VNet-L (16×20) "Hub" ──────────────────┐
                    │                                          │
                    │  ┌─ Subnet-L (8×10) ──────────────────┐ │
                    │  │                                     │ │
                    │  │  ┌────────┐    ┌────────┐          │ │
                    │  │  │gateway │    │firewall│          │ │
                    │  │  │(service)│    │(service)│          │ │
                    │  │  └────────┘    └────────┘          │ │
                    │  │                                     │ │
                    │  └─────────────────────────────────────┘ │
                    │                                          │
                    └──────────────────────────────────────────┘
                           │                    │
          ┌────────────────┘                    └────────────────┐
          ▼                                                      ▼
┌─ VNet-M (12×16) "Spoke-1" ──┐          ┌─ VNet-M (12×16) "Spoke-2" ──┐
│                              │          │                              │
│  ┌─ Subnet-M ──┐            │          │  ┌─ Subnet-M ──┐            │
│  │  compute    │            │          │  │  compute    │            │
│  │  database   │            │          │  │  storage    │            │
│  └─────────────┘            │          │  └─────────────┘            │
│                              │          │                              │
└──────────────────────────────┘          └──────────────────────────────┘

Learning goals:
- Hub = shared services (gateway, firewall, DNS)
- Spoke = workload isolation per team/app
- VNet peering = secure cross-network communication
```

---

## 5. SVG Specifications

### 5.1 Application SVG (1×1 Cylinder)

Applications render as small cylinders sitting on top of resource bricks.

| File Pattern | Example | Dimensions (px) |
|--------------|---------|-----------------|
| `apps/{name}.svg` | `apps/nginx.svg` | 40×40 |

#### SVG Structure (Application)

```svg
<svg viewBox="0 0 40 40">
  <!-- Cylinder top (ellipse) -->
  <ellipse cx="20" cy="12" rx="16" ry="8" fill="{color}" />
  
  <!-- Cylinder body -->
  <rect x="4" y="12" width="32" height="16" fill="{color-dark}" />
  
  <!-- Cylinder bottom (half ellipse, hidden by body) -->
  <ellipse cx="20" cy="28" rx="16" ry="8" fill="{color-darker}" />
  
  <!-- Icon/Logo -->
  <text x="20" y="24" text-anchor="middle" font-size="14">{icon}</text>
</svg>
```

### 5.2 Resource Block SVG Files (Isometric)

Block SVGs are rendered in **2:1 dimetric isometric projection**. Each includes a diamond-shaped top face and two visible side faces (left and right), with 3D cylindrical studs.

| File | Size (Logical) | Description |
|------|----------------|-------------|
| `block-sprites/timer.svg` | 1×2 | Isometric Signal Brick |
| `block-sprites/event.svg` | 1×2 | Isometric Signal Brick |
| `block-sprites/function.svg` | 2×2 | Isometric Light Brick |
| `block-sprites/gateway.svg` | 2×4 | Isometric Service Brick |
| `block-sprites/queue.svg` | 2×4 | Isometric Service Brick |
| `block-sprites/storage.svg` | 2×4 | Isometric Service Brick |
| `block-sprites/compute.svg` | 3×4 | Isometric Core Brick |
| `block-sprites/database.svg` | 4×6 | Isometric Anchor Brick |

#### SVG Structure (Resource Block — Isometric 3D)

```svg
<svg viewBox="0 0 {W} {H}">
  <!-- 1. Left side face (darkest) -->
  <!-- 2. Right side face (dark) -->
  <!-- 3. Top face (isometric diamond, base color) -->
  <!-- 4. Highlight line (top-left edge) -->
  <!-- 5. Stud (single cylinder for blocks) -->
  <!-- 6. Icon and Label (rendered on visible side faces) -->
</svg>
```


### 5.3 Plate SVG Files (Isometric)

Plate SVGs are rendered in **2:1 dimetric isometric projection** as large, flat baseplates.

| File | Logical Size | Description |
|------|--------------|-------------|
| `plate-sprites/network.svg` | VNet | Isometric Baseplate |
| `plate-sprites/public-subnet.svg` | Subnet | Isometric Baseplate |
| `plate-sprites/private-subnet.svg` | Subnet | Isometric Baseplate |

#### SVG Structure (Plate — Isometric 3D)

```svg
<svg viewBox="0 0 {W} {H}">
  <defs>
    <symbol id="stud">...</symbol>
  </defs>
  <!-- 1. Left side face -->
  <!-- 2. Right side face -->
  <!-- 3. Top face (isometric diamond) -->
  <!-- 4. Stud grid (<use href="#stud"> in diamond layout) -->
</svg>
```

---

## 6. TypeScript Type Definitions

### 6.1 Application Types

```typescript
// Application categories
export type AppCategory = 
  | "web-server"    // nginx, apache, caddy
  | "runtime"       // nodejs, deno, bun
  | "language"      // java, python, go, rust
  | "database"      // postgres, mysql, redis, mongo
  | "package";      // npm, docker, k8s

// Application definition
export interface AppDefinition {
  id: string;           // e.g., "nginx", "postgres"
  name: string;         // e.g., "nginx", "PostgreSQL"
  category: AppCategory;
  icon: string;         // emoji or SVG path
  color: string;        // hex color
}

// Built-in applications
export const builtInApps: AppDefinition[] = [
  { id: "nginx", name: "nginx", category: "web-server", icon: "🌐", color: "#4CAF50" },
  { id: "nodejs", name: "Node.js", category: "runtime", icon: "⚡", color: "#8BC34A" },
  { id: "python", name: "Python", category: "language", icon: "🐍", color: "#FF9800" },
  { id: "java", name: "Java", category: "language", icon: "☕", color: "#FF9800" },
  { id: "postgres", name: "PostgreSQL", category: "database", icon: "🐘", color: "#2196F3" },
  { id: "redis", name: "Redis", category: "database", icon: "🔴", color: "#2196F3" },
  { id: "docker", name: "Docker", category: "package", icon: "🐳", color: "#9C27B0" },
];
```

### 6.2 Brick Footprint Types

```typescript
// Brick size tier names
export type BrickSizeTier = "signal" | "light" | "service" | "core" | "anchor";

// Footprint in stud units
export interface BrickFootprint {
  studsX: number;
  studsY: number;
}

// All brick footprints (updated: core is 3×4, not 2×6)
export const brickFootprints: Record<BrickSizeTier, BrickFootprint> = {
  signal:  { studsX: 1, studsY: 2 },
  light:   { studsX: 2, studsY: 2 },
  service: { studsX: 2, studsY: 4 },
  core:    { studsX: 3, studsY: 4 },  // 3×4 to fit 3-4 apps
  anchor:  { studsX: 4, studsY: 6 },
} as const;

// Brick app capacity (only hostable resources can have apps)
export const brickAppCapacity: Record<BrickSizeTier, number> = {
  signal:  0,  // Not hostable (triggers only)
  light:   1,  // Hostable: function (1 handler)
  service: 0,  // Not hostable (managed services)
  core:    4,  // Hostable: compute (3-4 apps)
  anchor:  0,  // Not hostable (managed database)
} as const;

// Resource → Brick size mapping
export const resourceBrickSize: Record<BlockCategory, BrickSizeTier> = {
  gateway:  "service",
  compute:  "core",
  database: "anchor",
  storage:  "service",
  function: "light",
  queue:    "service",
  event:    "signal",
  timer:    "signal",
} as const;
```

### 6.3 Plate Size Types

```typescript
// Plate size tier names
export type PlateSizeTier = "S" | "M" | "L";

// Plate types
export type PlateType = "vnet" | "subnet";

// Plate size key (e.g., "vnet-S", "subnet-M")
export type PlateSizeKey = `${PlateType}-${PlateSizeTier}`;

// Footprint in stud units
export interface PlateFootprint {
  studsX: number;
  studsY: number;
  maxBlocks: number;
  learningLevel: "입문" | "기초" | "중급";
}

// All plate footprints
export const plateFootprints: Record<PlateSizeKey, PlateFootprint> = {
  "subnet-S": { studsX: 4,  studsY: 6,  maxBlocks: 2,  learningLevel: "입문" },
  "vnet-S":   { studsX: 8,  studsY: 12, maxBlocks: 3,  learningLevel: "입문" },
  "subnet-M": { studsX: 6,  studsY: 8,  maxBlocks: 4,  learningLevel: "기초" },
  "vnet-M":   { studsX: 12, studsY: 16, maxBlocks: 8,  learningLevel: "기초" },
  "subnet-L": { studsX: 8,  studsY: 10, maxBlocks: 6,  learningLevel: "중급" },
  "vnet-L":   { studsX: 16, studsY: 20, maxBlocks: 12, learningLevel: "중급" },
} as const;
```

### 6.4 Pixel Conversion

```typescript
// 1 stud = 40px
export const STUD_SIZE_PX = 40;

// Convert stud footprint to pixel dimensions
export function footprintToPixels(footprint: BrickFootprint | PlateFootprint): {
  width: number;
  height: number;
} {
  return {
    width: footprint.studsX * STUD_SIZE_PX,
    height: footprint.studsY * STUD_SIZE_PX,
  };
}
```

---

## 7. 2:1 Dimetric Isometric Projection

### 7.1 Coordinate System

The **coordinate system uses 2:1 dimetric isometric projection** to provide a consistent 3D perspective:

| Property | Value |
|----------|-------|
| Tile Width (TILE_W) | 64px |
| Tile Height (TILE_H) | 32px |
| Vertical Step (TILE_Z) | 32px |
| World to Screen | `screenX = originX + (worldX - worldZ) × TILE_W / 2` |
| | `screenY = originY + (worldX + worldZ) × TILE_H / 2 - worldY × TILE_Z` |
| Grid alignment | Isometric diamond grid |
| Interaction | Isometric-aware math for drag and placement |

### 7.2 Isometric 3D Structure (SVG Sprites)

All **SVG sprites** are rendered as isometric 3D shapes. Unlike oblique projection which adds strips to 2D rectangles, isometric projection renders three distinct faces: a diamond-shaped top face and two visible side faces (left and right).

#### SVG Layer Structure (bottom to top)

All block and plate SVGs follow this isometric layer order:

1.  **Left side face**: Darkest shade, representing the X-Z depth on the left.
2.  **Right side face**: Dark shade, representing the X-Z depth on the right.
3.  **Top face**: Base color, rendered as an isometric diamond.
4.  **Highlight line**: A subtle 1px line along the top-left edges for definition.
5.  **Stud(s)**: 3D cylindrical studs (plates use a grid, blocks use a single large stud).
6.  **Label/Icon**: Rendered on the visible faces (usually left face for text).

#### Face Shading

| Face | Brightness | Color Derivation |
|------|------------|------------------|
| Top | 100% (base) | The block/plate's primary color |
| Right | ~80% | One shade darker than base |
| Left | ~60% | Two shades darker than base (darkest) |

### 7.3 Stud System (Isometric Implementation)

**Studs are rendered as 3D cylinders with elliptical tops to match the isometric perspective.**

#### Stud Types

-   **Plates**: Use individual ellipse studs (`<use href="#stud">`) arranged in a diamond grid corresponding to the stud units.
-   **Blocks**: Use a single large cylindrical stud consisting of a vertical body path and an elliptical top.

#### SVG Stud Structure (Individual Stud)

```svg
<symbol id="stud" viewBox="0 0 20 12">
  <!-- Stud Body (cylinder side) -->
  <path d="..." fill="{stud-shadow}" />
  <!-- Stud Top (ellipse) -->
  <ellipse cx="10" cy="4" rx="8" ry="4" fill="{stud-main}" />
  <!-- Inner Ring (optional highlight) -->
  <ellipse cx="10" cy="4" rx="5" ry="2.5" fill="{stud-highlight}" opacity="0.3" />
</symbol>
```

#### Stud Grid Math

For plates, studs are placed at isometric coordinates:
`x = (gridX - gridZ) * TILE_W / 2`
`y = (gridX + gridZ) * TILE_H / 2`

#### Stud Colors per Element

Each element uses **color-appropriate studs** to maintain the plastic Lego look:

| Element | Stud Main | Stud Shadow | Stud Highlight |
|---------|-----------|-------------|----------------|
| **Background** | #D2B48C | #C4A67A | #E0C9A6 |
| **network** plate | #42A5F5 | #1565C0 | #90CAF9 |
| **public-subnet** plate | #66BB6A | #2E7D32 | #A5D6A7 |
| **private-subnet** plate | #7986CB | #3949AB | #C5CAE9 |
| **gateway** block | #1991ed | #005494 | #66B5FF |
| **compute** block | #f57347 | #c23a10 | #FFA07A |
| **database** block | #4287d6 | #0d4a8a | #82B1E4 |
| **storage** block | #4CAF50 | #1B5E20 | #81C784 |
| **function** block | #26A69A | #005662 | #80CBC4 |
| **queue** block | #E91E63 | #7c0e3e | #F48FB1 |
| **event** block | #5C6BC0 | #1a2366 | #9FA8DA |
| **timer** block | #795548 | #3a251f | #A1887F |


> **Universal rule**: Stud **style** (3-layer ellipse pattern) and **size** (rx=12, ry=6, h=5) are identical everywhere. Only **colors** vary per element. See §0 for the inviolable standard.

---

## 8. Placement Rules

### 8.1 Stud Alignment

All placements snap to stud grid.

```typescript
// Snap position to nearest stud
export function snapToStud(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x / STUD_SIZE_PX) * STUD_SIZE_PX,
    y: Math.round(y / STUD_SIZE_PX) * STUD_SIZE_PX,
  };
}
```

### 8.2 Capacity Validation

```typescript
// Check if plate can accept another block
export function canPlaceBlock(
  plate: PlateFootprint,
  currentBlocks: number,
  newBlock: BrickFootprint
): boolean {
  // Simple capacity check
  if (currentBlocks >= plate.maxBlocks) return false;
  
  // TODO: Add spatial overlap detection
  return true;
}
```

---

## 9. Implementation Checklist

### Milestone 1: Application SVGs
- [ ] Create `apps/nginx.svg` (web server)
- [ ] Create `apps/nodejs.svg` (runtime)
- [ ] Create `apps/python.svg` (language)
- [ ] Create `apps/java.svg` (language)
- [ ] Create `apps/postgres.svg` (database)
- [ ] Create `apps/redis.svg` (database)
- [ ] Create `apps/docker.svg` (package)

### Milestone 2: Brick SVGs
- [ ] Create `bricks/1x2-signal.svg` template
- [ ] Create `bricks/2x2-light.svg` template
- [ ] Create `bricks/2x4-service.svg` template
- [ ] Create `bricks/3x4-core.svg` template
- [ ] Create `bricks/4x6-anchor.svg` template
- [ ] Update resource SVGs to use appropriate brick size

### Milestone 3: Plate SVGs
- [ ] Create `plates/subnet-s.svg`
- [ ] Create `plates/vnet-s.svg`
- [ ] Create `plates/subnet-m.svg`
- [ ] Create `plates/vnet-m.svg`
- [ ] Create `plates/subnet-l.svg`
- [ ] Create `plates/vnet-l.svg`

### Milestone 4: Type System
- [ ] Add `AppCategory` and `AppDefinition` types
- [ ] Add `builtInApps` constant
- [ ] Add `BrickSizeTier` type to `shared/types/index.ts`
- [ ] Add `brickFootprints` and `brickAppCapacity` constants
- [ ] Add `resourceBrickSize` mapping
- [ ] Add `PlateSizeTier` and `PlateFootprint` types
- [ ] Add `plateFootprints` constant

### Milestone 5: Component Updates
- [ ] Create `AppSprite.tsx` for application layer
- [ ] Update `BlockSprite.tsx` to render apps on top
- [ ] Update `PlateSprite.tsx` to use plate size
- [ ] Update placement validation logic
- [ ] Update block palette to show app slots

### Milestone 6: Learning Mode
- [ ] Add learning level selector to UI
- [ ] Filter available plate sizes by level
- [ ] Show capacity indicators on plates
- [ ] Add educational tooltips for app choices

---

## 10. Open Questions

1. **Dynamic plate sizing**: Should VNet plates auto-expand when more subnets are added, or require manual size selection?

2. **Block overflow**: When a plate reaches capacity, should we:
   - Block further placement (with message)?
   - Suggest upgrading to larger plate?
   - Allow overflow with visual warning?

3. **Mixed learning levels**: Can users mix plate sizes (e.g., VNet-L with Subnet-S), or enforce consistency?

4. **App placement**: Should apps auto-arrange on brick top, or allow manual positioning?

5. **Custom apps**: Allow users to define custom application types beyond built-in list?

---

## Appendix A: Reference Dimensions

### A.1 Real Lego Proportions (for reference)

| Lego Element | Studs | mm (L×W×H) |
|--------------|-------|------------|
| 1×1 brick | 1×1 | 8×8×9.6 |
| 2×4 brick | 2×4 | 16×32×9.6 |
| Baseplate | 32×32 | 256×256×3.2 |

### A.2 CloudBlocks Pixel Scale

| Element | Studs | Pixels |
|---------|-------|--------|
| App (cylinder) | 1×1 | 40×40 |
| signal brick | 1×2 | 40×80 |
| light brick | 2×2 | 80×80 |
| service brick | 2×4 | 80×160 |
| core brick | 3×4 | 120×160 |
| anchor brick | 4×6 | 160×240 |
| Subnet-S plate | 4×6 | 160×240 |
| VNet-L plate | 16×20 | 640×800 |
