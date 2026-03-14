-- CloudBlocks Metadata Store - Migration 001
-- Minimal user/identity table for auth metadata
-- Primary data lives in GitHub repos, not here

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id TEXT UNIQUE,
    github_username TEXT,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,  -- 'github', 'google'
    provider_id TEXT NOT NULL,
    access_token_hash TEXT,
    refresh_token_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);
