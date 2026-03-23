# Contributing to CloudBlocks

Thanks for your interest in contributing to CloudBlocks! This page provides quick links to get started.

## Getting Started

1. **Read the [CONTRIBUTING.md](https://github.com/yeongseon/cloudblocks/blob/main/CONTRIBUTING.md)** — Development setup, coding standards, branch naming, and the PR process.
2. **Browse [open issues](https://github.com/yeongseon/cloudblocks/issues)** — Look for issues labeled `good first issue` or `help wanted`.
3. **Check the [Domain Model](model/DOMAIN_MODEL.md)** — Understand the core data model before making changes.

## Quick Setup

```bash
git clone https://github.com/yeongseon/cloudblocks.git
cd cloudblocks
pnpm install
cd apps/web && pnpm dev
```

## Repository Structure

| Path                          | Description                           |
| ----------------------------- | ------------------------------------- |
| `apps/web`                    | Frontend SPA (React + TypeScript)     |
| `apps/api`                    | Backend API (Python + FastAPI)        |
| `packages/schema`             | Canonical model types and JSON Schema |
| `packages/cloudblocks-domain` | Shared domain helpers and validation  |
| `docs/`                       | Documentation (this site)             |

## Internal Docs (Repo Only)

Architecture decisions, design specs, and roadmap documents live in the repository under `docs/` but are not published to the documentation site. Browse them directly on GitHub:

- [Architecture Overview](https://github.com/yeongseon/cloudblocks/blob/main/docs/concept/ARCHITECTURE.md)
- [Decision Records (ADRs)](https://github.com/yeongseon/cloudblocks/tree/main/docs/adr)
- [Roadmap](https://github.com/yeongseon/cloudblocks/blob/main/docs/concept/ROADMAP.md)

## Questions?

Open a [GitHub Discussion](https://github.com/yeongseon/cloudblocks/discussions) or file an [issue](https://github.com/yeongseon/cloudblocks/issues).
