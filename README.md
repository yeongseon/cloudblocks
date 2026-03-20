# CloudBlocks

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml/badge.svg)](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml)

<p align="center">
  <img src="docs/images/hero.png" alt="CloudBlocks — visual cloud architecture builder" width="720" />
</p>

**CloudBlocks is an architecture compiler that converts visual infrastructure designs into infrastructure-as-code.**

Design cloud infrastructure by placing blocks on plates, connect components, validate against real-world rules, and generate Terraform, Bicep, or Pulumi — all from the browser. No YAML. No HCL. Just place, connect, validate, generate.

> **[▶ Try the Live Demo](https://yeongseon.github.io/cloudblocks/)** — Frontend-only playground. Visual builder, code generation, and templates work instantly. AI and GitHub features require the backend ([setup guide](docs/guides/TUTORIALS.md)).

## Why CloudBlocks?

Most IaC tools work **code → diagram** (visualize existing infra). CloudBlocks works **architecture → code** (model visually, compile to infra).

| | Diagram Tool | CloudBlocks |
|--|-------------|-------------|
| Output | Static image | Architecture model + IaC code |
| Validation | None | Rule engine enforces constraints |
| Semantics | Visual only | Every element maps to a real resource |

## Features

- 🧱 **Lego-style modeling** — Plates (boundaries) + Blocks (resources) + typed Connections
- ⚡ **Architecture compiler** — Visual designs compile to Terraform, Bicep, and Pulumi
- ✅ **Validation engine** — Real-time rule checking for placement and connections
- 📦 **10 resource categories** — Compute, database, storage, gateway, function, queue, event, analytics, identity, observability
- 🔗 **GitHub integration** — OAuth login, repo sync, PR creation, architecture diff
- 📚 **Learning mode** — Guided scenarios to learn cloud architecture patterns

## Quick Start

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
cd apps/web && pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to start building.

> The frontend works standalone. Start the backend (`apps/api`) for GitHub integration.

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/guides/TUTORIALS.md)
- [Architecture](docs/concept/ARCHITECTURE.md)
- [Domain Model](docs/model/DOMAIN_MODEL.md)
- [Roadmap](docs/concept/ROADMAP.md)

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

> Phases are historical development stage labels from early milestones. All new work uses Milestone numbering.

| Milestone | Description | Status |
|-------|-------------|--------|
| Milestones 1–7 | Visual builder, code generation (Terraform/Bicep/Pulumi), templates, GitHub integration, learning mode, collaboration, architecture diff | ✅ Complete |
| Phase 2 UX | Magnetic snap, dynamic shadows, bounce transitions | ✅ Complete |
| Phase 3 | Lego minifigure character (Azure variant) | ✅ Complete |
| Phase 7 | Session auth migration (cookie-based sessions) | ✅ Complete |
| Phase 9 | Visual builder evolution (UX state machine, brick design, provider foundations) | ✅ Complete |
| Phase 10 | Documentation accuracy | ✅ Complete |
| Phase 11 | UX/UI improvements | ✅ Complete |
| Milestone 8 | Multi-cloud platform (AWS, GCP adapters) | ✅ Complete |
| Milestone 9 | UX Core Hardening | ✅ Complete |
| Milestone 10 | External Actors & DevOps UX | ✅ Complete |
| Milestone 11 | Brick Design System | ✅ Complete |
| Milestone 12 | Core Model & Provider System | ✅ Complete |
| Milestone 13 | Terraform Pipeline | ✅ Complete |
| Milestone 14 | AI-Assisted Architecture | ✅ Complete |
| Milestone 15 | v2.0 Specification Implementation | ✅ Complete |
| Milestone 16 | Documentation Architecture | ✅ Complete |
| Milestone 17 | Product Structure | 🔄 Planned |
| Milestone 18 | DevOps UX | 🔄 Planned |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the PR process.

## Community

- [GitHub Issues](https://github.com/yeongseon/cloudblocks/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/yeongseon/cloudblocks/discussions) — Questions and ideas

## License

[Apache 2.0](LICENSE)
