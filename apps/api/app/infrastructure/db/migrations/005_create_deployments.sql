-- CloudBlocks Migration 005: Create deployments table

CREATE TABLE deployments (
    id              VARCHAR(36)   PRIMARY KEY,
    workspace_id    VARCHAR(36)   NOT NULL,
    user_id         VARCHAR(36)   NOT NULL,
    provider        VARCHAR(20)   NOT NULL,
    status          VARCHAR(20)   DEFAULT 'pending',
    terraform_plan  CLOB,
    terraform_state CLOB,
    error_message   CLOB,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_deployments_workspace ON deployments(workspace_id);
CREATE INDEX idx_deployments_user ON deployments(user_id);
