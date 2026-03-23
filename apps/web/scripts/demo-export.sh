#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$WEB_DIR/test-results/e2e"
OUTPUT_DIR="$WEB_DIR/docs/demo"

if ! command -v ffmpeg &>/dev/null; then
  echo "ERROR: ffmpeg is required for video export. Install via: brew install ffmpeg"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

WEBM_FILES=("$RESULTS_DIR"/**/*.webm)
if [ ${#WEBM_FILES[@]} -eq 0 ]; then
  echo "No .webm files found in $RESULTS_DIR. Run 'pnpm demo:record' first."
  exit 1
fi

for webm in "${WEBM_FILES[@]}"; do
  basename="$(basename "$webm" .webm)"
  echo "==> Converting $basename.webm -> $basename.mp4"
  ffmpeg -y -i "$webm" -c:v libx264 -preset fast -crf 23 "$OUTPUT_DIR/$basename.mp4"
done

echo "==> Exported ${#WEBM_FILES[@]} video(s) to $OUTPUT_DIR/"
