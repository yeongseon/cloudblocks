-- CloudBlocks Migration 002: Create workspaces table

CREATE TABLE workspaces (
    id            VARCHAR(36)   PRIMARY KEY,
    owner_id      VARCHAR(36)   NOT NULL,
    name          VARCHAR(200)  NOT NULL,
    description   CLOB,
    architecture  CLOB          NOT NULL,
    is_public     SMALLINT      DEFAULT 0,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
