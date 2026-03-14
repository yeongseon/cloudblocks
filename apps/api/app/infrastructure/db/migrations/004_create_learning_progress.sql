-- CloudBlocks Migration 004: Create learning_progress table

CREATE TABLE learning_progress (
    id            VARCHAR(36)   PRIMARY KEY,
    user_id       VARCHAR(36)   NOT NULL,
    scenario_id   VARCHAR(36)   NOT NULL,
    status        VARCHAR(20)   DEFAULT 'not_started',
    score         INT,
    attempts      INT           DEFAULT 0,
    last_state    CLOB,
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
    UNIQUE (user_id, scenario_id)
);

CREATE INDEX idx_progress_user ON learning_progress(user_id);
