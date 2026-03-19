from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import cast
from unittest.mock import AsyncMock, patch

import pytest

from app.domain.models.ai_entities import CostEstimate
from app.infrastructure.cost.infracost_client import (
    InfracostClient,
    InfracostError,
    InfracostNotAvailableError,
)

SAMPLE_OUTPUT: dict[str, object] = {
    "version": "0.2",
    "totalMonthlyCost": "150.50",
    "projects": [
        {
            "breakdown": {
                "resources": [
                    {
                        "name": "aws_instance.web",
                        "resourceType": "aws_instance",
                        "monthlyCost": "100.00",
                    },
                    {
                        "name": "aws_db_instance.db",
                        "resourceType": "aws_db_instance",
                        "monthlyCost": "50.50",
                    },
                ]
            }
        }
    ],
}


class FakeProcess:
    def __init__(
        self,
        *,
        returncode: int,
        stdout: bytes,
        stderr: bytes,
    ) -> None:
        self.returncode: int = returncode
        self._stdout: bytes = stdout
        self._stderr: bytes = stderr
        self.killed: bool = False

    async def communicate(self) -> tuple[bytes, bytes]:
        return self._stdout, self._stderr

    async def wait(self) -> int:
        return 0

    def kill(self) -> int:
        self.killed = True
        return 0


class InfracostClientProbe(InfracostClient):
    def parse_output(self, data: dict[str, object]) -> CostEstimate:
        return self._parse_output(data)


@pytest.mark.asyncio
async def test_is_available_true() -> None:
    client = InfracostClient()

    with patch(
        "app.infrastructure.cost.infracost_client.shutil.which",
        return_value="/usr/bin/infracost",
    ):
        result = await client.is_available()

    assert result is True


@pytest.mark.asyncio
async def test_is_available_false() -> None:
    client = InfracostClient()

    with patch("app.infrastructure.cost.infracost_client.shutil.which", return_value=None):
        result = await client.is_available()

    assert result is False


@pytest.mark.asyncio
async def test_estimate_success(tmp_path: Path) -> None:
    client = InfracostClient(api_key="test-key")
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = FakeProcess(
        returncode=0,
        stdout=json.dumps(SAMPLE_OUTPUT).encode(),
        stderr=b"",
    )

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ) as create_subprocess,
    ):
        estimate = await client.estimate(str(tf_dir))

    assert estimate.monthly_cost == 150.50
    assert estimate.hourly_cost == 150.50 / 730
    assert estimate.currency == "USD"
    assert len(estimate.resources) == 2
    assert estimate.resources[0].name == "aws_instance.web"
    assert estimate.resources[0].details == {"resourceType": "aws_instance"}
    assert estimate.resources[1].name == "aws_db_instance.db"
    assert estimate.resources[1].monthly_cost == 50.50

    assert create_subprocess.await_args is not None
    called_args = create_subprocess.await_args.args
    assert called_args[:2] == ("infracost", "breakdown")
    assert "--format" in called_args
    assert "json" in called_args
    assert "--no-color" in called_args
    assert "--path" in called_args

    called_env = cast(dict[str, str], create_subprocess.await_args.kwargs["env"])
    assert called_env is not None
    assert called_env["INFRACOST_API_KEY"] == "test-key"


@pytest.mark.asyncio
async def test_estimate_binary_not_found(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    with (
        patch.object(client, "is_available", AsyncMock(return_value=False)),
        pytest.raises(InfracostNotAvailableError, match="Infracost binary not found on PATH"),
    ):
        _ = await client.estimate(str(tf_dir))


@pytest.mark.asyncio
async def test_estimate_invalid_directory() -> None:
    client = InfracostClient()

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        pytest.raises(InfracostError, match="Terraform directory not found"),
    ):
        _ = await client.estimate("/path/does/not/exist")


@pytest.mark.asyncio
async def test_estimate_process_error(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = FakeProcess(returncode=1, stdout=b"", stderr=b"bad things happened")

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ),
        pytest.raises(InfracostError, match="Infracost process failed"),
    ):
        _ = await client.estimate(str(tf_dir))


@pytest.mark.asyncio
async def test_estimate_timeout(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = FakeProcess(returncode=0, stdout=b"", stderr=b"")

    async def _raise_timeout(awaitable: object, timeout: int) -> tuple[bytes, bytes]:
        assert timeout == 120
        close = getattr(awaitable, "close", None)
        if callable(close):
            _ = close()
        raise asyncio.TimeoutError

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.wait_for",
            side_effect=_raise_timeout,
        ),
        pytest.raises(InfracostError, match="timed out"),
    ):
        _ = await client.estimate(str(tf_dir))


def test_parse_output_multiple_resources() -> None:
    client = InfracostClientProbe()
    estimate = client.parse_output(SAMPLE_OUTPUT)

    assert estimate.monthly_cost == 150.50
    assert estimate.hourly_cost == 150.50 / 730
    assert estimate.currency == "USD"
    assert len(estimate.resources) == 2
    assert estimate.resources[0].name == "aws_instance.web"
    assert estimate.resources[0].details == {"resourceType": "aws_instance"}
    assert estimate.resources[1].name == "aws_db_instance.db"
    assert estimate.resources[1].details == {"resourceType": "aws_db_instance"}


def test_parse_output_empty() -> None:
    client = InfracostClientProbe()
    estimate = client.parse_output({"version": "0.2", "projects": []})

    assert estimate.monthly_cost == 0.0
    assert estimate.hourly_cost == 0.0
    assert estimate.currency == "USD"
    assert estimate.resources == []
