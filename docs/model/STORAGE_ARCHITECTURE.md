# CloudBlocks — Storage Architecture

## Overview

CloudBlocks uses a **Git-native storage architecture**: GitHub repos are the primary data store for architecture assets and generated code, with a minimal SQLite metadata database for auth, workspace indexing, and run status.

> **Current status (Phase 7+)**: Local-first editing persists in browser storage, and backend metadata/session state is stored in SQLite (`users`, `identities`, `workspaces`, `generation_runs`, `sessions`, `ai_api_keys`).

This is NOT a traditional database-heavy architecture. The design principle: **DB = index and status only, real data = Git / Blob Storage**.

## Storage Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
├────────────────┬──────────────────┬──────────────────────────┤
│  GitHub Repos  │  Metadata DB     │  Redis (Phase 8 ✅)       │
│  (Source of    │  (SQLite)        │  (Cache / Queue)         │
│   Truth)       │                  │                          │
├────────────────┼──────────────────┼──────────────────────────┤
│ architecture   │ users            │ distributed sessions     │
│   .json        │ identities       │ rate limits              │
│ generated IaC  │ workspaces       │ job queue                │
│ templates      │ generation_runs  │ cache                    │
│ schema version │ sessions         │                          │
│ generator.lock │ ai_api_keys      │                          │
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
| User identity | Auth, OAuth identity mapping | Security — identity linkage is server-side |
| Identity providers | Multi-provider auth (GitHub, Google) | Fast lookup, encrypted storage |
| Workspace index | User → repo mapping | Fast lookup without GitHub API calls |
| Generation runs | Job status, timestamps | Transient state, not version-controlled |
| Sessions | Server-side session auth state | Cookie session validation + revocation |
| AI API keys | Encrypted LLM provider keys per user | Security — encrypted at rest, per-user isolation |

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

> **Current schema** defined inline in `apps/api/app/infrastructure/db/connection.py` (`_MIGRATIONS` list). Reference `.sql` copies exist in `migrations/` but are not executed at runtime. Migrations: 001 users + identities, 002 workspaces + generation\_runs, 003 ALTER TABLE identities (encrypted token), 004 sessions + indexes. The `ai_api_keys` table is created on-demand by `SQLiteAIApiKeyRepository._ensure_table()`. Phase 8 extends this with PostgreSQL/Redis deployment topology.

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

-- Migration 003: Add encrypted token storage for GitHub OAuth
ALTER TABLE identities ADD COLUMN encrypted_access_token TEXT;

-- Migration 004: Session auth storage (cookie-based, no token hash)
CREATE TABLE IF NOT EXISTS sessions (
    id                     TEXT PRIMARY KEY,
    user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at             INTEGER NOT NULL,
    expires_at             INTEGER NOT NULL,
    revoked_at             INTEGER,
    last_seen_at           INTEGER,
    current_workspace_id   TEXT,
    current_repo_full_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- On-demand table (created by SQLiteAIApiKeyRepository._ensure_table)
CREATE TABLE IF NOT EXISTS ai_api_keys (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,
    encrypted_key   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime("now")),
    UNIQUE(user_id, provider)
);
```

**Total: 6 tables** (`users`, `identities`, `workspaces`, `generation_runs`, `sessions`, `ai_api_keys`). Everything else lives in GitHub.

Key differences from a traditional SaaS schema:
- **TEXT primary keys** (not UUID) — lightweight, no UUID extension needed
- **No `projects` table** — called `workspaces` to match the frontend model
- **No JWT table/mechanism** — auth is server-side session rows + httpOnly `cb_session` cookie
- **Status enum**: `pending` → `running` → `completed` / `failed` (not `queued` / `succeeded`)

## Redis Schema (Phase 8 ✅)

```
# Session cache (optional at scale)
session:{session_id}              → hot session cache mirror (TTL: 24h)

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

### Milestone 1 → Milestone 3 (localStorage → File Export)
1. Add "Export as architecture.json" feature
2. Download file or copy to clipboard
3. No backend needed

### Milestone 3 → Milestone 5 (File Export → GitHub Sync)
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
