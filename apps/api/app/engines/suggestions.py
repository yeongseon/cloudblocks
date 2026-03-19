from __future__ import annotations

import json
import logging

from app.domain.models.ai_entities import AISuggestionsResponse
from app.infrastructure.llm.client import LLMClient, LLMError

logger = logging.getLogger(__name__)

RESPONSE_SCHEMA: dict[str, object] = {
    "type": "object",
    "required": ["suggestions", "score"],
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "category",
                    "severity",
                    "message",
                    "action_description",
                ],
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["security", "reliability", "best_practice"],
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["critical", "warning", "info"],
                    },
                    "message": {"type": "string"},
                    "action_description": {"type": "string"},
                },
            },
        },
        "score": {
            "type": "object",
            "required": ["security", "reliability", "best_practice"],
            "properties": {
                "security": {"type": "number", "minimum": 0, "maximum": 100},
                "reliability": {"type": "number", "minimum": 0, "maximum": 100},
                "best_practice": {"type": "number", "minimum": 0, "maximum": 100},
            },
        },
    },
}

SUGGESTION_SYSTEM_PROMPT = """You are a cloud architecture reviewer.

Analyze the provided cloud architecture JSON and identify security, reliability,
and best-practice issues.

Focus on these checks:
- Missing encryption at rest or in transit
- Public exposure of sensitive resources
- Single points of failure and missing redundancy
- Missing WAF or firewall protections
- Improper subnet placement (public/private)
- Missing backup or disaster recovery strategy
- Naming and structural best-practice violations

Return ONLY valid JSON with this exact structure:
{
  "suggestions": [
    {
      "category": "security|reliability|best_practice",
      "severity": "critical|warning|info",
      "message": "Human-readable description",
      "action_description": "What to do to fix it"
    }
  ],
  "score": {
    "security": 0-100,
    "reliability": 0-100,
    "best_practice": 0-100
  }
}

Rules:
- Output must be a JSON object, no markdown.
- Include all score keys even if there are no suggestions.
- Use empty suggestions list when no issues are found.
- Keep suggestions concise and actionable.
"""


class SuggestionEngine:
    def __init__(self, llm_client: LLMClient) -> None:
        self._client: LLMClient = llm_client

    async def analyze(
        self,
        architecture: dict[str, object],
        provider: str = "aws",
    ) -> AISuggestionsResponse:
        architecture_json = json.dumps(architecture, separators=(",", ":"))
        user_prompt = f"Analyze this {provider} architecture:\n{architecture_json}"

        try:
            response = await self._client.generate(
                SUGGESTION_SYSTEM_PROMPT,
                user_prompt,
                response_schema=RESPONSE_SCHEMA,
            )
        except LLMError:
            logger.exception("Failed to generate architecture suggestions")
            return AISuggestionsResponse()

        try:
            return AISuggestionsResponse.model_validate(response)
        except Exception:
            logger.warning("Malformed suggestion response payload", exc_info=True)
            return AISuggestionsResponse()
