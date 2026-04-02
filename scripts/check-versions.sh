#!/usr/bin/env bash
# check-versions.sh — Verify all package versions and schema version source
# See docs/design/VERSION_POLICY.md for the single-version policy.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Source of truth: root package.json
EXPECTED=$(python3 -c "import json; print(json.load(open('$REPO_ROOT/package.json'))['version'])")

echo "Expected version (root): $EXPECTED"
echo "---"

ERRORS=0

check() {
  local label="$1"
  local actual="$2"
  if [ "$actual" != "$EXPECTED" ]; then
    echo "MISMATCH  $label: $actual (expected $EXPECTED)"
    ERRORS=$((ERRORS + 1))
  else
    echo "OK        $label: $actual"
  fi
}

# apps/web/package.json
WEB_VERSION=$(python3 -c "import json; print(json.load(open('$REPO_ROOT/apps/web/package.json'))['version'])")
check "apps/web/package.json" "$WEB_VERSION"

# apps/api/pyproject.toml
API_VERSION=$(python3 -c "
import re
with open('$REPO_ROOT/apps/api/pyproject.toml') as f:
    m = re.search(r'^version\s*=\s*\"(.+?)\"', f.read(), re.MULTILINE)
    print(m.group(1) if m else 'NOT_FOUND')
")
check "apps/api/pyproject.toml" "$API_VERSION"

# apps/api/app/main.py (FastAPI metadata)
FASTAPI_VERSION=$(python3 -c "
import re
with open('$REPO_ROOT/apps/api/app/main.py') as f:
    m = re.search(r'version=\"(.+?)\"', f.read())
    print(m.group(1) if m else 'NOT_FOUND')
")
check "apps/api/app/main.py (FastAPI)" "$FASTAPI_VERSION"

# All packages/*/package.json
for pkg_json in "$REPO_ROOT"/packages/*/package.json; do
  if [ -f "$pkg_json" ]; then
    rel_path="${pkg_json#$REPO_ROOT/}"
    pkg_version=$(python3 -c "import json; print(json.load(open('$pkg_json'))['version'])")
    check "$rel_path" "$pkg_version"
  fi
done

echo "---"

# ── Schema version: must have exactly one canonical source ──
# packages/schema/src/index.ts is the canonical SCHEMA_VERSION.
# apps/web must import it, not define its own constant.
SCHEMA_DEFS=$(grep -r "SCHEMA_VERSION\s*=\s*'" "$REPO_ROOT/packages/schema/src/index.ts" "$REPO_ROOT/apps/web/src/shared/types/schema.ts" 2>/dev/null | grep -v 'import\|from\|export {' || true)
SCHEMA_DEF_COUNT=$(echo "$SCHEMA_DEFS" | grep -c "SCHEMA_VERSION" 2>/dev/null || echo 0)
if [ "$SCHEMA_DEF_COUNT" -gt 1 ]; then
  echo "MISMATCH  Schema version: $SCHEMA_DEF_COUNT definitions found (expected 1 in packages/schema)"
  echo "          $SCHEMA_DEFS"
  ERRORS=$((ERRORS + 1))
elif [ "$SCHEMA_DEF_COUNT" -eq 1 ]; then
  SCHEMA_VER=$(echo "$SCHEMA_DEFS" | grep -oP "'\K[^']+" | head -1)
  echo "OK        Schema version: $SCHEMA_VER (single source in packages/schema)"
else
  echo "WARN      Schema version: no SCHEMA_VERSION definition found"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "FAIL: $ERRORS version mismatch(es) found."
  echo "All package versions must match root package.json ($EXPECTED)."
  echo "Schema version must have exactly one source in packages/schema."
  echo "See docs/design/VERSION_POLICY.md for the version alignment policy."
  exit 1
else
  echo "PASS: All versions aligned at $EXPECTED."
  exit 0
fi
