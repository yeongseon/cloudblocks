# M17 - API Contract: ArchitectureModel Integration

## Shared contract

The frontend sends architecture payloads as JSON that conforms to `ArchitectureModel`.
The backend validates those payloads with generated Pydantic v2 models from `apps/api/app/models/generated/architecture_model.py`.

This establishes one shared API contract between web and API layers while preserving existing engine interfaces.

## Endpoint matrix

| Endpoint                     | Contract behavior                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST /workspaces/{id}/sync` | Accepts `ArchitectureModel` via `SyncRequest.architecture`                                                                      |
| `POST /workspaces/{id}/pr`   | Accepts `ArchitectureModel` via `PullRequestRequest.architecture`                                                               |
| `POST /ai/suggest`           | Accepts `ArchitectureModel` via `AISuggestRequest.architecture`                                                                 |
| `POST /ai/cost`              | Accepts `ArchitectureModel` via `AICostRequest.architecture`                                                                    |
| `POST /ai/generate`          | Returns raw dict (`AIGenerationResponse.architecture: dict[str, object]`) intentionally because LLM output may not match schema |
| `POST /workspaces/{id}/pull` | Returns raw dict from GitHub response (no schema validation on response payload)                                                |

## Validation behavior

- Validation uses Pydantic v2 generated models with `extra='forbid'`.
- All declared fields in `ArchitectureModel` and nested structures are validated.
- Invalid request payloads are rejected with HTTP `422 Unprocessable Entity`.

## Engine integration boundary

Routes validate incoming typed request payloads first, then call `.model_dump(mode="python")` before passing data to engines and helpers that currently expect raw `dict` inputs.

Examples:

- GitHub sync/PR routes serialize `ArchitectureModel` before JSON encoding.
- AI suggest and AI cost routes serialize `ArchitectureModel` before suggestion/cost processing.

## Intentional raw architecture response for AI generation

`AIGenerationResponse.architecture` remains `dict[str, object]` by design.
LLM output is allowed to be partially invalid, and `ArchitectureValidator` evaluates it separately and returns warnings rather than forcing strict schema conformance at response time.
