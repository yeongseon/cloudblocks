from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_database, get_github_service
from app.core.security import create_access_token, generate_id
from app.domain.models.entities import User
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import SQLiteUserRepository
from app.infrastructure.github_service import GitHubService
from app.main import app


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[Database, None]:
    database = Database(":memory:")
    await database.connect()
    yield database
    await database.disconnect()


@pytest_asyncio.fixture
async def client(db: Database) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_database] = lambda: db

    mock_gh = AsyncMock(spec=GitHubService)
    # get_authorize_url is sync in the real class; spec= keeps it as MagicMock.
    # We override explicitly so side_effect works without coroutine wrapping.
    mock_gh.get_authorize_url = MagicMock(
        side_effect=lambda redirect_uri, state: (
            "https://github.com/login/oauth/authorize?client_id=test-client"
            f"&redirect_uri={redirect_uri}&state={state}"
        )
    )
    app.dependency_overrides[get_github_service] = lambda: mock_gh

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_github() -> AsyncMock:
    return app.dependency_overrides[get_github_service]()


@pytest_asyncio.fixture
async def test_user(db: Database) -> User:
    user_repo = SQLiteUserRepository(db)
    user = User(
        id=generate_id(),
        github_id="12345",
        github_username="testuser",
        email="test@example.com",
        display_name="Test User",
    )
    return await user_repo.create(user)


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
