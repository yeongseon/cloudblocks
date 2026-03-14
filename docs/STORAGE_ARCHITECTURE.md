# CloudBlocks — Storage Architecture

## Overview

CloudBlocks uses a **Git-native storage architecture** — GitHub repos serve as the primary data store for all architecture assets and generated code. A minimal metadata database handles auth, project indexing, and run status only.

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
│   .json        │ projects         │ rate limits              │
│ generated IaC  │ generation_runs  │ job queue                │
│ templates      │ github_tokens    │ cache                    │
│ schema version │ audit_log        │                          │
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
| User identity | Auth, OAuth tokens | Security — tokens must be server-side |
| Project index | User → repo mapping | Fast lookup without GitHub API calls |
| Generation runs | Job status, timestamps | Transient state, not version-controlled |
| Audit summary | Who did what, when | Lightweight trail, not full logs |

### What Does NOT Go in Any DB

| Data | Where It Lives | Why |
|------|---------------|-----|
| Generated Terraform (full) | GitHub repo | Version history, PR review |
| Architecture spec (full) | GitHub repo | Diff, collaboration, backup |
| Long prompt/log history | GitHub / Blob Storage | Too large for DB rows |
| Template content | GitHub repo | Community contribution via PRs |
| Deployment artifacts | GitHub / Blob Storage | Binary assets |

## GitHub Repo Structure (Per Project)

```
my-cloud-project/
├── cloudblocks/
│   ├── architecture.json       # Architecture model (source of truth)
│   ├── schemaVersion           # "0.3.0"
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
  "schemaVersion": "0.3.0",
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
        "size": { "width": 10, "height": 1, "depth": 10 },
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

Stable key ordering is enforced to keep Git diffs readable.

## Metadata DB Schema

Minimal Postgres schema (Supabase-hosted or self-managed):

```sql
-- User identity (linked to GitHub / Google OAuth)
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    github_id   VARCHAR(100),
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Project = workspace + GitHub repo mapping
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(200) NOT NULL,
    github_repo     VARCHAR(500),       -- e.g., "user/my-infra"
    github_branch   VARCHAR(100) DEFAULT 'main',
    generator       VARCHAR(50) DEFAULT 'terraform',
    provider        VARCHAR(50) DEFAULT 'azure',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);

-- Generation run log (job tracking)
CREATE TABLE generation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    status          VARCHAR(20) DEFAULT 'queued',  -- queued, running, succeeded, failed
    generator       VARCHAR(50) NOT NULL,
    commit_sha      VARCHAR(40),
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_project ON generation_runs(project_id);

-- OAuth token storage (encrypted at rest)
CREATE TABLE oauth_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) UNIQUE,
    github_token    TEXT NOT NULL,       -- encrypted
    refresh_token   TEXT,               -- encrypted
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Total: 4 tables.** That's the entire database. Everything else lives in GitHub.

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
cache:project:{project_id}       → JSON project metadata (TTL: 5m)
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
