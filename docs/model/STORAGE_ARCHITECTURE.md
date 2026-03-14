# CloudBlocks — Storage Architecture

## Overview

CloudBlocks is designed for a **Git-native storage architecture** — in the target state (v0.5+), GitHub repos will serve as the primary data store for all architecture assets and generated code, with a minimal metadata database for auth, workspace indexing, and run status.

> **Current status (v0.1–v0.4)**: All data is stored in browser **localStorage**. The Git-native architecture described below is the **planned v0.5+ design**. See `apps/web/src/shared/utils/storage.ts` for the current implementation.

This is NOT a traditional database-heavy architecture. The design principle: **DB = index and status only, real data = Git / Blob Storage**.

## Storage Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
├────────────────┬──────────────────┬──────────────────────────┤
│  GitHub Repos  │  Metadata DB     │  Redis / Upstash         │
│  (Source of    │  (Postgres /     │  (Cache / Queue)         │
│   Truth)       │   Supabase)      │                          │
├────────────────┼──────────────────┼──────────────────────────┤
│ architecture   │ users            │ session tokens           │
│   .json        │ identities       │ rate limits              │
│ generated IaC  │ workspaces       │ job queue                │
│ templates      │ generation_runs  │ cache                    │
│ schema version │                  │                          │
│ generator.lock │                  │                          │
└────────────────┴──────────────────┴──────────────────────────┘
```

## Data Placement Strategy

### What Goes in GitHub (Source of Truth)

| Data | Format | Location in Repo |
|------|--------|-----------------|
| Architecture model | JSON | `cloudblocks/architecture.json` |
| Schema version | Text | `cloudblocks/schemaVersion` |
| Generator config | JSON | `cloudblocks/generator.lock` |
| Terraform code | HCL | `infra/terraform/*.tf` |
| Bicep code | Bicep | `infra/bicep/*.bicep` |
| Pulumi code | TS/Python | `infra/pulumi/` |
| CI/CD workflows | YAML | `.github/workflows/` |

### What Goes in Metadata DB (Index + Status)

| Data | Purpose | Why Not GitHub |
|------|---------|---------------|
| User identity | Auth, OAuth tokens (hashed) | Security — tokens must be server-side |
| Identity providers | Multi-provider auth (GitHub, Google) | Fast lookup, encrypted storage |
| Workspace index | User → repo mapping | Fast lookup without GitHub API calls |
| Generation runs | Job status, timestamps | Transient state, not version-controlled |

### What Does NOT Go in Any DB

| Data | Where It Lives | Why |
|------|---------------|-----|
| Generated Terraform (full) | GitHub repo | Version history, PR review |
| Architecture spec (full) | GitHub repo | Diff, collaboration, backup |
| Long prompt/log history | GitHub / Blob Storage | Too large for DB rows |
| Template content | GitHub repo | Community contribution via PRs |
| Deployment artifacts | GitHub / Blob Storage | Binary assets |

## GitHub Repo Structure (Per Workspace)

```
my-cloud-project/
├── cloudblocks/
│   ├── architecture.json       # Architecture model (source of truth)
│   ├── schemaVersion           # "0.1.0"
│   └── generator.lock          # Pinned generator versions
├── infra/
│   ├── terraform/
│   │   ├── main.tf             # Generated Terraform
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── bicep/                  # Generated Bicep (if selected)
│   │   └── main.bicep
│   └── pulumi/                 # Generated Pulumi (if selected)
│       ├── index.ts
│       └── Pulumi.yaml
└── .github/
    └── workflows/
        └── plan.yml            # Auto terraform plan on PR
```

### JSON Format: architecture.json

```json
{
  "schemaVersion": "0.1.0",
  "architecture": {
    "id": "arch-abc123",
    "name": "3-Tier Web App",
    "version": "1",
    "plates": [
      {
        "id": "plate-vnet01",
        "name": "Main Network",
        "type": "network",
        "parentId": null,
        "children": ["plate-subnet-pub", "plate-subnet-priv"],
        "position": { "x": 0, "y": 0, "z": 0 },
        "size": { "width": 10, "height": 0.3, "depth": 10 },
        "metadata": {}
      }
    ],
    "blocks": [],
    "connections": [],
    "externalActors": [
      { "id": "ext-internet", "name": "Internet", "type": "internet" }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

> **Note**: Positions use a 3D coordinate system (`x`, `y`, `z`). The x/z plane represents the layout surface, while y represents elevation (plate stacking). The editing model treats placement as 2D (x, z) with containment hierarchy — y is managed programmatically based on plate depth. See [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) for details on the "visual layer is a projection" principle.

Stable key ordering is enforced to keep Git diffs readable.

## Metadata DB Schema

> **v0.5+ planned schema.** No active database exists in v0.1–v0.4. These tables describe the target migration structure in `apps/api/app/infrastructure/db/migrations/`.

```sql
-- Migration 001: User identity (linked to GitHub / Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    github_id       TEXT UNIQUE,
    github_username TEXT,
    email           TEXT,
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration 001: Identity providers (multi-provider auth)
CREATE TABLE IF NOT EXISTS identities (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id),
    provider        TEXT NOT NULL,   -- 'github', 'google'
    provider_id     TEXT NOT NULL,
    access_token_hash TEXT,          -- hashed, not plaintext
    refresh_token_hash TEXT,         -- hashed, not plaintext
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Migration 002: Workspace index — pointers to GitHub repos, not full data
CREATE TABLE IF NOT EXISTS workspaces (
    id              TEXT PRIMARY KEY,
    owner_id        TEXT NOT NULL REFERENCES users(id),
    name            TEXT NOT NULL,
    github_repo     TEXT,            -- e.g. 'yeongseon/my-infra'
    github_branch   TEXT DEFAULT 'main',
    last_synced_at  TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration 002: Generation run log (job tracking)
CREATE TABLE IF NOT EXISTS generation_runs (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id),
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    generator       TEXT NOT NULL,                    -- 'terraform', 'bicep', 'pulumi'
    commit_sha      TEXT,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Total: 4 tables** (`users`, `identities`, `workspaces`, `generation_runs`). That's the entire database. Everything else lives in GitHub.

Key differences from a traditional SaaS schema:
- **TEXT primary keys** (not UUID) — lightweight, no UUID extension needed
- **No `projects` table** — called `workspaces` to match the frontend model
- **No `oauth_tokens` table** — tokens are stored as hashed values in the `identities` table
- **Status enum**: `pending` → `running` → `completed` / `failed` (not `queued` / `succeeded`)

## Redis / Upstash Schema

```
# Session management
session:{session_id}              → JSON user session (TTL: 24h)

# Rate limiting
ratelimit:{user_id}:{endpoint}    → counter (TTL: 60s)

# Job queue
queue:generation                  → list of generation job IDs
job:{job_id}                      → JSON job details (TTL: 1h)

# Cache
cache:workspace:{workspace_id}    → JSON workspace metadata (TTL: 5m)
```

## GitHub API Considerations

### Rate Limits

- Authenticated: 5000 requests/hour
- GitHub App installation tokens: 5000 requests/hour per installation
- Strategy: debounce writes, batch into snapshots, use ETags for reads

### File Size Limits

- Contents API: ~1MB per file (practical limit)
- Git Data API: up to 100MB per blob
- Keep `architecture.json` small — split large data into separate files if needed

### Conflict Resolution

- **PRs as collaboration primitive**: changes go through PRs, not direct pushes
- **Optimistic concurrency**: check file SHA before write, fail fast on mismatch
- **Solo mode**: direct-to-default-branch for single users

## Migration Strategy

### v0.1 → v0.3 (localStorage → File Export)
1. Add "Export as architecture.json" feature
2. Download file or copy to clipboard
3. No backend needed

### v0.3 → v0.5 (File Export → GitHub Sync)
1. Add GitHub App OAuth
2. User connects GitHub account
3. Select or create target repo
4. Backend commits architecture.json + generated code
5. Local state remains primary (local-first)
6. GitHub is "publish/collaborate" layer

### Local-First Principle

CloudBlocks is **local-first**:
- Works fully offline with localStorage/IndexedDB
- GitHub sync is optional (but recommended for teams)
- No data loss if GitHub is down
- Graceful degradation: edit locally → sync when online
