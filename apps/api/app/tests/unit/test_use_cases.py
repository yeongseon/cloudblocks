from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.application.use_cases.workspace_use_cases import (
    CreateWorkspaceUseCase,
    DeleteWorkspaceUseCase,
    GetWorkspaceUseCase,
    ListWorkspacesUseCase,
)
from app.core.errors import ForbiddenError, NotFoundError
from app.domain.models.entities import User, Workspace


async def test_create_workspace_use_case_creates_workspace_with_generated_id() -> None:
    user = User(
        id="user1",
        github_id="gh123",
        github_username="testuser",
        email="test@test.com",
        display_name="Test",
    )
    mock_repo = AsyncMock()
    mock_repo.create = AsyncMock(side_effect=lambda workspace: workspace)
    use_case = CreateWorkspaceUseCase(mock_repo)

    gen_id_path = "app.application.use_cases.workspace_use_cases.generate_id"
    with patch(gen_id_path, return_value="ws-generated"):
        workspace = await use_case.execute(
            user=user,
            name="My Workspace",
            generator="terraform",
            provider="azure",
            github_repo="org/repo",
        )

    assert workspace.id == "ws-generated"
    assert workspace.owner_id == "user1"
    assert workspace.name == "My Workspace"
    assert workspace.generator == "terraform"
    assert workspace.provider == "azure"
    assert workspace.github_repo == "org/repo"
    mock_repo.create.assert_awaited_once()


async def test_get_workspace_use_case_returns_workspace_for_owner() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    workspace = Workspace(id="ws1", owner_id="user1", name="Workspace")

    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=workspace)
    use_case = GetWorkspaceUseCase(mock_repo)

    result = await use_case.execute("ws1", user)

    assert result == workspace


async def test_get_workspace_use_case_raises_not_found_when_missing() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=None)
    use_case = GetWorkspaceUseCase(mock_repo)

    with pytest.raises(NotFoundError, match="Workspace with id 'missing' not found"):
        await use_case.execute("missing", user)


async def test_get_workspace_use_case_raises_forbidden_for_wrong_owner() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    workspace = Workspace(id="ws1", owner_id="other-owner", name="Workspace")

    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=workspace)
    use_case = GetWorkspaceUseCase(mock_repo)

    with pytest.raises(ForbiddenError, match="You do not own this workspace"):
        await use_case.execute("ws1", user)


async def test_list_workspaces_use_case_returns_workspace_list() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    workspaces = [
        Workspace(id="ws1", owner_id="user1", name="A"),
        Workspace(id="ws2", owner_id="user1", name="B"),
    ]

    mock_repo = AsyncMock()
    mock_repo.find_by_owner = AsyncMock(return_value=workspaces)
    use_case = ListWorkspacesUseCase(mock_repo)

    result = await use_case.execute(user)

    assert result == workspaces
    mock_repo.find_by_owner.assert_awaited_once_with("user1")


async def test_delete_workspace_use_case_deletes_and_returns_true() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    workspace = Workspace(id="ws1", owner_id="user1", name="Workspace")

    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=workspace)
    mock_repo.delete = AsyncMock(return_value=True)
    use_case = DeleteWorkspaceUseCase(mock_repo)

    result = await use_case.execute("ws1", user)

    assert result is True
    mock_repo.delete.assert_awaited_once_with("ws1")


async def test_delete_workspace_use_case_raises_not_found_when_missing() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=None)
    use_case = DeleteWorkspaceUseCase(mock_repo)

    with pytest.raises(NotFoundError, match="Workspace with id 'missing' not found"):
        await use_case.execute("missing", user)


async def test_delete_workspace_use_case_raises_forbidden_for_wrong_owner() -> None:
    user = User(
        id="user1", github_id="gh123", github_username="testuser",
        email="test@test.com", display_name="Test",
    )
    workspace = Workspace(id="ws1", owner_id="other-owner", name="Workspace")

    mock_repo = AsyncMock()
    mock_repo.find_by_id = AsyncMock(return_value=workspace)
    use_case = DeleteWorkspaceUseCase(mock_repo)

    with pytest.raises(ForbiddenError, match="You do not own this workspace"):
        await use_case.execute("ws1", user)
