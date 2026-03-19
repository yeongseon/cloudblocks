from __future__ import annotations

import asyncio
import json
from abc import ABC, abstractmethod
from typing import cast

import httpx


class LLMError(Exception):
    pass


class LLMClient(ABC):
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        raise NotImplementedError


class OpenAIClient(LLMClient):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o",
        max_tokens: int = 4096,
        timeout: int = 60,
    ) -> None:
        self.api_key: str = api_key
        self.base_url: str = base_url.rstrip("/")
        self.model: str = model
        self.max_tokens: int = max_tokens
        self.timeout: int = timeout
        self.token_usage: dict[str, object] | None = None

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None = None,
    ) -> dict[str, object]:
        payload = self._build_payload(system_prompt, user_prompt, response_schema)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}/chat/completions"
        max_retries = 3

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise LLMError("LLM request timed out") from exc
            except httpx.HTTPError as exc:
                raise LLMError(f"LLM request failed: {exc}") from exc

            if response.status_code == 429 or response.status_code >= 500:
                if attempt < max_retries:
                    await asyncio.sleep(2**attempt)
                    continue
                raise LLMError(
                    "OpenAI API unavailable after retries: "
                    f"{response.status_code} {response.text}"
                )

            if response.status_code >= 400:
                details = self._extract_error_details(response)
                raise LLMError(f"OpenAI API error {response.status_code}: {details}")

            return self._parse_response(response)

        raise LLMError("Failed to generate completion")

    def _build_payload(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, object] | None,
    ) -> dict[str, object]:
        system_content = system_prompt
        if response_schema is not None:
            schema_text = json.dumps(response_schema, separators=(",", ":"), sort_keys=True)
            schema_rule = "Return JSON matching this schema exactly: "
            system_content = f"{system_prompt}\n\n{schema_rule}{schema_text}"

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_prompt},
        ]

        payload: dict[str, object] = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": messages,
        }
        if response_schema is not None:
            payload["response_format"] = {"type": "json_object"}
        return payload

    def _parse_response(self, response: httpx.Response) -> dict[str, object]:
        try:
            raw_data = response.json()
        except ValueError as exc:
            raise LLMError("Malformed OpenAI response structure") from exc

        if not isinstance(raw_data, dict):
            raise LLMError("Malformed OpenAI response structure")

        choices = raw_data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise LLMError("Malformed OpenAI response structure")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise LLMError("Malformed OpenAI response structure")

        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise LLMError("Malformed OpenAI response structure")

        content = message.get("content")
        if not isinstance(content, str):
            raise LLMError("Malformed OpenAI response content")

        usage = raw_data.get("usage")
        self.token_usage = usage if isinstance(usage, dict) else None

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMError("Malformed JSON content from LLM response") from exc

        if not isinstance(parsed, dict):
            raise LLMError("LLM response content must be a JSON object")

        return cast(dict[str, object], parsed)

    def _extract_error_details(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text

        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                message = error.get("message")
                if isinstance(message, str) and message:
                    return message
            return json.dumps(payload)

        return response.text
