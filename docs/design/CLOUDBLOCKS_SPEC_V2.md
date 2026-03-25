# CloudBlocks Universal Architecture Specification v2.0

> **Audience**: Contributors / Design System | **Status**: Draft — Reference | **Verified against**: v0.26.0

**Status**: Draft  
**Date**: 2026-03-19  
**Supersedes**: Block design spec (v1.x), VISUAL_DESIGN_SPEC.md (v1.x)

---

## 0. Design Principles

1. **Provider-agnostic, but provider-aware** — one model, three cloud renderings
2. **Grid-based deterministic layout** — no free positioning, integer CU only
3. **Pixel-perfect rendering** — no fractional pixels, no sub-pixel blurring
4. **Semantics and visuals aligned** — size = importance, color = identity
5. **Single base unit derivation** — all dimensions derive from one constant

---

## 1. Unit System

### 1.1 Cloud Unit (CU)

CloudBlocks uses **CU (Cloud Unit)** as its abstract spatial unit.

| Constant | Value | Description                                    |
| -------- | ----- | ---------------------------------------------- |
| `CU`     | 1     | Abstract unit for all spatial dimensions       |
| `CH`     | 1     | Abstract unit for vertical (height) dimensions |

All block/container block dimensions are **integer multiples** of CU and CH. No fractional dimensions.

### 1.2 Render Scale (CU → Pixel)

CU is a logical unit. The renderer converts CU to pixels via `RENDER_SCALE`.

| Constant       | Default  | Description           |
| -------------- | -------- | --------------------- |
| `RENDER_SCALE` | 32 px/CU | Pixels per Cloud Unit |

```
screen_px = dimension_in_CU × RENDER_SCALE
```

Examples at default scale (32 px/CU):

| Block            | CU Size | Screen Size |
| ---------------- | ------- | ----------- |
| function (1×1×1) | 1 CU    | 32×32 px    |
| compute (2×2×2)  | 2 CU    | 64×64 px    |
| database (3×3×2) | 3 CU    | 96×96 px    |

### 1.3 Derivation Chain

All visual constants derive from `RENDER_SCALE`:

```
RENDER_SCALE = 32 px/CU (base constant — the ONLY magic number)

Derived:
├── TILE_W       = RENDER_SCALE × 2         = 64 px  (isometric tile width)
├── TILE_H       = RENDER_SCALE             = 32 px  (isometric tile height, 2:1 ratio)
├── TILE_Z       = RENDER_SCALE             = 32 px  (depth/elevation scale)
│
├── PORT_RX      = RENDER_SCALE × 3/8       = 12 px  (port horizontal radius)
├── PORT_RY      = PORT_RX / 2              = 6 px   (port vertical radius, isometric)
├── PORT_HEIGHT  = RENDER_SCALE × 5/32      = 5 px   (port cylinder extrusion)
├── PORT_INNER_RX = PORT_RX × 0.6           = 7.2 px (inner ring horizontal radius)
├── PORT_INNER_RY = PORT_INNER_RX / 2       = 3.6 px (inner ring vertical radius)
│
├── BLOCK_MARGIN  = RENDER_SCALE × 5/16     = 10 px  (SVG margin around block)
└── BLOCK_PADDING = RENDER_SCALE × 5/16     = 10 px  (SVG padding inside block)
```

### 1.4 Ratio Table

| Ratio                      | Value                 | Block-Based Equivalent    |
| -------------------------- | --------------------- | ------------------------- |
| Isometric projection       | 2:1 (TILE_W : TILE_H) | —                         |
| Port diameter / tile width | 3/8 (37.5%)           | 5mm / 8mm = 62.5%         |
| Port height / tile height  | 5/32 (15.6%)          | 1.7mm / 9.6mm = 17.7%     |
| Inner ring / port          | 0.6                   | —                         |
| Port ry / rx               | 0.5                   | — (isometric compression) |

### 1.5 Pixel Precision Rules

| Rule                | Requirement                  |
| ------------------- | ---------------------------- |
| All positions       | Integer pixel values only    |
| All sizes           | Integer pixel values only    |
| Stroke widths       | 1px or 2px only              |
| 1px strokes         | Align to pixel center (+0.5) |
| Sub-pixel rendering | Forbidden                    |

---

## 2. Port Standard (INVIOLABLE)

### 2.1 The Block Principle

Every port in the system — container blocks, blocks, background — uses **identical geometry**. Only **colors** vary. This is the fundamental interoperability constraint.

### 2.2 Port Dimensions

All derived from `RENDER_SCALE`:

| Property           | Formula               | Default (32 px/CU) |
| ------------------ | --------------------- | ------------------ |
| Port rx            | `RENDER_SCALE × 3/8`  | 12 px              |
| Port ry            | `PORT_RX / 2`         | 6 px               |
| Port height        | `RENDER_SCALE × 5/32` | 5 px               |
| Inner ring rx      | `PORT_RX × 0.6`       | 7.2 px             |
| Inner ring ry      | `PORT_INNER_RX / 2`   | 3.6 px             |
| Inner ring opacity | 0.3                   | 0.3                |

### 2.3 Port SVG Template

```svg
<g id="port">
  <!-- Shadow (cylinder side) -->
  <ellipse cx="0" cy="{PORT_HEIGHT}" rx="{PORT_RX}" ry="{PORT_RY}" fill="{shadow}" />
  <!-- Top face -->
  <ellipse cx="0" cy="0" rx="{PORT_RX}" ry="{PORT_RY}" fill="{main}" />
  <!-- Inner ring (depth) -->
  <ellipse cx="0" cy="0" rx="{PORT_INNER_RX}" ry="{PORT_INNER_RY}" fill="{highlight}" opacity="0.3" />
</g>
```

### 2.4 Rules (HARD CONSTRAINTS)

1. **UNIFORM SIZE**: Every port renders at the same visual diameter. ONE port size.
2. **UNIFORM SHAPE**: 3-layer structure (shadow + top + inner ring). No exceptions.
3. **UNIFORM SPACING**: 1 CU center-to-center. Ports on a 2×2 block = 4 ports in 2×2 grid.
4. **NO SCALING**: Blocks get port grids matching their footprint, not one oversized port.
5. **COLOR ONLY VARIES**: Shadow, main, highlight colors change per element. Shape never changes.

### 2.5 CSS Background Ports

The infinite background grid uses a 2-layer CSS `radial-gradient` approximation. This is an acceptable deviation (CSS cannot render 3 concentric offset ellipses).

---

## 3. Grid System

| Property                | Value                                     |
| ----------------------- | ----------------------------------------- |
| Grid unit               | 1 CU                                      |
| Snap                    | Mandatory (all positions snap to CU grid) |
| Free positioning        | Forbidden                                 |
| Block spacing           | 1 CU                                      |
| Container block padding | 2 CU                                      |
| Layer spacing           | 2 CU                                      |

---

## 4. Layer Model

CloudBlocks defines a strict 6-layer hierarchy:

| Layer        | Purpose                            | Container Block Type | Examples                          |
| ------------ | ---------------------------------- | -------------------- | --------------------------------- |
| **Global**   | DNS, identity root, global routing | `global`             | Route 53, Azure DNS, Cloud DNS    |
| **Edge**     | CDN, WAF, edge routing             | `edge`               | CloudFront, Front Door, Cloud CDN |
| **Region**   | Network boundary (VPC/VNet)        | `region`             | VPC, VNet, VPC Network            |
| **Zone**     | Availability zone                  | `zone`               | AZ, Availability Zone, GCP Zone   |
| **Subnet**   | Logical network segmentation       | `subnet`             | Subnet, Subnetwork                |
| **Resource** | Cloud resources (blocks)           | —                    | EC2, VM, Compute Engine           |

### 4.1 Multi-Cloud Mapping

| Layer  | AWS               | Azure             | GCP        |
| ------ | ----------------- | ----------------- | ---------- |
| Global | Global            | Global            | Global     |
| Edge   | Edge Location     | Edge Zone         | Edge POP   |
| Region | Region            | Region            | Region     |
| Zone   | Availability Zone | Availability Zone | Zone       |
| Subnet | Subnet            | Subnet            | Subnetwork |

### 4.2 Hierarchy Rules

- Resources must be inside a subnet (or higher layer per placement rules)
- Subnets must be inside a zone or region
- Zones must be inside a region
- Edges are outside regions
- Globals are at the root level

---

## 5. Category System

### 5.1 Standard Categories

| Category        | Description                  | Base Size (CU) |
| --------------- | ---------------------------- | -------------- |
| `compute`       | VMs, containers, instances   | 2 × 2 × 2      |
| `database`      | Managed databases            | 3 × 3 × 2      |
| `storage`       | Object/file/block storage    | 2 × 2 × 2      |
| `gateway`       | Load balancers, API gateways | 3 × 1 × 1      |
| `function`      | Serverless functions         | 1 × 1 × 1      |
| `queue`         | Message queues               | 1 × 1 × 1      |
| `event`         | Event routers, buses         | 1 × 1 × 1      |
| `analytics`     | Data analytics, warehouses   | 3 × 3 × 2      |
| `identity`      | IAM, directory services      | 2 × 2 × 1      |
| `observability` | Monitoring, logging          | 2 × 2 × 1      |

Categories are **provider-neutral**.

### 5.2 Tier Mapping

| Tier     | Size (W×D×H CU) | Categories              |
| -------- | --------------- | ----------------------- |
| `micro`  | 1 × 1 × 1       | function, queue, event  |
| `small`  | 2 × 2 × 1       | identity, observability |
| `medium` | 2 × 2 × 2       | compute, storage        |
| `large`  | 3 × 3 × 2       | database, analytics     |
| `wide`   | 3 × 1 × 1       | gateway                 |

### 5.3 Size Rules

1. Database must be larger than or equal to compute
2. Gateway must be rectangular (width > depth)
3. Edge/global resources must be wide (≥ 4 × 1)
4. Size must NOT change based on scaling/aggregation
5. All dimensions are integer CU

---

## 6. Subtype Size Overrides

When a block has a specific `subtype`, its size may override the category default.

### 6.1 AWS

| Subtype     | Category      | Size (CU) |
| ----------- | ------------- | --------- |
| EC2         | compute       | 2 × 2 × 2 |
| Lambda      | function      | 1 × 1 × 1 |
| ECS / EKS   | compute       | 2 × 2 × 2 |
| RDS         | database      | 3 × 3 × 2 |
| DynamoDB    | database      | 3 × 3 × 2 |
| S3          | storage       | 3 × 3 × 2 |
| ALB / ELB   | gateway       | 3 × 1 × 1 |
| API Gateway | gateway       | 3 × 1 × 1 |
| CloudFront  | delivery      | 4 × 1 × 1 |
| NAT Gateway | gateway       | 2 × 1 × 1 |
| SQS         | queue         | 1 × 1 × 1 |
| SNS         | event         | 1 × 1 × 1 |
| EventBridge | event         | 1 × 1 × 1 |
| Route 53    | global        | 4 × 1 × 1 |
| CloudWatch  | observability | 2 × 2 × 1 |
| IAM         | identity      | 2 × 2 × 1 |
| Kinesis     | analytics     | 3 × 3 × 2 |
| Redshift    | analytics     | 3 × 3 × 2 |
| ElastiCache | database      | 3 × 3 × 2 |

### 6.2 Azure

| Subtype               | Category      | Size (CU) |
| --------------------- | ------------- | --------- |
| Virtual Machine       | compute       | 2 × 2 × 2 |
| Function App          | function      | 1 × 1 × 1 |
| AKS                   | compute       | 2 × 2 × 2 |
| Cosmos DB             | database      | 3 × 3 × 2 |
| Azure SQL Database    | database      | 3 × 3 × 2 |
| Storage Account       | storage       | 3 × 3 × 2 |
| Application Gateway   | gateway       | 3 × 1 × 1 |
| Front Door            | delivery      | 4 × 1 × 1 |
| Azure Firewall        | gateway       | 2 × 1 × 1 |
| Service Bus           | queue         | 1 × 1 × 1 |
| Event Grid            | event         | 1 × 1 × 1 |
| Event Hubs            | event         | 1 × 1 × 1 |
| Azure Monitor         | observability | 2 × 2 × 1 |
| Entra ID              | identity      | 2 × 2 × 1 |
| Azure DNS             | global        | 4 × 1 × 1 |
| Azure Cache for Redis | database      | 3 × 3 × 2 |
| Azure Synapse         | analytics     | 3 × 3 × 2 |

### 6.3 GCP

| Subtype              | Category      | Size (CU) |
| -------------------- | ------------- | --------- |
| Compute Engine       | compute       | 2 × 2 × 2 |
| Cloud Functions      | function      | 1 × 1 × 1 |
| GKE                  | compute       | 2 × 2 × 2 |
| Cloud SQL            | database      | 3 × 3 × 2 |
| Cloud Spanner        | database      | 3 × 3 × 2 |
| Cloud Storage        | storage       | 3 × 3 × 2 |
| Cloud Load Balancing | gateway       | 3 × 1 × 1 |
| Cloud CDN            | delivery      | 4 × 1 × 1 |
| Cloud Armor          | gateway       | 2 × 1 × 1 |
| Pub/Sub              | queue         | 1 × 1 × 1 |
| Eventarc             | event         | 1 × 1 × 1 |
| Cloud Monitoring     | observability | 2 × 2 × 1 |
| Cloud IAM            | identity      | 2 × 2 × 1 |
| Cloud DNS            | global        | 4 × 1 × 1 |
| Memorystore          | database      | 3 × 3 × 2 |
| BigQuery             | analytics     | 3 × 3 × 2 |
| Dataflow             | analytics     | 3 × 3 × 2 |

---

## 7. Color System

### 7.1 Core Principle

**Color represents resource identity defined by the cloud provider.** Not category, not arbitrary palette — the provider's official brand color for that service family.

### 7.2 AWS Service Colors

Source: AWS Architecture Icons (Release 18+), `awslabs/aws-icons-for-plantuml`

| Service Family      | Hex       | Services                                                 |
| ------------------- | --------- | -------------------------------------------------------- |
| **Compute**         | `#D86613` | EC2, Lambda, ECS, EKS                                    |
| **Database**        | `#CD2264` | RDS, DynamoDB, ElastiCache, Redshift                     |
| **Storage**         | `#3F8624` | S3, EFS, Glacier                                         |
| **Networking**      | `#693BC5` | VPC, Route 53, CloudFront, ALB, API Gateway, NAT Gateway |
| **App Integration** | `#CD2264` | SQS, SNS, EventBridge                                    |
| **Security**        | `#D6232C` | IAM, KMS                                                 |
| **Analytics**       | `#693BC5` | Kinesis, Athena                                          |
| **ML**              | `#1B7B67` | SageMaker                                                |
| **Management**      | `#693BC5` | CloudWatch                                               |
| **Brand Dark**      | `#232F3E` | Structural/text elements                                 |

### 7.3 Azure Service Colors

Source: Azure Architecture Icons, Microsoft Fluent Design, community SVG extraction

| Service Family       | Hex       | Services                                                |
| -------------------- | --------- | ------------------------------------------------------- |
| **Compute**          | `#0078D4` | Virtual Machine, App Service                            |
| **Serverless**       | `#FF8C00` | Azure Functions                                         |
| **Database**         | `#0078D4` | Azure SQL Database, Azure Synapse                       |
| **Database (NoSQL)** | `#32D4F5` | Cosmos DB, AKS                                          |
| **Storage**          | `#59B4D9` | Storage Account (Blob)                                  |
| **Networking**       | `#0078D4` | VNet, Application Gateway, Front Door, NAT Gateway, DNS |
| **Security**         | `#E0301E` | Azure Firewall, Azure Cache for Redis                   |
| **Messaging**        | `#0078D4` | Service Bus, Event Grid, Event Hubs                     |
| **Identity**         | `#0078D4` | Entra ID                                                |
| **Monitoring**       | `#0078D4` | Azure Monitor                                           |
| **IoT**              | `#B19AD7` | IoT Hub                                                 |

### 7.4 GCP Service Colors

Source: Google Cloud Architecture Icons (2025), Google Brand Colors

| Service Family     | Hex       | Services                                             |
| ------------------ | --------- | ---------------------------------------------------- |
| **Compute**        | `#4285F4` | Compute Engine, GKE, Cloud Functions                 |
| **Storage/DB**     | `#4285F4` | Cloud SQL, Cloud Spanner, Cloud Storage, Memorystore |
| **Networking**     | `#EA4335` | VPC, Load Balancing, CDN, NAT, DNS, Cloud Armor      |
| **Data/Analytics** | `#34A853` | BigQuery, Dataflow, Pub/Sub, Eventarc                |
| **Operations**     | `#FBBC05` | Cloud Monitoring, Cloud IAM                          |

### 7.5 Color Rules

1. Resource color **MUST** come from provider service family mapping
2. Category **MUST NOT** override provider resource color
3. Color **MUST** be consistent across all diagrams for the same resource
4. Do **NOT** mix multiple semantics into one color
5. Do **NOT** use random or arbitrary colors
6. Light/dark mode must both meet contrast requirements

### 7.6 Color Application

Color is applied to:

- Block top face (primary)
- Block side faces (darker shades, derived)
- Port colors (lighter tint, derived)
- Icon accent (if applicable)

### 7.7 Face Color Derivation

From a base provider color `BASE`:

| Face           | Derivation           | Example (AWS Compute #D86613) |
| -------------- | -------------------- | ----------------------------- |
| Top face       | `BASE`               | `#D86613`                     |
| Top stroke     | `lighten(BASE, 15%)` | lighter                       |
| Right side     | `darken(BASE, 10%)`  | darker                        |
| Left side      | `darken(BASE, 20%)`  | darkest                       |
| Port main      | `lighten(BASE, 15%)` | lighter                       |
| Port shadow    | `darken(BASE, 15%)`  | darker                        |
| Port highlight | `lighten(BASE, 40%)` | lightest                      |

---

## 8. Aggregation Model

A block may represent multiple instances of the same resource.

### 8.1 Modes

| Mode     | Description                  |
| -------- | ---------------------------- |
| `single` | One resource (default)       |
| `count`  | Multiple identical resources |

### 8.2 Rules

1. Size remains **fixed** regardless of count
2. Count is displayed as a **badge** on the block (e.g., "×6")
3. Count must be ≥ 1
4. Example: "EC2 ×6", "VM ×5"

---

## 9. Role Model

Blocks may have roles that affect visual indicators (badges, borders, opacity).

| Role        | Description           |
| ----------- | --------------------- |
| `primary`   | Main resource         |
| `secondary` | Supporting resource   |
| `reader`    | Read-only access      |
| `writer`    | Write access          |
| `public`    | Publicly accessible   |
| `private`   | Private/internal only |
| `internal`  | Internal service      |
| `external`  | External-facing       |

Roles affect **visual indicators only** — not size, color, or placement.

---

## 10. Placement Rules

| Rule             | Constraint                              |
| ---------------- | --------------------------------------- |
| Global resources | Cannot be inside subnet                 |
| Edge resources   | Cannot be inside zone                   |
| Zone resources   | Must belong to a zone                   |
| Subnet resources | Must belong to a subnet                 |
| Blocks           | Must stay inside parent container block |
| No overlapping   | Blocks must not overlap                 |
| Grid snap        | All positions must be CU-aligned        |

---

## 11. Connection Model

### 11.1 Connection Types

| Type       | Meaning                    |
| ---------- | -------------------------- |
| `dataflow` | Generic directional flow   |
| `http`     | HTTP/HTTPS request flow    |
| `internal` | Private service-to-service |
| `data`     | Database/storage access    |
| `async`    | Queue/event messaging      |

### 11.2 Direction Rule

Arrow points from **initiator** (caller/sender). Response is implied.

---

## 12. Rendering Rules

### 12.1 Priority

1. Subtype size override (if defined)
2. Category default size

### 12.2 Requirements

- Use CU-based sizing converted via `RENDER_SCALE`
- Snap all positions to CU grid
- Avoid overlap
- Maintain layer hierarchy visually
- Use 2:1 dimetric isometric projection

### 12.3 Isometric Projection

```
screenX = originX + (worldX - worldZ) × TILE_W / 2
screenY = originY + (worldX + worldZ) × TILE_H / 2 - worldY × TILE_Z
```

### 12.4 Depth Sorting

```
sortKey = layer × 1,000,000 + (worldX + worldZ + worldY) × 100
```

---

## 13. Block Dimension Reference Table

Complete computed dimensions for all tiers at `RENDER_SCALE = 32`:

### 13.1 Micro Tier (1×1×1 CU)

| Property        | CU            | Pixels |
| --------------- | ------------- | ------ |
| Width           | 1             | 32     |
| Depth           | 1             | 32     |
| Height          | 1             | 32     |
| SVG iso width   | (1+1)×32 = 64 | 64     |
| SVG iso diamond | (1+1)×16 = 32 | 32     |
| Side wall       | 1×32 = 32     | 32     |

Applies to: `function`, `queue`, `event`

### 13.2 Small Tier (2×2×1 CU)

| Property        | CU             | Pixels |
| --------------- | -------------- | ------ |
| Width           | 2              | 64     |
| Depth           | 2              | 64     |
| Height          | 1              | 32     |
| SVG iso width   | (2+2)×32 = 128 | 128    |
| SVG iso diamond | (2+2)×16 = 64  | 64     |
| Side wall       | 1×32 = 32      | 32     |

Applies to: `identity`, `observability`

### 13.3 Medium Tier (2×2×2 CU)

| Property        | CU             | Pixels |
| --------------- | -------------- | ------ |
| Width           | 2              | 64     |
| Depth           | 2              | 64     |
| Height          | 2              | 64     |
| SVG iso width   | (2+2)×32 = 128 | 128    |
| SVG iso diamond | (2+2)×16 = 64  | 64     |
| Side wall       | 2×32 = 64      | 64     |

Applies to: `compute`, `storage`

### 13.4 Large Tier (3×3×2 CU)

| Property        | CU             | Pixels |
| --------------- | -------------- | ------ |
| Width           | 3              | 96     |
| Depth           | 3              | 96     |
| Height          | 2              | 64     |
| SVG iso width   | (3+3)×32 = 192 | 192    |
| SVG iso diamond | (3+3)×16 = 96  | 96     |
| Side wall       | 2×32 = 64      | 64     |

Applies to: `database`, `analytics`

### 13.5 Wide Tier (3×1×1 CU)

| Property        | CU             | Pixels |
| --------------- | -------------- | ------ |
| Width           | 3              | 96     |
| Depth           | 1              | 32     |
| Height          | 1              | 32     |
| SVG iso width   | (3+1)×32 = 128 | 128    |
| SVG iso diamond | (3+1)×16 = 64  | 64     |
| Side wall       | 1×32 = 32      | 32     |

Applies to: `gateway`

### 13.6 Edge/Global Tier (4×1×1 CU)

| Property        | CU             | Pixels |
| --------------- | -------------- | ------ |
| Width           | 4              | 128    |
| Depth           | 1              | 32     |
| Height          | 1              | 32     |
| SVG iso width   | (4+1)×32 = 160 | 160    |
| SVG iso diamond | (4+1)×16 = 80  | 80     |
| Side wall       | 1×32 = 32      | 32     |

Applies to: CloudFront, Front Door, Cloud CDN, Route 53, Azure DNS, Cloud DNS

---

## 14. Accessibility

1. Contrast must meet WCAG 2.1 AA readability standards
2. Must support light and dark modes
3. Resources must remain distinguishable **without color** (shape + size as backup)
4. Labels must be readable at default `RENDER_SCALE`

---

## 15. Validation Rules

### Invalid Cases (Must Reject)

- Resource without required parent layer
- Edge resource placed inside subnet
- Zone resource placed outside zone
- Aggregation count < 1
- Block overlapping another block
- Position not aligned to CU grid
- Fractional CU dimensions

---

## 16. Migration

### 16.1 Clean Start

v2.0 is a **clean start**. No migration from v1.x data.

- v1.x workspaces are legacy and not forward-compatible
- Schema version bumps to `2.0.0`
- New workspace creation uses v2.0 types exclusively

---

## 17. Summary

CloudBlocks v2.0 evolves from a visual block-based diagram tool into a **universal architecture modeling specification** for cloud systems.

| Aspect          | v1.x                                      | v2.0                                        |
| --------------- | ----------------------------------------- | ------------------------------------------- |
| Unit system     | Implicit TILE_W=64                        | Explicit CU + RENDER_SCALE                  |
| Dimensions      | Magic numbers                             | Single derivation chain                     |
| Categories      | 8                                         | 10                                          |
| Layers          | 2 (network/subnet)                        | 6 (global→resource)                         |
| Colors          | Category-based                            | Provider-resource-based                     |
| Sizes           | Port footprint `[col,row]` + TIER_HEIGHTS | CU `W×D×H` integers                         |
| Multi-cloud     | Azure-first, partial                      | Provider-neutral with provider-aware colors |
| Pixel precision | Floats allowed                            | Integer-only, no sub-pixel                  |
| Aggregation     | None                                      | count badge                                 |
| Roles           | None                                      | 8 visual roles                              |
| Data migration  | —                                         | Clean start                                 |
