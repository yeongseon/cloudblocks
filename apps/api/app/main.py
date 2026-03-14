"""CloudBlocks API - FastAPI Application.

Thin orchestration backend for the CloudBlocks Platform.
Handles auth, workspace metadata, GitHub integration, and code generation orchestration.
Architecture data lives in GitHub repos, NOT in this backend.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.auth import router as auth_router
from app.api.routes.generation import router as generation_router
from app.api.routes.github import router as github_router
from app.api.routes.workspaces import router as workspace_router
from app.core.config import settings
from app.core.dependencies import get_database
from app.core.errors import AppError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan — connect/disconnect database."""
    db = get_database()
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="CloudBlocks API",
    description="Thin orchestration backend for CloudBlocks Platform",
    version="0.5.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handler for AppError
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


# Health endpoints (no auth required)
@app.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness_check() -> dict[str, str]:
    """Readiness check — verifies database is connected."""
    db = get_database()
    try:
        await db.fetch_one("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return {"status": "not_ready"}


# Mount API v1 routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(github_router, prefix="/api/v1")
app.include_router(generation_router, prefix="/api/v1")
