# AI Engine

> **Status**: Implemented (Milestone 14). All endpoints are functional in `apps/api/app/api/routes/ai.py` and `apps/api/app/api/routes/ai_keys.py`.

CloudBlocks provides AI-assisted architecture design through natural language generation, architecture analysis, and cost estimation.

```
User Prompt ──→ /ai/generate ──→ LLM ──→ Validator ──→ Architecture JSON
Architecture ──→ /ai/suggest  ──→ LLM ──→ Suggestions + Scores
Architecture ──→ /ai/cost     ──→ TF JSON ──→ Infracost ──→ Cost Estimate
```

> **Decision Record**: See [ADR-0009](../adr/0009-ai-assisted-architecture.md) for architectural rationale.

---

## API Endpoints

All AI endpoints require authentication via cookie-based session (`cb_session`).

### POST /api/v1/ai/generate

Generate a complete architecture from a natural language description.

**Request:**

```json
{
  "prompt": "Three-tier web application with ALB, ECS, and RDS",
  "provider": "aws",
  "complexity": "intermediate"
}
```

| Field        | Type   | Default          | Description                                             |
| ------------ | ------ | ---------------- | ------------------------------------------------------- |
| `prompt`     | string | required         | Natural language architecture description               |
| `provider`   | string | `"aws"`          | Cloud provider: `aws`, `azure`, `gcp`                   |
| `complexity` | string | `"intermediate"` | Target complexity: `simple`, `intermediate`, `advanced` |

**Response:**

```json
{
  "architecture": {
    "nodes": [...],
    "connections": [...],
    "externalActors": [...]
  },
  "explanation": "",
  "warnings": [
    "blocks[0]: invalid category 'networking', expected one of ('compute', ...)"
  ]
}
```

**Requires**: Stored OpenAI API key (see [Key Management](#key-management)).

---

### POST /api/v1/ai/suggest

Analyze an existing architecture and return improvement suggestions.

**Request:**

```json
{
  "architecture": {
    "nodes": [...],
    "connections": [...]
  },
  "provider": "aws"
}
```

**Response:**

```json
{
  "suggestions": [
    {
      "category": "security",
      "severity": "critical",
      "message": "S3 bucket is publicly accessible",
      "action_description": "Enable block public access on the S3 bucket"
    }
  ],
  "score": {
    "security": 60,
    "reliability": 80,
    "best_practice": 70
  }
}
```

| Suggestion Field | Values                                     |
| ---------------- | ------------------------------------------ |
| `category`       | `security`, `reliability`, `best_practice` |
| `severity`       | `critical`, `warning`, `info`              |
| `score`          | 0–100 per category                         |

**Requires**: Stored OpenAI API key.

---

### POST /api/v1/ai/cost

Estimate monthly infrastructure cost for an architecture.

**Request:**

```json
{
  "architecture": {
    "blocks": [
      {
        "id": "block-1",
        "name": "Web ALB",
        "category": "gateway",
        "parentId": "block-1",
        "position": { "x": 2, "y": 0, "z": 2 },
        "provider": "aws",
        "subtype": "alb"
      }
    ]
  },
  "provider": "aws"
}
```

**Response:**

```json
{
  "monthly_cost": 42.5,
  "hourly_cost": 0.058,
  "currency": "USD",
  "resources": [
    {
      "name": "Web ALB",
      "monthly_cost": 22.5,
      "details": { "resourceType": "aws_lb" }
    }
  ]
}
```

**Requires**: Server-side Infracost API key (`CLOUDBLOCKS_INFRACOST_API_KEY`).

---

### Key Management

#### POST /api/v1/ai/keys

Store an API key for an LLM provider.

```json
{ "provider": "openai", "key": "sk-..." }
```

**Response:** `{ "provider": "openai", "created_at": "2026-03-20T..." }`

#### GET /api/v1/ai/keys

List stored API key providers (keys are never returned).

**Response:** `[{ "provider": "openai", "created_at": "2026-03-20T..." }]`

#### DELETE /api/v1/ai/keys/{provider}

Delete a stored API key.

**Response:** `{ "provider": "openai", "deleted": true }`

---

## Configuration

All settings are loaded from environment variables with the `CLOUDBLOCKS_` prefix.

| Variable                          | Default                     | Description                             |
| --------------------------------- | --------------------------- | --------------------------------------- |
| `CLOUDBLOCKS_LLM_PROVIDER_URL`    | `https://api.openai.com/v1` | OpenAI API base URL                     |
| `CLOUDBLOCKS_LLM_MODEL`           | `gpt-4o`                    | Model identifier                        |
| `CLOUDBLOCKS_LLM_MAX_TOKENS`      | `4096`                      | Maximum response tokens                 |
| `CLOUDBLOCKS_LLM_REQUEST_TIMEOUT` | `60`                        | Request timeout in seconds              |
| `CLOUDBLOCKS_INFRACOST_API_KEY`   | `""`                        | Infracost API key for cost estimation   |
| `CLOUDBLOCKS_AI_ENCRYPTION_KEY`   | `""`                        | Fernet key for encrypting user API keys |

---

## Architecture

### LLM Client Abstraction

```
LLMClient (ABC)
  └── OpenAIClient
        ├── Retry: 3 attempts with exponential backoff (429, 5xx)
        ├── Timeout: configurable per-instance
        └── JSON mode: response_format: json_object
```

The `LLMClient` interface (`app/infrastructure/llm/client.py`) enables swapping LLM providers without changing endpoint logic. To add a new provider, implement `generate(system_prompt, user_prompt, response_schema?)`.

### Prompt Engineering

The architecture generation prompt (`app/engines/prompts/architecture_prompt.py`) includes:

1. **Output schema** — full JSON Schema for `ArchitectureModel`
2. **Enum constraints** — block categories, connection types, provider types, layer types
3. **Subtype registry** — all valid subtypes per provider per category (47 total)
4. **Placement rules** — layer hierarchy, padding, grid alignment
5. **Few-shot examples** — three-tier web app and serverless event-driven architectures
6. **Negative instructions** — explicit prohibitions against common LLM errors

### Post-Generation Validation

`ArchitectureValidator` (`app/engines/validation.py`) checks LLM output against domain constraints:

| Check                 | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| Structural            | `nodes`, `connections`, `externalActors` arrays present and valid |
| Enum compliance       | Category, provider, subtype, connection type, layer type          |
| Referential integrity | `parentId` → container block, `from.blockId`/`to.blockId` → block |
| Uniqueness            | No duplicate IDs across all entities                              |
| Semantic              | No self-connections                                               |

Warnings are returned alongside the architecture (non-blocking).

### Suggestion Engine

`SuggestionEngine` (`app/engines/suggestions.py`) analyzes architectures using a dedicated system prompt focused on:

- Missing encryption (at rest / in transit)
- Public exposure of sensitive resources
- Single points of failure
- Missing WAF/firewall protections
- Improper layer placement
- Missing backup/disaster recovery
- Naming and structural best practices

### Cost Estimation Flow

```
Architecture → _architecture_to_tf_json() → main.tf.json → InfracostClient → CostEstimate
```

1. Block subtypes are mapped to Terraform resource types via `SUBTYPE_TO_TF_RESOURCE` (47 entries covering AWS, Azure, GCP).
2. A temporary `main.tf.json` is generated with resource stubs.
3. `InfracostClient` runs `infracost breakdown` against the Terraform directory.
4. Results are parsed into `CostEstimate` with per-resource breakdown.
5. Temporary files are cleaned up.

---

## Error Handling

| Scenario            | HTTP Status | Error Code          |
| ------------------- | ----------- | ------------------- |
| No authentication   | 401         | `UNAUTHORIZED`      |
| No stored API key   | 400         | `VALIDATION_ERROR`  |
| LLM request failure | 500         | `GENERATION_FAILED` |
| Infracost failure   | 500         | `GENERATION_FAILED` |

---

## Frontend Integration

The frontend AI integration is in `apps/web/src/features/ai/`:

| Module                            | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `api.ts`                          | API client functions (generate, suggest, estimateCost)   |
| `store.ts`                        | Zustand store with async actions and loading/error state |
| `components/AiPromptBar.tsx`      | Natural language input bar                               |
| `components/SuggestionsPanel.tsx` | Architecture analysis results display                    |
| `components/CostPanel.tsx`        | Cost estimation breakdown display                        |

The AI store integrates with the architecture store via `replaceArchitecture()` to update the canvas with generated designs.
