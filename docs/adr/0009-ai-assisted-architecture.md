# ADR-0009: AI-Assisted Architecture

**Status**: Accepted
**Date**: 2026-03

## Context

CloudBlocks enables users to visually design cloud architectures. As the domain model and visual builder matured (Milestones 1–15), the next logical step was to let users describe architectures in natural language and receive generated, validated, and cost-estimated designs.

Key decisions needed:

- Which LLM provider and model to target initially.
- How to manage user API keys securely without storing plaintext secrets.
- What scope of natural-language interaction to support (single-shot vs. conversational).
- How to validate LLM-generated architectures before presenting them to users.
- How to provide cost estimates for generated architectures.

## Decision

### LLM Provider: OpenAI with Adapter Interface

Use OpenAI (`gpt-4o`) as the initial LLM provider. All LLM calls go through an abstract `LLMClient` interface (`app/infrastructure/llm/client.py`), making future provider additions (Anthropic, local models) a single-class implementation.

- `LLMClient` abstract base class defines `generate(system_prompt, user_prompt, response_schema?)`.
- `OpenAIClient` implements retry logic (3 retries with exponential backoff for 429/5xx), timeout handling, and structured JSON output via `response_format: json_object`.

### API Key Management: BYOK with Fernet Encryption

Users bring their own API keys (BYOK). Keys are encrypted at rest using Fernet symmetric encryption (`KeyManager` in `app/infrastructure/llm/key_manager.py`).

- The encryption key is set via `CLOUDBLOCKS_AI_ENCRYPTION_KEY` env var.
- Keys are stored per-user, per-provider in the database via `AIApiKeyRepository`.
- CRUD operations are exposed at `POST/GET/DELETE /api/v1/ai/keys`.
- Keys are only decrypted in-memory immediately before API calls.

### NL→Architecture Scope: Level 2 (Single-Shot Generation)

The initial scope is **single-prompt generation** — users describe what they want, and the system returns a complete architecture in one response. This avoids the complexity of multi-turn conversation state management while covering the primary use case.

- `POST /api/v1/ai/generate` accepts `{prompt, provider, complexity}`.
- The system prompt includes the full CloudBlocks domain schema, enum constraints, placement rules, few-shot examples, and provider-specific subtype registry.
- Response is a complete `ArchitectureModel` JSON object.

### Post-Generation Validation

LLM output is validated by `ArchitectureValidator` (`app/engines/validation.py`) before being returned to the client. Validation checks:

- Structural integrity: plates, blocks, connections arrays exist.
- Enum compliance: category, provider, subtype, connection type, layer type match allowed values.
- Referential integrity: `placementId` references valid plates, `sourceId`/`targetId` reference valid blocks.
- Uniqueness: no duplicate IDs across plates, blocks, connections.
- Semantic rules: no self-connections.

Warnings are returned alongside the architecture (non-blocking), so users see generated output even with minor issues.

### Cost Estimation: Infracost Integration

Cost estimation converts architectures to Terraform JSON (`main.tf.json`) and runs Infracost against it.

- `POST /api/v1/ai/cost` maps block subtypes to Terraform resource types via a 47-entry lookup table covering AWS, Azure, and GCP.
- `InfracostClient` (`app/infrastructure/cost/infracost_client.py`) wraps the Infracost CLI.
- Temporary directories are created per request and cleaned up after estimation.

### Architecture Suggestions

`SuggestionEngine` (`app/engines/suggestions.py`) analyzes existing architectures via LLM and returns categorized improvement suggestions (security, reliability, best practice) with severity ratings and per-category scores (0–100).

- `POST /api/v1/ai/suggest` uses a dedicated system prompt with analysis focus areas.
- Response schema is enforced via structured output.

### Security

All AI endpoints require authentication (cookie-based session). The `/ai/generate` and `/ai/suggest` endpoints additionally require a stored OpenAI API key. The `/ai/cost` endpoint requires only authentication (Infracost uses a server-side key).

## Consequences

**Benefits:**

- Users can generate architectures from natural language without manual block placement.
- BYOK model eliminates the need for CloudBlocks to manage or pay for LLM API access.
- Adapter interface allows adding new LLM providers without changing endpoint logic.
- Post-generation validation catches common LLM hallucinations (invalid enums, broken references).
- Cost estimation provides immediate feedback on infrastructure spend.

**Trade-offs:**

- Single-shot generation cannot handle complex, iterative design refinement (future work: conversational mode).
- Cost estimates depend on Infracost accuracy and the subtype→Terraform mapping completeness.
- BYOK means users must obtain their own API keys, adding onboarding friction.
- LLM quality varies — the system prompt and few-shot examples must be maintained as the domain model evolves.

**Future evolution:**

- Add more LLM providers (Anthropic Claude, local Ollama).
- Move to conversational architecture refinement (Level 3).
- Integrate cost estimation directly into the generation loop (cost-aware generation).
- Add real-time suggestion streaming via SSE/WebSocket.
