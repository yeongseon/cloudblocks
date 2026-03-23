# CloudBlocks

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml/badge.svg)](https://github.com/yeongseon/cloudblocks/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yeongseon/cloudblocks/graph/badge.svg)](https://codecov.io/gh/yeongseon/cloudblocks)
[![Version](https://img.shields.io/github/v/release/yeongseon/cloudblocks?label=version)](https://github.com/yeongseon/cloudblocks/releases/latest)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://yeongseon.github.io/cloudblocks/)

<p align="center">
  <img src="docs/images/hero.png" alt="CloudBlocks — visual cloud architecture builder" width="720" />
</p>

**CloudBlocks is an architecture compiler that converts visual infrastructure designs into infrastructure-as-code.**

Design cloud infrastructure by placing blocks on plates, connect components, validate against real-world rules, and generate Terraform, Bicep, or Pulumi — all from the browser. No YAML. No HCL. Just place, connect, validate, generate.

> **[▶ Try the Live Demo](https://yeongseon.github.io/cloudblocks/)** — Frontend-only playground. Visual builder, code generation, and templates work instantly. AI and GitHub features require the backend ([setup guide](docs/guides/TUTORIALS.md)).

## Monorepo Layout

CloudBlocks uses a monorepo with one frontend app, one backend app, and shared TypeScript packages:

| Path | Package | Current role |
|--|--|--|
| `apps/web` | `@cloudblocks/web` | Frontend SPA. Owns validation engine, generation pipeline, and template system. |
| `apps/api` | - | FastAPI backend. Handles GitHub OAuth/session auth, workspace/repo operations, and AI integration proxying. |
| `packages/schema` | `@cloudblocks/schema` | Canonical architecture model types/enums and JSON Schema output. |
| `packages/cloudblocks-domain` | `@cloudblocks/domain` | Shared domain helpers (hierarchy rules, labels, validation types). |

The frontend imports architecture/domain types from `@cloudblocks/schema` and `@cloudblocks/domain` instead of defining local model types.
Python models in `apps/api/app/models/generated/` are auto-generated from the TypeScript schema (`packages/schema/dist/architecture-model.schema.json`).

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
- 📦 **7 resource categories** — Network, security, edge, compute, data, messaging, operations
- 🔗 **GitHub integration** — OAuth login, repo sync, PR creation, architecture diff (backend API)
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

| Version | Milestone | Status |
|---------|-----------|--------|
| v0.0.0 | Concept Validation | ✅ |
| v0.4.0 | Milestones 1–4 (MVP → Workspace Management) | ✅ |
| v0.5.0 | GitHub Integration & Backend API | ✅ |
| v0.6.0 | Multi-Generator + Template Marketplace | ✅ |
| v0.7.0 | Collaboration + UX Polish + Auth Migration | ✅ |
| v0.8.0 | Multi-Cloud Platform | ✅ |
| v0.9.0 | UX Core Hardening | ✅ |
| v0.10.0 | External Actors & DevOps UX | ✅ |
| v0.11.0 | Brick Design System | ✅ |
| v0.12.0 | Core Model & Provider System | ✅ |
| v0.13.0 | Terraform Pipeline | ✅ |
| v0.14.0 | AI-Assisted Architecture | ✅ |
| v0.15.0 | v2.0 Specification Implementation | ✅ |
| v0.16.0 | Documentation Architecture | ✅ |
| v0.17.0 | Product Structure | ✅ |
| v0.18.0 | DevOps UX | ✅ |
| v0.19.0 | Resource Category Realignment + Cleanup | ✅ |
| v0.20.0 | UX Polish & GitHub Hardening | |
| — | i18n Scaffolding | |

See [CHANGELOG.md](CHANGELOG.md) for release details and [full roadmap](docs/concept/ROADMAP.md) for milestone breakdown.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the PR process.

## Community

- [GitHub Issues](https://github.com/yeongseon/cloudblocks/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/yeongseon/cloudblocks/discussions) — Questions and ideas

## License

[Apache 2.0](LICENSE)
