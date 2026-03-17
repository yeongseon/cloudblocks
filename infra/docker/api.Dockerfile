# =============================================================================
# CloudBlocks API — Multi-stage Production Dockerfile
# Build context: monorepo root
#   docker build -f infra/docker/api.Dockerfile -t cloudblocks-api .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: builder — install dependencies into a venv
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/yeongseon/cloudblocks

# Install build essentials needed by some Python packages (e.g. cryptography)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
        libssl-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a virtual environment so the runtime stage only needs to copy it
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only the project manifest first for better layer caching.
# The build context is the monorepo root, so paths are relative to it.
COPY apps/api/pyproject.toml ./

# Upgrade pip & wheel then install the project (production deps only)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir .

# ---------------------------------------------------------------------------
# Stage 2: runtime — minimal image with non-root user
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.source=https://github.com/yeongseon/cloudblocks

# curl is needed for the HEALTHCHECK
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user/group
RUN groupadd --system appgroup && useradd --system --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy the pre-built venv from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source (the `app/` package and any supporting files)
COPY apps/api/ ./

# Hand ownership to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
