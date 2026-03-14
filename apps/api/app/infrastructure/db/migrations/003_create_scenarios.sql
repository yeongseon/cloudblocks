-- CloudBlocks Migration 003: Create scenarios table

CREATE TABLE scenarios (
    id            VARCHAR(36)   PRIMARY KEY,
    title         VARCHAR(200)  NOT NULL,
    description   CLOB,
    difficulty    VARCHAR(20)   NOT NULL,
    category      VARCHAR(50)   NOT NULL,
    template      CLOB          NOT NULL,
    solution      CLOB,
    order_index   INT           DEFAULT 0,
    is_active     SMALLINT      DEFAULT 1,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX idx_scenarios_category ON scenarios(category);
