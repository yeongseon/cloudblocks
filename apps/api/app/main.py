"""CloudBlocks API - FastAPI Application.

Thin orchestration backend for the CloudBlocks Platform.
Handles auth, workspace metadata, GitHub integration, and code generation orchestration.
Architecture data lives in GitHub repos, NOT in this backend.
"""

from __future__ import annotations

import json as json_module
import logging
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.generation import router as generation_router
from app.api.routes.github import router as github_router
from app.api.routes.session import router as session_router
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


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        request_id = getattr(record, "request_id", None)
        if request_id is not None:
            log_data["request_id"] = request_id
        if record.exc_info and record.exc_info[0] is not None:
            log_data["exception"] = self.formatException(record.exc_info)
        return json_module.dumps(log_data)


def setup_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


setup_logging()


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


app = FastAPI(
    title="CloudBlocks API",
    description="Thin orchestration backend for CloudBlocks Platform",
    version="0.6.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.add_middleware(RequestIDMiddleware)


# Global error handler for AppError
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )
    # Clear stale session cookie on auth failures
    if exc.status_code == 401 and request.cookies.get(settings.session_cookie_name):
        response.delete_cookie(
            key=settings.session_cookie_name,
            path=settings.session_cookie_path,
            domain=settings.session_cookie_domain,
        )
    return response


# Health endpoints (no auth required)
@app.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness_check() -> JSONResponse:
    """Readiness check — verifies database is connected. Returns 503 on failure."""
    db = get_database()
    try:
        await db.fetch_one("SELECT 1")
        return JSONResponse(content={"status": "ready"}, status_code=200)
    except Exception:
        return JSONResponse(content={"status": "not_ready"}, status_code=503)


# Mount API v1 routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(session_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(github_router, prefix="/api/v1")
app.include_router(generation_router, prefix="/api/v1")
