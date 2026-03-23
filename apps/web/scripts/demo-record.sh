#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building app for demo recording..."
pnpm --filter @cloudblocks/web build

echo "==> Running Playwright demo specs with video recording..."
npx playwright test \
  --config "$WEB_DIR/e2e/playwright.config.ts" \
  --project chromium \
  "$@"

echo "==> Done. Videos saved to $WEB_DIR/test-results/e2e/"
