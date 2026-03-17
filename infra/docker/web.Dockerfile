# =============================================================================
# CloudBlocks Web — Multi-stage Production Dockerfile
# Build context: monorepo root
#   docker build -f infra/docker/web.Dockerfile -t cloudblocks-web .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — install all workspace dependencies with layer-cache
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Enable corepack so pnpm is available at the pinned version
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace manifests first — changes here invalidate the install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

# Install production + dev deps (dev needed for Vite build)
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: build — compile TypeScript and bundle with Vite
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Reuse the installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy the full source tree (workspace manifests + app source)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/ ./apps/web/

RUN pnpm --filter @cloudblocks/web build

# ---------------------------------------------------------------------------
# Stage 3: runtime — nginx serving the static SPA bundle
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.source=https://github.com/yeongseon/cloudblocks

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Inline nginx config: SPA fallback so client-side routing works
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
        access_log off;\n\
    }\n\
}\n' > /etc/nginx/conf.d/cloudblocks.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
