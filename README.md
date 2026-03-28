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
</p>

**CloudBlocks is a visual cloud learning tool for beginners: start from guided templates, learn common architecture patterns, and export Terraform starter code.**

Start from built-in architecture templates, learn cloud infrastructure patterns with guided scenarios, and export Terraform starter code — all in the browser. No cloud account or backend required.

> **[▶ Try the Live Demo](https://yeongseon.github.io/cloudblocks/)** — Frontend-only playground. Visual builder, templates, learning scenarios, and Terraform starter export work instantly. AI and GitHub features require the backend ([setup guide](docs/guides/TUTORIALS.md)).

## Demo

<p align="center">
</p>

> **Start** from a guided template, **learn** cloud architecture patterns step by step, **customize** with drag-and-drop blocks, and **export** Terraform starter code — all in the browser.

_Automated demo video coming soon. For now, [try the live demo](https://yeongseon.github.io/cloudblocks/)._

## Why CloudBlocks?

Most diagram tools produce static images. CloudBlocks produces a **live architecture model** with built-in learning and validation — designed for people just getting started with cloud infrastructure.

|             | Diagram Tool | CloudBlocks                                       |
| ----------- | ------------ | ------------------------------------------------- |
| Output      | Static image | Interactive architecture model                    |
| Validation  | None         | Real-time rule engine                             |
| Semantics   | Visual only  | Every block maps to a real cloud resource         |
| Learning    | None         | Guided scenarios for beginners                    |
| Code Export | None         | Terraform starter code                            |

## Features

- 🧱 **Block-based modeling** — Container blocks (boundaries) + Resource blocks (resources) + typed Connections
- 📋 **Guided templates** — Start from 6 built-in architecture patterns with step-by-step learning scenarios
- 📚 **Learning mode** — Interactive guided scenarios to learn cloud architecture patterns (beginner → advanced)
- ✅ **Validation engine** — Real-time rule checking for placement and connections
- 📦 **8 resource categories** — Network, Delivery, Compute, Data, Messaging, Security, Identity, Operations
- 🌐 **Multi-cloud preview** — Visual preview for Azure, AWS, and GCP
- ⚡ **Terraform starter export** — Export your design to Terraform starter code for learning and prototyping
- 🎨 **Dual theme system** — Workshop (light, enterprise) and Blueprint (dark, creative)
- ⚗️ **Bicep & Pulumi** _(Experimental)_ — Additional IaC export formats
- 🔗 **GitHub integration** _(Backend required)_ — OAuth login, repo sync, PR creation
## Quick Start

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to start learning.

> The frontend works standalone — no backend needed. Start `apps/api` for GitHub integration and AI features.

## Monorepo Layout

| Path                          | Package               | Role                                                                                        |
| ----------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web`                    | `@cloudblocks/web`    | Frontend SPA — visual builder, validation engine, template system, code generation pipeline |
| `apps/api`                    | —                     | FastAPI backend — GitHub OAuth, workspace sync, AI integration                              |
| `packages/schema`             | `@cloudblocks/schema` | Canonical architecture model types, enums, and JSON Schema                                  |
| `packages/cloudblocks-domain` | `@cloudblocks/domain` | Shared domain helpers — hierarchy rules, labels, validation types                           |

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/guides/TUTORIALS.md)
- [Architecture](docs/concept/ARCHITECTURE.md)
- [Domain Model](docs/model/DOMAIN_MODEL.md)
- [Roadmap](docs/concept/ROADMAP.md)
- [V1 Product Contract](docs/concept/V1_PRODUCT_CONTRACT.md)

## Development

```bash
# Frontend development
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck

# Backend
cd apps/api && pip install -e ".[dev]" && uvicorn app.main:app --reload
```

## Product Evolution

| Stage  | Name  | Focus                                                                  | Status      |
| ------ | ----- | ---------------------------------------------------------------------- | ----------- |
| **V1** | Learn | Visual cloud learning tool for beginners                               | **Current** |
| **V2** | Export | Trustworthy Terraform starter code with hypothesis validation          | Next        |
| **V3** | Practice | Learning paths with progress tracking and guided scenarios          | Later       |
| **V4** | Teach | Educator distribution, curriculum packaging, community sharing         | Future      |

See [ROADMAP.md](docs/concept/ROADMAP.md) for details and [CHANGELOG.md](CHANGELOG.md) for release history.

## Examples

- [Three-Tier Web App](examples/three-tier-web-app/) — Classic three-tier architecture
- [Serverless API](examples/serverless-api/) — Serverless function architecture
- [Event-Driven Pipeline](examples/event-driven-pipeline/) — Event processing pattern

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the PR process.

## Community

- [GitHub Issues](https://github.com/yeongseon/cloudblocks/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/yeongseon/cloudblocks/discussions) — Questions and ideas

## License

[Apache 2.0](LICENSE)
