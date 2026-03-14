"""CloudBlocks API - FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CloudBlocks API",
    description="Thin orchestration backend for CloudBlocks Platform",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness_check() -> dict[str, str]:
    """Readiness check - verifies Redis and GitHub connectivity."""
    # TODO: Check Redis and GitHub API connectivity
    return {"status": "ready"}
