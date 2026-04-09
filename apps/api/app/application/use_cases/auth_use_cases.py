from __future__ import annotations

import time
from dataclasses import dataclass
from typing import cast, final

from app.core.errors import UnauthorizedError
from app.core.security import (
    decrypt_oauth_state,
    encrypt_oauth_state,
    encrypt_token,
    generate_id,
    generate_session_token,
    hash_token,
)
from app.domain.models.entities import Identity, Session, User
from app.domain.models.repositories import IdentityRepository, SessionRepository, UserRepository
from app.infrastructure.github_service import GitHubService


@dataclass
class GitHubOAuthStartResult:
    authorize_url: str
    encrypted_state: str


@dataclass
class GitHubOAuthCallbackResult:
    session_token: str


def _optional_str(value: object) -> str | None:
    return value if isinstance(value, str) else None


@final
class StartGitHubOAuthUseCase:
    def __init__(
        self,
        github_service: GitHubService,
        github_redirect_uri: str,
    ) -> None:
        self._github_service: GitHubService = github_service
        self._github_redirect_uri: str = github_redirect_uri

    async def execute(self) -> GitHubOAuthStartResult:
        state = generate_session_token()
        state_data = {"state": state, "created_at": int(time.time())}
        encrypted_state = encrypt_oauth_state(state_data)
        authorize_url = self._github_service.get_authorize_url(self._github_redirect_uri, state)
        return GitHubOAuthStartResult(
            authorize_url=authorize_url,
            encrypted_state=encrypted_state,
        )


@final
class CompleteGitHubOAuthUseCase:
    def __init__(
        self,
        github_service: GitHubService,
        user_repo: UserRepository,
        identity_repo: IdentityRepository,
        session_repo: SessionRepository,
        oauth_state_ttl_minutes: int,
        session_ttl_hours: int,
    ) -> None:
        self._github_service: GitHubService = github_service
        self._user_repo: UserRepository = user_repo
        self._identity_repo: IdentityRepository = identity_repo
        self._session_repo: SessionRepository = session_repo
        self._oauth_state_ttl_minutes: int = oauth_state_ttl_minutes
        self._session_ttl_hours: int = session_ttl_hours

    async def execute(
        self,
        *,
        code: str,
        state: str,
        encrypted_state: str | None,
    ) -> GitHubOAuthCallbackResult:
        if not encrypted_state:
            raise UnauthorizedError("Missing OAuth state cookie")

        state_data = decrypt_oauth_state(encrypted_state)
        if not state_data or state_data.get("state") != state:
            raise UnauthorizedError("Invalid OAuth state")

        created_raw = state_data.get("created_at", 0)
        created_at = int(created_raw)
        if int(time.time()) - created_at > self._oauth_state_ttl_minutes * 60:
            raise UnauthorizedError("OAuth state expired")

        token_data = await self._github_service.exchange_code(code)
        access_token = token_data["access_token"]

        github_user = cast(dict[str, object], await self._github_service.get_user(access_token))
        github_id = str(github_user.get("id", ""))

        emails = cast(
            list[dict[str, object]], await self._github_service.get_user_emails(access_token)
        )
        primary_email: str | None = next(
            (
                email_value
                for email in emails
                for email_value in [email.get("email")]
                if email.get("primary") and isinstance(email_value, str)
            ),
            _optional_str(github_user.get("email")),
        )

        user = await self._user_repo.find_by_github_id(github_id)
        if user:
            user.github_username = _optional_str(github_user.get("login"))
            user.email = primary_email
            user.display_name = _optional_str(github_user.get("name")) or _optional_str(
                github_user.get("login")
            )
            user.avatar_url = _optional_str(github_user.get("avatar_url"))
            user = await self._user_repo.update(user)
        else:
            user = User(
                id=generate_id(),
                github_id=github_id,
                github_username=_optional_str(github_user.get("login")),
                email=primary_email,
                display_name=_optional_str(github_user.get("name"))
                or _optional_str(github_user.get("login")),
                avatar_url=_optional_str(github_user.get("avatar_url")),
            )
            user = await self._user_repo.create(user)

        identity = await self._identity_repo.find_by_provider("github", github_id)
        if identity:
            identity.access_token_hash = hash_token(access_token)
            identity.encrypted_access_token = encrypt_token(access_token)
            _ = await self._identity_repo.update(identity)
        else:
            identity = Identity(
                id=generate_id(),
                user_id=user.id,
                provider="github",
                provider_id=github_id,
                access_token_hash=hash_token(access_token),
                encrypted_access_token=encrypt_token(access_token),
            )
            _ = await self._identity_repo.create(identity)

        now = int(time.time())
        session_token = generate_session_token()
        session = Session(
            id=session_token,
            user_id=user.id,
            created_at=now,
            expires_at=now + self._session_ttl_hours * 3600,
        )
        _ = await self._session_repo.create(session)
        return GitHubOAuthCallbackResult(session_token=session_token)


@final
class GetSessionUserUseCase:
    def __init__(
        self,
        session_repo: SessionRepository,
        user_repo: UserRepository,
    ) -> None:
        self._session_repo: SessionRepository = session_repo
        self._user_repo: UserRepository = user_repo

    async def execute(self, session_token: str | None) -> User:
        if not session_token:
            raise UnauthorizedError("No active session")

        session = await self._session_repo.get_by_id(session_token)
        if not session:
            raise UnauthorizedError("Invalid session")

        now = int(time.time())
        if session.expires_at < now:
            raise UnauthorizedError("Session expired")
        if session.revoked_at is not None:
            raise UnauthorizedError("Session revoked")

        await self._session_repo.update_last_seen(session.id, now)

        user = await self._user_repo.find_by_id(session.user_id)
        if not user:
            raise UnauthorizedError("User not found")
        return user


@final
class LogoutUseCase:
    def __init__(self, session_repo: SessionRepository) -> None:
        self._session_repo: SessionRepository = session_repo

    async def execute(self, session_token: str | None) -> None:
        if not session_token:
            return

        existing = await self._session_repo.get_by_id(session_token)
        if existing and existing.revoked_at is None:
            await self._session_repo.revoke(existing.id)
