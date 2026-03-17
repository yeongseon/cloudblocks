from __future__ import annotations

import importlib
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_database, get_github_service
from app.core.security import create_access_token, encrypt_token, generate_id, hash_token
from app.domain.models.entities import Identity, User
from app.infrastructure.db.connection import Database
from app.infrastructure.db.repositories import SQLiteIdentityRepository, SQLiteUserRepository
from app.infrastructure.github_service import GitHubService
from app.main import app

pytest_asyncio = importlib.import_module("pytest_asyncio")


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


@pytest_asyncio.fixture
async def test_identity(db: Database, test_user: User) -> Identity:
    """Create a GitHub identity with encrypted token for test_user."""
    assert test_user.github_id is not None
    repo = SQLiteIdentityRepository(db)
    identity = Identity(
        id=generate_id(),
        user_id=test_user.id,
        provider="github",
        provider_id=test_user.github_id,
        access_token_hash=hash_token("fake-github-token"),
        encrypted_access_token=encrypt_token("fake-github-token"),
    )
    return await repo.create(identity)


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
