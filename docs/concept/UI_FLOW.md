# CloudBlocks UI Flow

> Describes the actual user interaction flows implemented in CloudBlocks (Milestones 1–18).

---

## Overview

```
Entry Point  →  Canvas Workspace  →  Build Architecture  →  Validate  →  Generate Code  →  Deploy via GitHub
```

CloudBlocks follows a **model → compile → deploy** workflow. Users visually assemble cloud infrastructure, the system validates it in real-time, and then compiles the architecture into deployable infrastructure-as-code.

---

## 1. Entry Points

When the canvas is empty, users see the **EmptyCanvasOverlay** with three options:

| Action | What Happens |
|--------|-------------|
| **Use Template** | Opens the Template Gallery with pre-built architectures (three-tier web app, serverless API, event-driven pipeline) |
| **Start from Scratch** | Creates a default Network (VNet) plate on the canvas |
| **Learn How** | Opens the Scenario Gallery for guided, step-by-step building |

Users can also start from the **MenuBar**:
- `File → New Workspace` — creates a blank workspace
- `Insert → Network / Subnet` — adds plates directly
- `Learn → Browse Scenarios` — opens Learning Mode

---

## 2. Canvas Workspace

The canvas is an SVG-based 2D workspace with 2.5D isometric rendering.

### Plates (Infrastructure Boundaries)

| Plate Type | Maps To | Nesting |
|-----------|---------|---------|
| **Network** | Azure VNet / AWS VPC / GCP VPC | Top-level container |
| **Subnet** | Public or Private subnet | Must be inside a Network |

Plates are placed via the Insert menu or by dragging from the CommandCard palette.

### Blocks (Cloud Resources)

10 resource categories, placed inside plates:

| Category | Examples | Initiator? |
|----------|----------|-----------|
| **Compute** | VM, App Service | Yes |
| **Database** | SQL, Cosmos DB | No (receiver-only) |
| **Storage** | Blob, Data Lake | No (receiver-only) |
| **Gateway** | API Gateway, Load Balancer | Yes |
| **Function** | Azure Function, Lambda | Yes |
| **Queue** | Service Bus, SQS | Yes (to function only) |
| **Event** | Event Grid, EventBridge | Yes (to function only) |
| **Analytics** | Log Analytics, CloudWatch | No (receiver-only) |
| **Identity** | Entra ID, IAM | No (receiver-only) |
| **Observability** | Azure Monitor, CloudWatch | No (receiver-only) |

Blocks are created by dragging from the **CommandCard** palette in the Bottom Panel, or via `Insert` menu.

### Interaction Model

- **Grid snapping** with magnetic alignment (via interactjs)
- **Dynamic shadows** respond to element depth
- **Bounce transitions** on drag start/end
- **Undo/redo** via `Ctrl+Z` / `Ctrl+Shift+Z` (zundo middleware)
- **Sound effects** with mute preference toggle

---

## 3. Connections

Connections represent communication flows between blocks.

### Connection Types

| Type | Meaning | Visual |
|------|---------|--------|
| `dataflow` | Directional traffic flow | Solid arrow |
| `http` | Request/response interaction | Dashed arrow |
| `internal` | Internal control-plane communication | Dotted line |
| `data` | Data synchronization and state-sharing | Double line |
| `async` | Asynchronous event or callback | Wavy line |

### Connection Rules

- **Initiator model**: Source block must be an initiator (compute, gateway, function, queue, event)
- **Receiver-only**: Database, storage, analytics, identity, and observability blocks cannot initiate connections
- Connections are created by clicking a source block's port, then clicking the target block

### Example Topology

```
Internet → Gateway (dataflow) → Compute (data) → Database
                              → Storage
Event (async) → Function (async) → Queue
```

---

## 4. Validation

The rule engine validates architecture in real-time.

### Validation Levels

| Level | What It Checks |
|-------|---------------|
| **Placement** | Blocks must be inside appropriate plates (e.g., compute inside subnet) |
| **Connection** | Valid source/target pairs, initiator rules |
| **Architecture** | Cross-cutting constraints (e.g., database cannot connect to internet directly) |

### Validation Feedback

- **Real-time**: Errors appear as the user builds (toast notifications)
- **On-demand**: `Build → Validate Architecture` runs full validation
- **Visual**: Invalid elements are highlighted with error indicators

---

## 5. Code Generation

Users generate infrastructure-as-code from their visual architecture.

### Generators

| Generator | Provider | Status |
|-----------|----------|--------|
| **Terraform** | Azure, AWS, GCP | Production |
| **Bicep** | Azure | Production |
| **Pulumi** | Azure | Production |

### Generation Flow

```
Visual Architecture → architecture.json → Select Generator → Preview Code → Copy / Export
```

- **Draft mode**: Quick generation for prototyping
- **Production mode**: Full resource configuration with best practices
- **Cross-provider comparison**: View the same architecture in Terraform, Bicep, and Pulumi side-by-side

Access via `Build → Generate` in the MenuBar.

---

## 6. GitHub Integration

CloudBlocks syncs architectures with GitHub repositories.

### Flow

```
OAuth Login → Link Repository → Push Architecture → Pull / Compare → Create PR
```

| Action | Description |
|--------|-------------|
| **Login** | GitHub OAuth via the backend API |
| **Link repo** | Connect a workspace to a GitHub repository |
| **Push** | Save `architecture.json` to the linked repository |
| **Pull** | Load architecture from GitHub |
| **Diff** | Compare local vs remote architecture with visual overlays |
| **PR** | Create a pull request with architecture changes |

Access via `File → GitHub` submenu in the MenuBar.

---

## 7. Learning Mode

Guided scenarios teach users how to build architectures step-by-step.

### Components

| Component | Role |
|-----------|------|
| **Scenario Gallery** | Browse available scenarios by difficulty |
| **Learning Panel** | Shows current step, progress, and hints |
| **Step Validator** | State-based validation (checks architecture state, not action sequence) |
| **Hint Engine** | Progressive disclosure — hints appear after inactivity |

### Flow

```
Learn → Browse Scenarios → Select Scenario → Follow Steps → Complete
```

- Scenarios range from beginner (place a VNet) to advanced (full three-tier architecture)
- Validation checks the architecture state at each step, not how the user got there
- Users can exit Learning Mode at any time and keep their architecture

---

## 8. Workspace Management

### Multiple Workspaces

- Create, rename, and switch between workspaces
- Each workspace has its own architecture, undo history, and GitHub link

### Bottom Panel (StarCraft-style)

The Bottom Panel provides context-sensitive controls:

| Mode | When Active | Controls |
|------|------------|----------|
| **Creation** | No selection | Block category palette (drag to create) |
| **Block Action** | Block selected | Block details, rename, delete, connection options |
| **Plate Action** | Plate selected | Plate details, rename, resize, delete |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` | Remove selected element |
| `Escape` | Deselect / cancel |

---

## 9. Cloud Provider Switching

CloudBlocks supports three cloud providers: **Azure**, **AWS**, and **GCP**. The active provider is a global UI toggle that controls which resources are available and how new blocks are tagged.

### Provider Toggle

The **MenuBar** displays three provider tabs (Azure / AWS / GCP). Clicking a tab switches the active provider context.

| What Changes | Description |
|-------------|-------------|
| **Resource palette** | CommandCard filters available resources by provider |
| **New blocks** | Newly created blocks are tagged with the active provider |
| **Minifigure** | Worker character changes appearance to match the active provider |
| **Code generation** | CodePreview generates IaC for the active provider |
| **Drag ghost** | Shows the active provider name during drag operations |

### Provider Safety Guards

| Guard | When |
|-------|------|
| **Switch confirmation dialog** | Shown when canvas has blocks from a provider other than the one being switched to |
| **Block provider badge** | Each block displays a small provider indicator (Az / AW / GC) on its sprite |
| **CodePreview mismatch warning** | Shown when the active provider differs from existing blocks' provider tags |

### Existing Block Behavior

- **Blocks retain their original provider** — switching providers does NOT change existing blocks
- **Mixed-provider architectures** are allowed — the system warns but does not prevent mixing
- Each block's provider is set at creation time and stored in the architecture model (`Block.provider`)

### Architecture

```
activeProvider (uiStore — global UI toggle)
  ├── MenuBar          → Provider tab buttons (with confirmation dialog)
  ├── SceneCanvas      → New blocks tagged with activeProvider
  ├── CommandCard      → Resource list filtered by provider
  ├── CodePreview      → IaC generation + mismatch warning
  ├── MinifigureSprite → Character appearance matches provider
  └── DragGhost        → Provider name during drag
```

---

## Future Extensions

Planned capabilities for upcoming milestones:

- **Plate-level provider binding** — Each plate (VPC/resource group) owns its provider, blocks inherit from parent plate
- **Cross-provider validation** — Warnings for invalid cross-provider connections
- **Terraform pipeline** — Direct deployment from the builder (Milestone 13)
- **AI-powered tutoring** — Intelligent architecture suggestions (Milestone 14)
- **Collaborative editing** — Real-time multi-user architecture building
