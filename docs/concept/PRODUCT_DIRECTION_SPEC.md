# CloudBlocks — Product Direction & Implementation Specification

> **Status**: Active — guides M21+ development
> **Last Updated**: 2026-03-22

## Vision

CloudBlocks is a **preset-driven visual cloud architecture design tool** — build infrastructure with modular blocks.
Place blocks, connect them via ports, and preview infrastructure across cloud providers.

---

## Core Principle: Block = Shape + Color + Port

Every resource in CloudBlocks is represented as a **Block**.

### Shape — by Resource Category

| Category            | Shape                                  | Examples                                        |
| ------------------- | -------------------------------------- | ----------------------------------------------- |
| Compute             | Rectangle                              | VM, App Service, Function                       |
| Storage/Data        | Cylinder                               | Storage Account, SQL Database, Cosmos DB        |
| Edge/Gateway        | Gateway (trapezoid)                    | Application Gateway, API Management, Front Door |
| Messaging           | Circle                                 | Event Hub, Service Bus, Event Grid              |
| Control/Operations  | Hexagon                                | Monitor, Key Vault, Log Analytics               |
| Network (container) | Rounded Rectangle (container boundary) | VNet, Subnet, Resource Group                    |
| Security            | Shield                                 | NSG, Firewall, WAF                              |

### Color — by Cloud Vendor

| Vendor        | Primary Color           | Usage                     |
| ------------- | ----------------------- | ------------------------- |
| Azure         | `#0078D4` (Azure Blue)  | All Azure resources       |
| AWS           | `#FF9900` (AWS Orange)  | All AWS resources         |
| GCP           | `#4285F4` (Google Blue) | All GCP resources         |
| Generic/Multi | `#6B7280` (Gray)        | Vendor-agnostic resources |

Shape is always the primary visual differentiator. Color is secondary — it tells you the vendor at a glance but does not change the shape.

### Port — Connection Points

Every block has **ports** — small connection points on its surface:

- **Left ports** = Inbound connections (this block receives)
- **Right ports** = Outbound connections (this block sends)
- **Center connection is FORBIDDEN** — all connections must go through ports
- Ports are part of the block's visual representation

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
- ✅ Port-based connections (left=in, right=out)
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

### Phase 1 — Port Definition

Add port metadata to the block model. Each ResourceBlock gets port definitions:

- Number of inbound ports (left)
- Number of outbound ports (right)
- Port positions computed from block geometry

### Phase 2 — Anchor Points

Ports become interactive anchor points on the block SVG:

- Visual indicators on hover
- Snap targets for connections
- Position calculation relative to block bounds

### Phase 3 — Connection Preview

When a user starts a connection from a port:

- Live preview line follows cursor
- Valid targets highlight
- Invalid targets dim

### Phase 4 — Routing

Connection routing between ports:

- Orthogonal path routing (L-shaped / Z-shaped)
- Path avoidance (don't overlap blocks)
- Visual connection style (liftarm beams or clean lines)

### Phase 5 — State Integration

Connection state fully integrated:

- Store tracks port-to-port connections
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
- Port colors match vendor theme
- Connection colors indicate type

---

## Semantic Block Shapes (Technical)

Replace existing silhouette system (tower/heavy/shield/module) with semantic shapes:

| New Shape                      | SVG Approach                                    | Maps to Category   |
| ------------------------------ | ----------------------------------------------- | ------------------ |
| Rectangle                      | Simple rect with rounded corners                | Compute            |
| Cylinder                       | Ellipse top + rect body + ellipse bottom        | Storage/Data       |
| Gateway                        | Trapezoid / chevron shape                       | Edge               |
| Circle                         | SVG circle/ellipse                              | Messaging          |
| Hexagon                        | 6-point polygon                                 | Control/Operations |
| Shield                         | Existing shield silhouette (keep)               | Security           |
| Rounded Rect (container block) | Large rounded rectangle with container behavior | Network            |

### Dimension System

Continue using CU (Compute Units) for sizing. Each shape maps to CU dimensions.
The `getBlockDimensions()` → `cuToSilhouetteDimensions()` pipeline remains, but silhouette generators are replaced.

---

## Architecture Constraints

### What Changes

1. `BlockSilhouette` type extended with new shape names
2. `SILHOUETTE_GENERATORS` gets new generators for each shape
3. `CATEGORY_TIER_MAP` in visualProfile.ts updated for new mappings
4. `Connection` model gets `sourcePort` / `targetPort` fields
5. `getEndpointWorldPosition()` extended for port positions
6. `ConnectionRenderer` updated for port-to-port routing
7. `EmptyCanvasOverlay` replaced with new First Screen

### What Stays

- Block model (`kind: 'container' | 'resource'`)
- Zustand store architecture (3 stores)
- InteractJS for drag & drop
- Isometric projection system
- Grid snapping
- CU-based dimension system
- Template system

### Azure-Only Implementation

While the architecture supports multi-vendor extensibility, all actual implementation uses Azure resources only. AWS/GCP support is planned but deferred.
