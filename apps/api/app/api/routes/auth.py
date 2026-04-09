"""CloudBlocks API - Authentication routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from app.application.use_cases.auth_use_cases import (
    CompleteGitHubOAuthUseCase,
    GetSessionUserUseCase,
    LogoutUseCase,
    StartGitHubOAuthUseCase,
)
from app.core.config import settings
from app.core.dependencies import (
    get_complete_github_oauth_use_case,
    get_current_user,
    get_logout_use_case,
    get_session_user_use_case,
    get_start_github_oauth_use_case,
)
from app.domain.models.entities import User

router = APIRouter(prefix="/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: str
    github_username: str | None
    email: str | None
    display_name: str | None
    avatar_url: str | None


@router.post("/github")
async def start_github_oauth(
    use_case: Annotated[StartGitHubOAuthUseCase, Depends(get_start_github_oauth_use_case)],
) -> JSONResponse:
    result = await use_case.execute()

    response = JSONResponse(content={"authorize_url": result.authorize_url})
    response.set_cookie(
        key=settings.oauth_cookie_name,
        value=result.encrypted_state,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.oauth_state_ttl_minutes * 60,
        path=settings.session_cookie_path,
    )
    return response


@router.get("/github/callback")
async def github_oauth_callback(
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    request: Request,
    use_case: Annotated[CompleteGitHubOAuthUseCase, Depends(get_complete_github_oauth_use_case)],
) -> RedirectResponse:
    result = await use_case.execute(
        code=code,
        state=state,
        encrypted_state=request.cookies.get(settings.oauth_cookie_name),
    )

    response = RedirectResponse(url=settings.frontend_url, status_code=302)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=result.session_token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_hours * 3600,
        path=settings.session_cookie_path,
        domain=settings.session_cookie_domain,
    )
    response.delete_cookie(
        key=settings.oauth_cookie_name,
        path=settings.session_cookie_path,
    )
    return response


@router.get("/session")
async def get_session(
    request: Request,
    use_case: Annotated[GetSessionUserUseCase, Depends(get_session_user_use_case)],
) -> UserResponse:
    """Bootstrap endpoint - returns current user if session cookie is valid."""
    user = await use_case.execute(request.cookies.get(settings.session_cookie_name))

    return UserResponse(
        id=user.id,
        github_username=user.github_username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


@router.post("/logout")
async def logout(
    request: Request,
    use_case: Annotated[LogoutUseCase, Depends(get_logout_use_case)],
) -> JSONResponse:
    """Revoke session and clear cookie. Always returns 200."""
    await use_case.execute(request.cookies.get(settings.session_cookie_name))

    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key=settings.session_cookie_name,
        path=settings.session_cookie_path,
        domain=settings.session_cookie_domain,
    )
    return response


@router.get("/me")
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get the current authenticated user."""
    return UserResponse(
        id=current_user.id,
        github_username=current_user.github_username,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )
