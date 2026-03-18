# CloudBlocks

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vite.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688)](https://fastapi.tiangolo.com/)

**CloudBlocks is an architecture compiler that converts visual infrastructure designs into infrastructure-as-code.**

CloudBlocks models cloud infrastructure using a **Lego-style architecture system**. Users assemble infrastructure by placing visual blocks on plates, connect components, and validate against real-world rules — all from the browser. The platform then compiles architecture into deployable code (Terraform, Bicep, Pulumi).

## Why CloudBlocks?

Most IaC tools work **code → diagram** (visualize existing infra). CloudBlocks works **architecture → code** (model visually, compile to infra). No YAML. No HCL. Just place, connect, validate, generate.

| | Diagram Tool | CloudBlocks |
|--|-------------|-------------|
| Output | Static image | Architecture model + IaC code |
| Validation | None | Rule engine enforces constraints |
| Semantics | Visual only | Every element maps to a real resource |

### Current Features

- **Lego-style modeling** — Plates (boundaries) + Blocks (resources) + typed Connections
- **Multi-provider modeling foundations** — provider-aware domain types and adapter structure (Azure-first generation)
- **Architecture compiler** — Visual design compiles to Terraform, Bicep, and Pulumi (Bicep/Pulumi are Azure-targeted today)
- **Validation engine** — Real-time rule checking for placement and connections
- **Code generation** — Multi-generator export: Terraform, Bicep, Pulumi with draft/production modes (Milestone 6)
- **Architecture templates** — Built-in starter templates with gallery UI (Milestone 4)
- **Undo/redo** — Full history with keyboard shortcuts (Milestone 2)
- **Multi-workspace** — Create, switch, and manage multiple workspaces (Milestone 4)
- **GitHub integration** — OAuth login, repo sync, pull, and PR creation (Milestone 5)
- **Session-based auth** — Cookie-based server sessions (`cb_session`) with GitHub OAuth login (Phase 7)
- **Backend API** — FastAPI orchestration layer with GitHub OAuth + session auth (Milestone 5+)
- **Sound effects** — Audio feedback with mute preference (Phase 2)
- **Magnetic snap & tactile UX** — Grid snapping, dynamic shadows, bounce transitions on drag (Phase 2 UX)
- **Lego minifigure** — DevOps engineer character with Azure provider branding (Phase 3)
- **Architecture diff** — Compare local vs GitHub architecture with visual overlays (Milestone 7)
- **Cloud resource blocks (8 categories)** — compute, database, storage, gateway, function, queue, event, timer (Milestone 6)
- **Block-to-block connections** — `dataflow`, `http`, `internal`, `data`, `async`
- **Open source** — Apache 2.0 licensed, extend and contribute freely

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks

# Install dependencies
pnpm install

# Start the frontend dev server
cd apps/web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to start building.

> **Note**: The frontend works standalone as an SPA. Start the backend (`apps/api`) for GitHub integration features.

### Workflow

```
Design in visual builder  →  architecture.json  →  Generate Terraform  →  Commit to GitHub  →  CI/CD deploys
```

## Architecture

CloudBlocks is a monorepo with a React frontend and a Python FastAPI backend.

```
cloudblocks/
├── apps/
│   ├── web/          # React + SVG frontend (FSD architecture)
│   └── api/          # Python FastAPI backend (auth, GitHub integration)
├── packages/         # Shared packages (scaffolded)
├── docs/             # Project documentation
├── infra/            # Infrastructure-as-code for self-hosting
├── scripts/          # Dev, build, deploy scripts
└── examples/         # Example architectures
```

## Core Concepts

### Plates (Containers)
- **Network Plate** — Virtual Network (Azure VNet)
- **Subnet Plate** — Public or Private subnet within a Network

### Blocks (Resources)
- **Compute** — Virtual machines and app platforms
- **Database** — Managed database instances
- **Storage** — Blob and object stores
- **Gateway** — Public ingress and routing blocks
- **Function** — Serverless execution blocks
- **Queue** — Messaging and buffering blocks
- **Event** — Event routing blocks
- **Timer** — Scheduled trigger blocks

### Connections (5 Types)
- **dataflow** — Directional traffic flow between components
- **http** — Request/response interaction across services
- **internal** — Internal control-plane or admin communication
- **data** — Data synchronization and state-sharing links
- **async** — Asynchronous event or callback links

```
Internet → Gateway (dataflow) → Compute (data) → Database
                             → Storage
Timer (async) → Function (async) → Event
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, SVG + CSS, Zustand 5, Vite 8 |
| Backend | Python 3.10+, FastAPI 0.110+ |
| Storage (local) | Browser localStorage |
| Storage (remote) | GitHub repos (Git-native), SQLite (auth + session metadata) |
| Code Generation | Terraform, Bicep, Pulumi (Azure-first, AWS + GCP adapters) |
| Frontend Architecture | Feature-Sliced Design (FSD) |
| Monorepo | pnpm 9 workspaces |

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/concept/PRD.md) | Product Requirements Document |
| [Domain Model](docs/model/DOMAIN_MODEL.md) | Domain entities and rules |
| [Architecture](docs/concept/ARCHITECTURE.md) | System architecture |
| [Storage Architecture](docs/model/STORAGE_ARCHITECTURE.md) | Git-native storage design |
| [API Spec](docs/api/API_SPEC.md) | REST API endpoints |
| [Roadmap](docs/concept/ROADMAP.md) | Development roadmap |
| [Deployment](docs/guides/DEPLOYMENT.md) | Deployment guide |
| [Tutorials](docs/guides/TUTORIALS.md) | Getting started tutorials |
| [Contributing](CONTRIBUTING.md) | Contributor guide |
| [ADRs](docs/adr/) | Architecture Decision Records |

## Development

```bash
# Frontend development
cd apps/web && pnpm dev

# Build
cd apps/web && pnpm build

# Type check
cd apps/web && npx tsc -b

# Backend
cd apps/api && pip install -e ".[dev]" && uvicorn app.main:app --reload
```

## Examples

- [Three-Tier Web App](examples/three-tier-web-app/) — Classic three-tier architecture
- [Serverless API](examples/serverless-api/) — Serverless function architecture
- [Event-Driven Pipeline](examples/event-driven-pipeline/) — Event processing pattern

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| Milestone 1 | Frontend MVP — top-down visual builder with validation | ✅ Complete |
| Milestone 2 | Enhanced UX — undo/redo, workspace management, visual polish | ✅ Complete |
| Milestone 3 | Code generation — Terraform export (Azure first) | ✅ Complete |
| Milestone 4 | Architecture templates — built-in starter templates with gallery | ✅ Complete |
| Milestone 5 | GitHub integration, backend API | ✅ Complete |
| Milestone 6 | Multi-generator (Bicep, Pulumi), template marketplace | ✅ Complete |
| Milestone 6B | Builder UX completion — drag-to-create, onboarding, selection states | ✅ Complete |
| Milestone 6C | Learning Mode — guided scenarios, step validation, hint engine | ✅ Complete |
| Milestone 7 | Collaboration + CI/CD — architecture diff, GitHub Actions template | ✅ Complete |
| Phase 2 UX | Tactile UX — magnetic snap, dynamic shadows, bounce transitions | ✅ Complete |
| Phase 7 | Session auth — cookie-based server sessions with GitHub OAuth | ✅ Complete |
| Phase 9 | Visual Builder Evolution — UX state machine, brick system, model/provider foundations | ✅ Complete |
| Phase 10 | Documentation Accuracy — canonical docs aligned with current implementation | ✅ Complete |
| Phase 11 | UX/UI Improvements — toast notifications, connection selection, performance | ✅ Complete |
| Milestone 8 | Multi-Cloud Platform — AWS/GCP provider adapters, cross-provider comparison | ✅ Complete |
| Milestone 9 | UX Core Hardening | 🔄 Planned |
| Milestone 10 | External Actors & DevOps UX | 🔄 Planned |
| Milestone 11 | Brick Design System | 🔄 Planned |
| Milestone 12 | Core Model & Provider System | 🔄 Planned |
| Milestone 13 | Terraform Pipeline | 🔄 Planned |
| Milestone 14 | AI Roadmap | 🔄 Planned |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Quick start:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure the build passes: `cd apps/web && npx tsc -b && npx vite build`
4. Commit with a descriptive message
5. Open a Pull Request

Please follow existing code patterns and ensure TypeScript strict mode passes.

## License

[Apache 2.0](LICENSE)
