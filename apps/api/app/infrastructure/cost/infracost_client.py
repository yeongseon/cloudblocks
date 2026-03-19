"""Infracost integration for cloud cost estimation."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any

from app.domain.models.ai_entities import CostEstimate, CostResource

logger = logging.getLogger(__name__)


class InfracostError(Exception):
    """Error during Infracost execution."""


class InfracostNotAvailableError(InfracostError):
    """Infracost binary not found."""


class InfracostClient:
    """Wrapper around Infracost CLI for cost estimation."""

    def __init__(self, api_key: str = ""):
        self.api_key: str = api_key

    async def is_available(self) -> bool:
        """Check if infracost binary is available."""
        return shutil.which("infracost") is not None

    async def estimate(self, terraform_dir: str) -> CostEstimate:
        """Run infracost breakdown on a Terraform directory.

        Args:
            terraform_dir: Path to directory with .tf files

        Returns:
            CostEstimate with monthly/hourly costs and resource breakdown

        Raises:
            InfracostNotAvailableError: If infracost binary not found
            InfracostError: If infracost execution fails
        """
        if not await self.is_available():
            raise InfracostNotAvailableError(
                "Infracost binary not found. Install from https://www.infracost.io/docs/"
            )

        tf_path = Path(terraform_dir)
        if not tf_path.exists():
            raise InfracostError(f"Terraform directory not found: {terraform_dir}")

        env = None
        if self.api_key:
            env = {**os.environ, "INFRACOST_API_KEY": self.api_key}

        try:
            process = await asyncio.create_subprocess_exec(
                "infracost",
                "breakdown",
                "--path",
                str(tf_path),
                "--format",
                "json",
                "--no-color",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120)
        except asyncio.TimeoutError as exc:
            raise InfracostError("Infracost timed out after 120s") from exc
        except OSError as exc:
            raise InfracostError(f"Failed to execute infracost: {exc}") from exc

        if process.returncode != 0:
            raise InfracostError(
                f"Infracost failed (exit {process.returncode}): {stderr.decode()}"
            )

        try:
            decoded = json.loads(stdout.decode())
        except json.JSONDecodeError as exc:
            raise InfracostError(f"Invalid JSON from infracost: {exc}") from exc

        if not isinstance(decoded, dict):
            raise InfracostError("Invalid JSON from infracost: root must be an object")

        return self._parse_output(decoded)

    def _parse_output(self, data: dict[str, Any]) -> CostEstimate:
        """Parse infracost JSON output into CostEstimate."""
        total_monthly = 0.0
        resources: list[CostResource] = []

        for project_raw in data.get("projects", []):
            if not isinstance(project_raw, dict):
                continue
            breakdown = project_raw.get("breakdown")
            if not isinstance(breakdown, dict):
                continue
            resource_list = breakdown.get("resources")
            if not isinstance(resource_list, list):
                continue

            for resource_raw in resource_list:
                if not isinstance(resource_raw, dict):
                    continue
                monthly = resource_raw.get("monthlyCost")
                if isinstance(monthly, (str, int, float)):
                    cost = float(monthly)
                    total_monthly += cost
                    name = resource_raw.get("name")
                    resource_type = resource_raw.get("resourceType")
                    resources.append(
                        CostResource(
                            name=name if isinstance(name, str) else "unknown",
                            monthly_cost=cost,
                            details={
                                "resource_type": (
                                    resource_type if isinstance(resource_type, str) else ""
                                ),
                            },
                        )
                    )

        total_from_data = data.get("totalMonthlyCost")
        if isinstance(total_from_data, (str, int, float)):
            total_monthly = float(total_from_data)

        hourly = total_monthly / 730

        return CostEstimate(
            monthly_cost=round(total_monthly, 2),
            hourly_cost=round(hourly, 4),
            currency="USD",
            resources=resources,
        )
