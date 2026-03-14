-- CloudBlocks Metadata Store - Migration 002
-- Workspace index — pointers to GitHub repos, not full data

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    github_repo TEXT,          -- e.g. 'yeongseon/my-infra'
    github_branch TEXT DEFAULT 'main',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    generator TEXT NOT NULL,                 -- 'terraform', 'bicep', 'pulumi'
    commit_sha TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
