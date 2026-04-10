# pyright: reportAny=false, reportUnknownLambdaType=false, reportUnusedCallResult=false
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.application.use_cases.auth_use_cases import CompleteGitHubOAuthUseCase
from app.core.errors import UnauthorizedError
from app.domain.models.entities import Identity, Session, User


def _build_use_case() -> (
    tuple[
        CompleteGitHubOAuthUseCase,
        AsyncMock,
        AsyncMock,
        AsyncMock,
        AsyncMock,
    ]
):
    github_service = AsyncMock()
    user_repo = AsyncMock()
    identity_repo = AsyncMock()
    session_repo = AsyncMock()
    use_case = CompleteGitHubOAuthUseCase(
        github_service=github_service,
        user_repo=user_repo,
        identity_repo=identity_repo,
        session_repo=session_repo,
        oauth_state_ttl_minutes=10,
        session_ttl_hours=24,
    )
    return use_case, github_service, user_repo, identity_repo, session_repo


async def test_complete_github_oauth_use_case_rejects_missing_created_at() -> None:
    use_case, github_service, user_repo, identity_repo, session_repo = _build_use_case()

    with patch(
        "app.application.use_cases.auth_use_cases.decrypt_oauth_state",
        return_value={"state": "expected-state"},
    ):
        with pytest.raises(UnauthorizedError, match="Invalid OAuth state"):
            await use_case.execute(
                code="oauth-code",
                state="expected-state",
                encrypted_state="encrypted-state",
            )

    github_service.exchange_code.assert_not_awaited()
    user_repo.find_by_github_id.assert_not_awaited()
    identity_repo.find_by_provider.assert_not_awaited()
    session_repo.create.assert_not_awaited()


async def test_complete_github_oauth_use_case_rejects_null_created_at() -> None:
    use_case, github_service, user_repo, identity_repo, session_repo = _build_use_case()

    with patch(
        "app.application.use_cases.auth_use_cases.decrypt_oauth_state",
        return_value={"state": "expected-state", "created_at": None},
    ):
        with pytest.raises(UnauthorizedError, match="Invalid OAuth state"):
            await use_case.execute(
                code="oauth-code",
                state="expected-state",
                encrypted_state="encrypted-state",
            )

    github_service.exchange_code.assert_not_awaited()
    user_repo.find_by_github_id.assert_not_awaited()
    identity_repo.find_by_provider.assert_not_awaited()
    session_repo.create.assert_not_awaited()


async def test_complete_github_oauth_use_case_rejects_non_numeric_created_at() -> None:
    use_case, github_service, user_repo, identity_repo, session_repo = _build_use_case()

    with patch(
        "app.application.use_cases.auth_use_cases.decrypt_oauth_state",
        return_value={"state": "expected-state", "created_at": "not_a_number"},
    ):
        with pytest.raises(UnauthorizedError, match="Invalid OAuth state"):
            await use_case.execute(
                code="oauth-code",
                state="expected-state",
                encrypted_state="encrypted-state",
            )

    github_service.exchange_code.assert_not_awaited()
    user_repo.find_by_github_id.assert_not_awaited()
    identity_repo.find_by_provider.assert_not_awaited()
    session_repo.create.assert_not_awaited()


@pytest.mark.parametrize(
    "github_user",
    [
        pytest.param({"login": "test-user"}, id="missing"),
        pytest.param({"id": "", "login": "test-user"}, id="empty"),
    ],
)
async def test_complete_github_oauth_use_case_rejects_missing_or_empty_github_id(
    github_user: dict[str, object],
) -> None:
    use_case, github_service, user_repo, identity_repo, session_repo = _build_use_case()
    github_service.exchange_code.return_value = {"access_token": "gh-token"}
    github_service.get_user.return_value = github_user

    with patch(
        "app.application.use_cases.auth_use_cases.decrypt_oauth_state",
        return_value={"state": "expected-state", "created_at": 1_700_000_000},
    ):
        with patch(
            "app.application.use_cases.auth_use_cases.time.time", return_value=1_700_000_001
        ):
            with pytest.raises(UnauthorizedError, match="Invalid OAuth state"):
                await use_case.execute(
                    code="oauth-code",
                    state="expected-state",
                    encrypted_state="encrypted-state",
                )

    github_service.get_user_emails.assert_not_awaited()
    user_repo.find_by_github_id.assert_not_awaited()
    identity_repo.find_by_provider.assert_not_awaited()
    session_repo.create.assert_not_awaited()


async def test_complete_github_oauth_use_case_accepts_valid_state() -> None:
    use_case, github_service, user_repo, identity_repo, session_repo = _build_use_case()
    github_service.exchange_code.return_value = {"access_token": "gh-token"}
    github_service.get_user.return_value = {
        "id": 12345,
        "login": "test-user",
        "name": "Test User",
        "email": None,
        "avatar_url": "https://avatars.example/test-user.png",
    }
    github_service.get_user_emails.return_value = [
        {"email": "test-user@example.com", "primary": True}
    ]
    user_repo.find_by_github_id.return_value = None
    user_repo.create.side_effect = lambda user: user
    identity_repo.find_by_provider.return_value = None
    identity_repo.create.side_effect = lambda identity: identity
    session_repo.create.side_effect = lambda session: session

    with patch(
        "app.application.use_cases.auth_use_cases.decrypt_oauth_state",
        return_value={"state": "expected-state", "created_at": 1_700_000_000},
    ):
        with patch(
            "app.application.use_cases.auth_use_cases.time.time", return_value=1_700_000_001
        ):
            with patch(
                "app.application.use_cases.auth_use_cases.generate_id",
                side_effect=["user-generated", "identity-generated"],
            ):
                with patch(
                    "app.application.use_cases.auth_use_cases.generate_session_token",
                    return_value="session-token",
                ):
                    with patch(
                        "app.application.use_cases.auth_use_cases.hash_token",
                        return_value="token-hash",
                    ):
                        with patch(
                            "app.application.use_cases.auth_use_cases.encrypt_token",
                            return_value="encrypted-token",
                        ):
                            result = await use_case.execute(
                                code="oauth-code",
                                state="expected-state",
                                encrypted_state="encrypted-state",
                            )

    assert result.session_token == "session-token"
    user_repo.find_by_github_id.assert_awaited_once_with("12345")
    user_repo.create.assert_awaited_once()
    created_user = user_repo.create.await_args.args[0]
    assert isinstance(created_user, User)
    assert created_user.id == "user-generated"
    assert created_user.github_id == "12345"
    assert created_user.github_username == "test-user"
    assert created_user.email == "test-user@example.com"
    assert created_user.display_name == "Test User"
    assert created_user.avatar_url == "https://avatars.example/test-user.png"
    identity_repo.find_by_provider.assert_awaited_once_with("github", "12345")
    identity_repo.create.assert_awaited_once()
    created_identity = identity_repo.create.await_args.args[0]
    assert isinstance(created_identity, Identity)
    assert created_identity.id == "identity-generated"
    assert created_identity.user_id == "user-generated"
    assert created_identity.provider == "github"
    assert created_identity.provider_id == "12345"
    assert created_identity.access_token_hash == "token-hash"
    assert created_identity.encrypted_access_token == "encrypted-token"
    session_repo.create.assert_awaited_once()
    created_session = session_repo.create.await_args.args[0]
    assert isinstance(created_session, Session)
    assert created_session.id == "session-token"
    assert created_session.user_id == "user-generated"
    assert created_session.created_at == 1_700_000_001
    assert created_session.expires_at == 1_700_086_401
    assert created_session.revoked_at is None
    assert created_session.last_seen_at is None
