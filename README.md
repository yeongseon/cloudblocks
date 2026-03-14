# CloudBlocks

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)

**Open-source 3D visual cloud architecture builder that generates deployable infrastructure code.**

Design cloud infrastructure by placing blocks on plates in a 3D scene, connect components visually, validate against real-world rules, and generate production-ready Terraform / Bicep / Pulumi code — all from your browser.

## Why CloudBlocks?

Most IaC tools work **code → diagram** (visualize existing infra). CloudBlocks works **diagram → code** (design visually, generate infra). No YAML. No HCL. Just drag, drop, connect, generate.

- **Visual-first** — 3D block builder powered by React Three Fiber
- **Git-native** — Your architecture lives in GitHub repos, not a proprietary database
- **Code generation** — Export to Terraform, Bicep, or Pulumi with one click
- **Validation engine** — Real-time rule checking before you generate
- **Open source** — MIT licensed, extend and contribute freely

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

## How It Works

```
Design in 3D UI  →  architecture.json  →  Generate Terraform  →  Commit to GitHub  →  CI/CD deploys
```

1. **Place blocks** — Compute, Database, Storage, Gateway on network plates
2. **Connect** — Draw data flow connections between components
3. **Validate** — Built-in rules check subnet placement, security, and connectivity
4. **Generate** — Export to Terraform (Bicep/Pulumi coming soon)
5. **Deploy** — Push to GitHub, let your CI/CD pipeline handle the rest

## Architecture

CloudBlocks is a monorepo with a **Git-native SaaS architecture** — GitHub repos serve as the primary data store, with a thin orchestration backend.

```
cloudblocks/
├── apps/
│   ├── web/          # React + Three.js frontend (FSD architecture)
│   └── api/          # Python FastAPI backend (thin orchestration layer)
├── packages/
│   ├── schema/       # Shared JSON schema definitions
│   ├── cloudblocks-domain/  # Domain logic package
│   ├── cloudblocks-ui/      # Reusable UI components
│   └── terraform-templates/ # IaC code templates
├── docs/             # Project documentation
├── infra/            # Infrastructure-as-code for self-hosting
├── scripts/          # Dev, build, deploy scripts
└── examples/         # Example architectures
```

## Core Concepts

### Plates (Containers)
- **Network Plate** — Virtual Network (VNet)
- **Subnet Plate** — Public or Private subnet within a Network

### Blocks (Resources)
- **Compute** — VMs, Container Apps (placed on Subnet)
- **Database** — Managed database instances (placed on Private Subnet)
- **Storage** — Blob / object storage (placed on Subnet)
- **Gateway** — App Gateway, Load Balancer (placed on Public Subnet)

### Connections (DataFlow)
```
Internet → Gateway → Compute → Database
                            → Storage
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, React Three Fiber, Zustand, Vite |
| Backend | Python, FastAPI (thin orchestration layer) |
| Storage | GitHub repos (Git-native), Supabase (auth metadata) |
| Code Generation | Terraform, Bicep, Pulumi (planned) |
| Frontend Architecture | Feature-Sliced Design (FSD) |
| Monorepo | pnpm workspaces |

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product Requirements Document |
| [Domain Model](docs/DOMAIN_MODEL.md) | Domain entities and rules |
| [Architecture](docs/ARCHITECTURE.md) | System architecture |
| [Storage Architecture](docs/STORAGE_ARCHITECTURE.md) | Git-native storage design |
| [API Spec](docs/API_SPEC.md) | REST API endpoints |
| [Roadmap](docs/ROADMAP.md) | Development roadmap |
| [Deployment](docs/DEPLOYMENT.md) | Deployment guide |
| [Tutorials](docs/TUTORIALS.md) | Getting started tutorials |

## Development

```bash
# Frontend development
cd apps/web && pnpm dev

# Build
cd apps/web && pnpm build

# Type check
cd apps/web && npx tsc -b

# Backend (requires Python 3.12+)
cd apps/api && pip install -e ".[dev]" && uvicorn app.main:app --reload
```

## Examples

- [Three-Tier Web App](examples/three-tier-web-app/) — Classic three-tier architecture
- [Serverless API](examples/serverless-api/) — Serverless function architecture
- [Event-Driven Pipeline](examples/event-driven-pipeline/) — Event processing pattern

## Roadmap

| Version | Milestone | Status |
|---------|-----------|--------|
| v0.1 | Frontend MVP — 3D builder with validation | ✅ Complete |
| v0.2 | Enhanced UX — drag & drop, visual polish | Planned |
| v0.3 | Workspace management, import/export | Planned |
| v0.5 | GitHub integration, Terraform generation | Planned |
| v1.0 | Full platform with multi-provider support | Planned |

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and ensure the build passes: `cd apps/web && npx tsc -b && npx vite build`
4. Commit with a descriptive message
5. Open a Pull Request

Please follow existing code patterns and ensure TypeScript strict mode passes.

## License

[MIT](LICENSE)
