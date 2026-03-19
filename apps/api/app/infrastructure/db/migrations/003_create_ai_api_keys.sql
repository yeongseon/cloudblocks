-- CloudBlocks Metadata Store - Migration 003
-- AI API key storage for LLM integration

CREATE TABLE IF NOT EXISTS ai_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,  -- 'openai'
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);
