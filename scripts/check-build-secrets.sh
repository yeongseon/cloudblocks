#!/usr/bin/env bash
# check-build-secrets.sh — Scan build output for leaked secrets and credentials
#
# Runs after the frontend build to ensure no sensitive data is embedded
# in the JavaScript bundles or HTML files shipped to users.
#
# Usage:
#   ./scripts/check-build-secrets.sh [dist-dir]
#
# Exit codes:
#   0 — No secrets found
#   1 — Potential secret detected (blocks CI)
set -euo pipefail

DIST_DIR="${1:-apps/web/dist}"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: Build directory '$DIST_DIR' does not exist."
  echo "Run the build first, then re-run this check."
  exit 1
fi

echo "=== Security Hygiene: Scanning $DIST_DIR ==="
ERRORS=0

# ── 1. High-entropy secret patterns ──────────────────────────────────
#
# Scan all JS/HTML files for patterns that indicate leaked credentials.
# We use grep -rEi which is case-insensitive and handles extended regex.

PATTERNS=(
  # API keys / tokens (generic)
  'sk[-_]live[-_][a-zA-Z0-9]{20,}'
  'sk[-_]test[-_][a-zA-Z0-9]{20,}'
  'ghp_[a-zA-Z0-9]{36}'
  'gho_[a-zA-Z0-9]{36}'
  'ghu_[a-zA-Z0-9]{36}'
  'ghs_[a-zA-Z0-9]{36}'
  'github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}'

  # Azure-specific
  'DefaultEndpointsProtocol=https;AccountName='
  'AccountKey=[a-zA-Z0-9+/=]{40,}'

  # AWS-specific
  'AKIA[0-9A-Z]{16}'

  # JWT secrets (literal assignment, not token usage)
  'jwt[-_]secret\s*[:=]\s*["\x27][^"\x27]{8,}'

  # Private keys
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'

  # Generic high-confidence patterns
  'client[-_]secret\s*[:=]\s*["\x27][^"\x27]{8,}'
  'password\s*[:=]\s*["\x27][^"\x27]{8,}'
)

for pattern in "${PATTERNS[@]}"; do
  if grep -rEi "$pattern" "$DIST_DIR" --include='*.js' --include='*.html' --include='*.css' -l 2>/dev/null; then
    echo "FAIL: Pattern '$pattern' matched in build output."
    ERRORS=$((ERRORS + 1))
  fi
done

# ── 2. VITE_* env var audit ──────────────────────────────────────────
#
# Only VITE_API_URL is allowed. Any other VITE_* variable embedded in
# the build output indicates an accidental env leak.

ALLOWED_VITE_VARS="VITE_API_URL"

# Search for VITE_ references in built JS (Vite inlines import.meta.env.VITE_*)
FOUND_VITE_VARS=$(grep -rEoh 'VITE_[A-Z_]+' "$DIST_DIR" --include='*.js' 2>/dev/null | sort -u || true)

for var in $FOUND_VITE_VARS; do
  if [ "$var" != "$ALLOWED_VITE_VARS" ]; then
    echo "FAIL: Unexpected VITE_* variable '$var' found in build output."
    echo "      Only $ALLOWED_VITE_VARS is permitted. Remove the usage or add to allowlist."
    ERRORS=$((ERRORS + 1))
  fi
done

# ── 3. Source-level VITE_* audit ─────────────────────────────────────
#
# Also check source files to catch new VITE_* env vars before they
# reach the build. This prevents future accidental additions.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/apps/web/src"

if [ -d "$SRC_DIR" ]; then
  SRC_VITE_VARS=$(grep -rEoh 'import\.meta\.env\.VITE_[A-Z_]+' "$SRC_DIR" --include='*.ts' --include='*.tsx' 2>/dev/null | sed 's/import\.meta\.env\.//' | sort -u || true)

  for var in $SRC_VITE_VARS; do
    if [ "$var" != "$ALLOWED_VITE_VARS" ]; then
      echo "FAIL: Source code references import.meta.env.$var"
      echo "      Only $ALLOWED_VITE_VARS is permitted."
      ERRORS=$((ERRORS + 1))
    fi
  done
fi

# ── Summary ──────────────────────────────────────────────────────────

echo "---"
if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: $ERRORS security issue(s) found in build output."
  echo "Review the findings above and remove any leaked credentials."
  exit 1
else
  echo "PASS: No secrets or unauthorized env vars detected."
  exit 0
fi
