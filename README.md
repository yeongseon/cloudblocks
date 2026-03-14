# CloudBlocks

A 3D block-style visual cloud architecture builder. Design cloud infrastructure by placing blocks on plates, connecting components, and validating against real-world rules.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start frontend dev server
cd apps/web && pnpm dev

# Or use Makefile
make dev
```

## Architecture

CloudBlocks is a monorepo with the following structure:

```
cloudblocks/
├── apps/
│   ├── web/          # React + Three.js frontend (v0.1 MVP)
│   └── api/          # Python FastAPI backend (v0.5+)
├── packages/
│   ├── schema/       # Shared JSON schema definitions
│   ├── cloudblocks-domain/  # Domain logic package
│   ├── cloudblocks-ui/      # Reusable UI components
│   ├── terraform-templates/ # IaC templates
│   └── scenario-library/    # Learning scenario definitions
├── docs/             # Project documentation
├── infra/            # Infrastructure-as-code
├── scripts/          # Dev, build, deploy scripts
└── examples/         # Example architectures
```

## Core Concepts

### Plates (Containers)
- **Network Plate** — Virtual Network (VNet)
- **Subnet Plate** — Public or Private subnet within a Network

### Blocks (Resources)
- **Compute** — VMs, Container Apps (placed on Subnet)
- **Database** — CUBRID instances (placed on Private Subnet)
- **Storage** — Blob storage (placed on Subnet)
- **Gateway** — App Gateway, Load Balancer (placed on Public Subnet)

### Connections (DataFlow)
Connections represent data flow between components:
```
Internet → Gateway → Compute → Database
                            → Storage
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, React Three Fiber, Zustand, Vite |
| Backend | Python, FastAPI, Clean Architecture |
| Database | CUBRID (primary), Redis (cache), Object Storage (assets) |
| Frontend Architecture | Feature-Sliced Design (FSD) |
| Monorepo | pnpm workspaces |

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product Requirements Document |
| [Domain Model](docs/DOMAIN_MODEL.md) | Domain entities and rules |
| [Architecture](docs/ARCHITECTURE.md) | System architecture |
| [Roadmap](docs/ROADMAP.md) | Development roadmap |
| [Database Architecture](docs/DATABASE_ARCHITECTURE.md) | CUBRID schema and data layer |
| [API Spec](docs/API_SPEC.md) | REST API endpoints |
| [Deployment](docs/DEPLOYMENT.md) | Deployment guide |
| [Scenarios](docs/SCENARIOS.md) | Learning scenarios |

## Development

```bash
# Frontend development
cd apps/web && pnpm dev

# Build
cd apps/web && pnpm build

# Type check
cd apps/web && npx tsc -b

# Backend (v0.5+)
cd apps/api && pip install -e ".[dev]" && uvicorn app.main:app --reload
```

## Examples

- [Three-Tier Web App](examples/three-tier-web-app/) — Classic three-tier architecture
- [Serverless API](examples/serverless-api/) — Serverless function architecture
- [Event-Driven Pipeline](examples/event-driven-pipeline/) — Event processing pattern
- [CUBRID Reference](examples/cubrid-reference/) — CUBRID database reference architecture

## Roadmap

| Version | Milestone | Status |
|---------|-----------|--------|
| v0.1 | Frontend MVP — 3D builder with validation | ✅ Complete |
| v0.2 | Drag & drop, visual polish | Planned |
| v0.3 | Workspace management, import/export | Planned |
| v0.5 | Backend API, CUBRID integration | Planned |
| v1.0 | Full platform with scenarios | Planned |

## License

MIT
