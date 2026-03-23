# CloudBlocks — Product Direction & Implementation Specification

> **Status**: Active — guides M21+ development
> **Last Updated**: 2026-03-22

## Vision

CloudBlocks is a **visual cloud architecture builder** — build infrastructure like Lego.
Place blocks, connect them via stubs, and generate infrastructure-as-code.

---

## Core Principle: Block = Shape + Color + Stub

Every resource in CloudBlocks is represented as a **Block** (internally `ResourceNode`).

### Shape — by Resource Category

| Category            | Shape                     | Examples                                        |
| ------------------- | ------------------------- | ----------------------------------------------- |
| Compute             | Rectangle                 | VM, App Service, Function                       |
| Storage/Data        | Cylinder                  | Storage Account, SQL Database, Cosmos DB        |
| Edge/Gateway        | Gateway (trapezoid)       | Application Gateway, API Management, Front Door |
| Messaging           | Circle                    | Event Hub, Service Bus, Event Grid              |
| Control/Operations  | Hexagon                   | Monitor, Key Vault, Log Analytics               |
| Network (container) | Rounded Rectangle (plate) | VNet, Subnet, Resource Group                    |
| Security            | Shield                    | NSG, Firewall, WAF                              |

### Color — by Cloud Vendor

| Vendor        | Primary Color           | Usage                     |
| ------------- | ----------------------- | ------------------------- |
| Azure         | `#0078D4` (Azure Blue)  | All Azure resources       |
| AWS           | `#FF9900` (AWS Orange)  | All AWS resources         |
| GCP           | `#4285F4` (Google Blue) | All GCP resources         |
| Generic/Multi | `#6B7280` (Gray)        | Vendor-agnostic resources |

Shape is always the primary visual differentiator. Color is secondary — it tells you the vendor at a glance but does not change the shape.

### Stub — Connection Points

Every block has **stubs** — small connection points on its surface:

- **Left stubs** = Inbound connections (this block receives)
- **Right stubs** = Outbound connections (this block sends)
- **Center connection is FORBIDDEN** — all connections must go through stubs
- Stubs are part of the block's visual representation

---

## First Screen Design

When the user opens CloudBlocks, they see:

### Landing Page (replaces EmptyCanvasOverlay)

- Dark theme background (`#0f172a`)
- CloudBlocks logo + tagline
- Three primary actions:
  1. **Create** — Start a new architecture from scratch
  2. **Explore Templates** — Browse pre-built architecture patterns
  3. **Import** — Load an existing architecture file

### Success Criteria (Time-to-Value)

- **10 seconds** — User clicks "Create"
- **30 seconds** — First block placed on canvas
- **3 minutes** — Complete a basic architecture structure

---

## MVP Scope

### MVP Resources (6 core)

| Resource                  | Category     | Shape     |
| ------------------------- | ------------ | --------- |
| User (External Actor)     | Edge         | Gateway   |
| Gateway (API/App Gateway) | Edge         | Gateway   |
| App (Compute Instance)    | Compute      | Rectangle |
| Database                  | Data         | Cylinder  |
| Queue (Messaging)         | Messaging    | Circle    |
| Storage                   | Storage/Data | Cylinder  |

### MVP Features

- ✅ Drag & Drop block placement
- ✅ Grid-snapped placement
- ✅ Stub-based connections (left=in, right=out)
- ✅ Connection suggestion (visual hint)
- ✅ Minimal explanation panel
- ✅ Template gallery

### Excluded from MVP

- ❌ GitHub integration
- ❌ Architecture diff
- ❌ Code generation
- ❌ Multi-cloud switching
- ❌ i18n / localization
- ❌ AI assistant

---

## Implementation Phases

### Phase 1 — Stub Definition

Add stub metadata to the block model. Each ResourceNode gets stub definitions:

- Number of inbound stubs (left)
- Number of outbound stubs (right)
- Stub positions computed from block geometry

### Phase 2 — Anchor Points

Stubs become interactive anchor points on the block SVG:

- Visual indicators on hover
- Snap targets for connections
- Position calculation relative to block bounds

### Phase 3 — Connection Preview

When user starts a connection from a stub:

- Live preview line follows cursor
- Valid targets highlight
- Invalid targets dim

### Phase 4 — Routing

Connection routing between stubs:

- Orthogonal path routing (L-shaped / Z-shaped)
- Path avoidance (don't overlap blocks)
- Visual connection style (liftarm beams or clean lines)

### Phase 5 — State Integration

Connection state fully integrated:

- Store tracks stub-to-stub connections
- Undo/redo support
- Serialization/deserialization

### Phase 6 — Legacy Removal

Remove old center-to-center connection system:

- Remove pillar-based connection endpoints
- Remove center-point endpoint calculation
- Clean up legacy connection rendering

### Phase 7 — Color System

Apply vendor-based color system:

- Block face colors derived from vendor
- Stud colors match vendor theme
- Connection colors indicate type

---

## Semantic Block Shapes (Technical)

Replace existing silhouette system (tower/heavy/shield/module) with semantic shapes:

| New Shape            | SVG Approach                                    | Maps to Category   |
| -------------------- | ----------------------------------------------- | ------------------ |
| Rectangle            | Simple rect with rounded corners                | Compute            |
| Cylinder             | Ellipse top + rect body + ellipse bottom        | Storage/Data       |
| Gateway              | Trapezoid / chevron shape                       | Edge               |
| Circle               | SVG circle/ellipse                              | Messaging          |
| Hexagon              | 6-point polygon                                 | Control/Operations |
| Shield               | Existing shield silhouette (keep)               | Security           |
| Rounded Rect (plate) | Large rounded rectangle with container behavior | Network            |

### Dimension System

Continue using CU (Compute Units) for sizing. Each shape maps to CU dimensions.
The `getBlockDimensions()` → `cuToSilhouetteDimensions()` pipeline remains, but silhouette generators are replaced.

---

## Architecture Constraints

### What Changes

1. `BrickSilhouette` type extended with new shape names
2. `SILHOUETTE_GENERATORS` gets new generators for each shape
3. `CATEGORY_TIER_MAP` in visualProfile.ts updated for new mappings
4. `Connection` model gets `sourcePort` / `targetPort` fields
5. `getEndpointWorldPosition()` extended for stub positions
6. `BrickConnector` updated for stub-to-stub routing
7. `EmptyCanvasOverlay` replaced with new First Screen

### What Stays

- ResourceNode model (ContainerNode / LeafNode)
- Zustand store architecture (3 stores)
- InteractJS for drag & drop
- Isometric projection system
- Grid snapping
- CU-based dimension system
- Template system

### Azure-Only Implementation

While the architecture supports multi-vendor extensibility, all actual implementation uses Azure resources only. AWS/GCP support is planned but deferred.
