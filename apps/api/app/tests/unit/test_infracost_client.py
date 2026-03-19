from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from app.infrastructure.cost.infracost_client import (
    InfracostClient,
    InfracostError,
    InfracostNotAvailableError,
)

SAMPLE_OUTPUT = {
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
                        "name": "aws_db_instance.main",
                        "resourceType": "aws_db_instance",
                        "monthlyCost": "50.50",
                    },
                ]
            }
        }
    ],
}


@pytest.mark.asyncio
async def test_is_available_found() -> None:
    client = InfracostClient()

    with patch(
        "app.infrastructure.cost.infracost_client.shutil.which",
        return_value="/usr/bin/infracost",
    ):
        result = await client.is_available()

    assert result is True


@pytest.mark.asyncio
async def test_is_available_not_found() -> None:
    client = InfracostClient()

    with patch("app.infrastructure.cost.infracost_client.shutil.which", return_value=None):
        result = await client.is_available()

    assert result is False


@pytest.mark.asyncio
async def test_estimate_success(tmp_path: Path) -> None:
    client = InfracostClient(api_key="test-key")
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = AsyncMock()
    process.returncode = 0
    process.communicate.return_value = (json.dumps(SAMPLE_OUTPUT).encode(), b"")

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ) as create_subprocess,
    ):
        estimate = await client.estimate(str(tf_dir))

    assert estimate.monthly_cost == 150.50
    assert estimate.hourly_cost == round(150.50 / 730, 4)
    assert estimate.currency == "USD"
    assert len(estimate.resources) == 2
    assert estimate.resources[0].name == "aws_instance.web"
    assert estimate.resources[1].monthly_cost == 50.50

    assert create_subprocess.await_args is not None
    called_env = create_subprocess.await_args.kwargs["env"]
    assert called_env is not None
    assert called_env["INFRACOST_API_KEY"] == "test-key"


@pytest.mark.asyncio
async def test_estimate_binary_not_found(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    with (
        patch.object(client, "is_available", AsyncMock(return_value=False)),
        pytest.raises(InfracostNotAvailableError, match="Infracost binary not found"),
    ):
        _ = await client.estimate(str(tf_dir))


@pytest.mark.asyncio
async def test_estimate_directory_not_found() -> None:
    client = InfracostClient()

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        pytest.raises(InfracostError, match="Terraform directory not found"),
    ):
        _ = await client.estimate("/path/does/not/exist")


@pytest.mark.asyncio
async def test_estimate_infracost_fails(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = AsyncMock()
    process.returncode = 1
    process.communicate.return_value = (b"", b"bad things happened")

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ),
        pytest.raises(InfracostError, match="Infracost failed"),
    ):
        _ = await client.estimate(str(tf_dir))


@pytest.mark.asyncio
async def test_estimate_invalid_json_output(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = AsyncMock()
    process.returncode = 0
    process.communicate.return_value = (b"not-json", b"")

    with (
        patch.object(client, "is_available", AsyncMock(return_value=True)),
        patch(
            "app.infrastructure.cost.infracost_client.asyncio.create_subprocess_exec",
            AsyncMock(return_value=process),
        ),
        pytest.raises(InfracostError, match="Invalid JSON from infracost"),
    ):
        _ = await client.estimate(str(tf_dir))


@pytest.mark.asyncio
async def test_estimate_timeout(tmp_path: Path) -> None:
    client = InfracostClient()
    tf_dir = tmp_path / "terraform"
    tf_dir.mkdir()

    process = AsyncMock()
    process.returncode = 0

    async def _raise_timeout(awaitable: object, timeout: int) -> tuple[bytes, bytes]:
        close = getattr(awaitable, "close", None)
        if callable(close):
            close()
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


def test_parse_output_empty_projects() -> None:
    client = InfracostClient()

    estimate = client._parse_output({"projects": []})

    assert estimate.monthly_cost == 0.0
    assert estimate.hourly_cost == 0.0
    assert estimate.currency == "USD"
    assert estimate.resources == []


def test_parse_output_multiple_resources() -> None:
    client = InfracostClient()
    data = {
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
                            "name": "aws_db_instance.main",
                            "resourceType": "aws_db_instance",
                            "monthlyCost": "50.50",
                        },
                        {
                            "name": "aws_s3_bucket.assets",
                            "resourceType": "aws_s3_bucket",
                            "monthlyCost": "20.00",
                        },
                    ]
                }
            }
        ]
    }

    estimate = client._parse_output(data)

    assert estimate.monthly_cost == 170.5
    assert estimate.hourly_cost == round(170.5 / 730, 4)
    assert len(estimate.resources) == 3
