# Plausible CE Setup Guide

CloudBlocks uses [Plausible Community Edition](https://plausible.io/self-hosted-web-analytics) (AGPL) for privacy-friendly, self-hosted analytics. No cookies, no personal data, GDPR-compliant by default.

## Architecture

```
index.html                          ← Plausible script tag (data-domain, src)
  └─ window.plausible()             ← Global injected by script
      └─ plausibleAdapter.ts        ← Wrapper with graceful no-op
          └─ metricsService.ts      ← Dual-write: localStorage + Plausible
```

When the Plausible script is unavailable (local dev without Docker, ad-blocker, missing env vars), all tracking calls silently no-op. The app never breaks.

## Local Development

### 1. Start Plausible Stack

```bash
cd infra/plausible
cp plausible.env.example plausible.env

# Generate a secret key
echo "SECRET_KEY_BASE=$(openssl rand -base64 48)" >> plausible.env

# Start Plausible + ClickHouse + PostgreSQL
docker compose -f docker-compose.plausible.yml up -d
```

Plausible will be available at `http://localhost:8100`.

### 2. Initial Plausible Setup

1. Open `http://localhost:8100` in your browser
2. Create an admin account
3. Add a site with domain: `localhost` (or whatever you use for dev)

### 3. Configure CloudBlocks

Add to `apps/web/.env`:

```env
VITE_PLAUSIBLE_DOMAIN=localhost
VITE_PLAUSIBLE_HOST=http://localhost:8100
```

Restart the Vite dev server (`pnpm dev`).

### 4. Verify Events

1. Open the CloudBlocks app at `http://localhost:5173`
2. Open Plausible dashboard at `http://localhost:8100`
3. You should see the `app_loaded` event appear in real-time

## Environment Variables

| Variable                | Description                         | Example                                                  |
| ----------------------- | ----------------------------------- | -------------------------------------------------------- |
| `VITE_PLAUSIBLE_DOMAIN` | Site domain registered in Plausible | `localhost`, `cloudblocks.dev`                           |
| `VITE_PLAUSIBLE_HOST`   | Plausible instance URL              | `http://localhost:8100`, `https://plausible.example.com` |

Both must be set for analytics to activate. If either is empty, the script tag in `index.html` will point to an invalid URL and silently fail to load.

## Tracked Events

| Event                          | When                              | Properties                       |
| ------------------------------ | --------------------------------- | -------------------------------- |
| `app_loaded`                   | App.tsx mounts                    | —                                |
| `first_container_block_placed` | User places first container block | —                                |
| `first_block_placed`           | User places first block           | —                                |
| `first_connection_created`     | User creates first connection     | —                                |
| `code_generated`               | Code generation runs              | `format`: terraform/bicep/pulumi |

Events are defined in `metricsService.ts` as `FunnelEvent` type. The service dual-writes to both localStorage (offline buffer) and Plausible (real-time analytics).

## Production Self-Hosting

For production, deploy Plausible CE on your server or cloud provider. The same Docker Compose stack works, with these changes:

1. Set `BASE_URL` in `plausible.env` to your public URL
2. Put a reverse proxy (nginx, Caddy) in front for HTTPS
3. Set `VITE_PLAUSIBLE_DOMAIN` to your production domain
4. Set `VITE_PLAUSIBLE_HOST` to your Plausible instance URL

See [Plausible self-hosting docs](https://plausible.io/docs/self-hosting) for advanced configuration.

## Stopping the Stack

```bash
cd infra/plausible
docker compose -f docker-compose.plausible.yml down

# To also remove data volumes:
docker compose -f docker-compose.plausible.yml down -v
```
