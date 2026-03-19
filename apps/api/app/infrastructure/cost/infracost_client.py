from __future__ import annotations

import asyncio
import json
import os
import shutil
from pathlib import Path
from typing import cast

from app.domain.models.ai_entities import CostEstimate, CostResource

NUMBER_TYPES = (str, int, float)


class InfracostError(Exception):
    """Error during Infracost execution."""


class InfracostNotAvailableError(InfracostError):
    """Infracost binary not found."""


class InfracostClient:
    def __init__(self, api_key: str = "") -> None:
        self.api_key: str = api_key

    async def is_available(self) -> bool:
        return shutil.which("infracost") is not None

    async def estimate(self, terraform_dir: str) -> CostEstimate:
        if not await self.is_available():
            raise InfracostNotAvailableError("Infracost binary not found on PATH")

        directory = Path(terraform_dir)
        if not directory.exists() or not directory.is_dir():
            raise InfracostError(f"Terraform directory not found: {terraform_dir}")

        env: dict[str, str] | None = None
        if self.api_key:
            env = dict(os.environ)
            env["INFRACOST_API_KEY"] = self.api_key

        try:
            process = await asyncio.create_subprocess_exec(
                "infracost",
                "breakdown",
                "--format",
                "json",
                "--no-color",
                "--path",
                str(directory),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
        except FileNotFoundError as exc:
            raise InfracostNotAvailableError("Infracost binary not found on PATH") from exc
        except OSError as exc:
            raise InfracostError(f"Failed to launch infracost: {exc}") from exc

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
        except asyncio.TimeoutError as exc:
            _ = process.kill()
            _ = await process.wait()
            raise InfracostError("Infracost execution timed out after 120 seconds") from exc

        if process.returncode != 0:
            error_output = stderr.decode("utf-8", errors="replace").strip()
            raise InfracostError(
                f"Infracost process failed with exit code {process.returncode}: {error_output}"
            )

        try:
            parsed = cast(object, json.loads(stdout.decode("utf-8")))
        except json.JSONDecodeError as exc:
            raise InfracostError(f"Invalid JSON output from infracost: {exc}") from exc

        if not isinstance(parsed, dict):
            raise InfracostError("Invalid infracost output: expected JSON object")

        parsed_dict = cast(dict[object, object], parsed)
        if not all(isinstance(key, str) for key in parsed_dict):
            raise InfracostError("Invalid infracost output: expected string keys")

        payload = cast(dict[str, object], parsed)

        return self._parse_output(payload)

    def _parse_output(self, data: dict[str, object]) -> CostEstimate:
        resources: list[CostResource] = []
        parsed_monthly_sum = 0.0

        raw_projects_obj = data.get("projects")
        if isinstance(raw_projects_obj, list):
            for raw_project in cast(list[object], raw_projects_obj):
                if not isinstance(raw_project, dict):
                    continue
                raw_project_dict = cast(dict[object, object], raw_project)
                if not all(isinstance(key, str) for key in raw_project_dict):
                    continue
                project = cast(dict[str, object], raw_project)

                raw_breakdown_obj = project.get("breakdown")
                if not isinstance(raw_breakdown_obj, dict):
                    continue
                raw_breakdown_dict = cast(dict[object, object], raw_breakdown_obj)
                if not all(isinstance(key, str) for key in raw_breakdown_dict):
                    continue
                breakdown = cast(dict[str, object], raw_breakdown_obj)

                raw_resources_obj = breakdown.get("resources")
                if not isinstance(raw_resources_obj, list):
                    continue

                for raw_resource in cast(list[object], raw_resources_obj):
                    if not isinstance(raw_resource, dict):
                        continue
                    raw_resource_dict = cast(dict[object, object], raw_resource)
                    if not all(isinstance(key, str) for key in raw_resource_dict):
                        continue
                    resource = cast(dict[str, object], raw_resource)

                    raw_monthly = resource.get("monthlyCost", 0)
                    if isinstance(raw_monthly, NUMBER_TYPES):
                        try:
                            monthly_cost = float(raw_monthly)
                        except ValueError:
                            monthly_cost = 0.0
                    else:
                        monthly_cost = 0.0

                    parsed_monthly_sum += monthly_cost
                    name = resource.get("name")
                    resource_type = resource.get("resourceType")
                    resources.append(
                        CostResource(
                            name=name if isinstance(name, str) else "unknown",
                            monthly_cost=monthly_cost,
                            details={
                                "resourceType": (
                                    resource_type if isinstance(resource_type, str) else ""
                                )
                            },
                        )
                    )

        raw_total = data.get("totalMonthlyCost")
        if isinstance(raw_total, NUMBER_TYPES):
            try:
                total_monthly_cost = float(raw_total)
            except ValueError:
                total_monthly_cost = parsed_monthly_sum
        else:
            total_monthly_cost = parsed_monthly_sum

        return CostEstimate(
            monthly_cost=total_monthly_cost,
            hourly_cost=total_monthly_cost / 730,
            currency="USD",
            resources=resources,
        )
