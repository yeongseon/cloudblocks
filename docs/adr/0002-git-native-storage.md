# ADR-0002: Git-Native Storage Strategy

**Status**: Accepted
**Date**: 2025-01

## Context

CloudBlocks needs a persistence strategy for architecture models. Traditional SaaS approaches store all user data in a managed database (PostgreSQL, MongoDB, etc.). This raises questions about data ownership, versioning, collaboration, and vendor lock-in.

Options considered:

1. **Full database storage** — all architecture data in a managed database
2. **File-based storage** — save/load JSON files locally
3. **Git-native storage** — use GitHub repositories as the primary data store

Option 1 creates a heavy SaaS backend that owns user data. Users lose portability and must trust the service with their infrastructure designs. Option 2 is simple but provides no collaboration, version history, or CI/CD integration.

## Decision

**Use Git repositories (GitHub) as the primary data store for architecture data.** The backend is a thin orchestration layer that mediates between the UI, GitHub, and the generation engine — not a data warehouse.

### What goes where

| Data | Storage | Reason |
|------|---------|--------|
| Architecture specs (JSON) | GitHub repo | Version history, diff, collaboration |
| Generated IaC code | GitHub repo | PR-based review, CI/CD |
| Templates | GitHub repo | Community contribution |
| User identity / OAuth | Metadata DB (Supabase/PG) | Auth, tokens |
| Workspace index | Metadata DB | Fast lookup |
| Run status / audit | Metadata DB | Job state tracking |

### What the metadata DB does NOT store

- Architecture model content
- Generated code
- Full prompt/log history
- Large artifacts

### Implementation timeline

- **Phase 1**: localStorage (frontend-only, no backend)
- **Phase 3+**: Local-first store (IndexedDB) with optional GitHub sync
- **Phase 5+**: Full GitHub integration via backend API

## Consequences

### Positive

- **User owns their data** — architecture lives in the user's GitHub repo, not our database
- **Free version history** — Git provides complete history, diff, and blame for architecture changes
- **CI/CD integration** — generated IaC code triggers existing GitHub Actions pipelines
- **Collaboration** — PRs, code review, and branching work out of the box
- **Reduced infrastructure cost** — no large database to manage for user content
- **Open source friendly** — no vendor lock-in, users can fork and self-host

### Negative

- **GitHub dependency** — primary flow requires a GitHub account (can be mitigated with export)
- **API rate limits** — GitHub API has 5000 req/hr limit (mitigated with debouncing, batching, ETags)
- **Eventual consistency** — local-first model means sync conflicts are possible
- **Latency** — GitHub API calls are slower than local database queries

### Related Documents

- [STORAGE_ARCHITECTURE.md](../model/STORAGE_ARCHITECTURE.md) — Detailed storage design
- [ARCHITECTURE.md](../concept/ARCHITECTURE.md) — System architecture (§8, §9)
