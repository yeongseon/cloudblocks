from __future__ import annotations

import difflib
import sys
import tempfile
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    _ = sys.path.insert(0, str(API_DIR))

from scripts.generate_models import (  # noqa: E402
    GENERATED_MODEL_PATH,
    SCHEMA_PATH,
    build_generated_source,
)


def main() -> int:
    expected = build_generated_source(SCHEMA_PATH)

    if not GENERATED_MODEL_PATH.exists():
        with tempfile.NamedTemporaryFile(
            "w", suffix=".py", delete=False, encoding="utf-8"
        ) as handle:
            temp_path = Path(handle.name)
            _ = handle.write(expected)
        print(f"Missing generated model file: {GENERATED_MODEL_PATH}")
        print(f"Reference regenerated output: {temp_path}")
        return 1

    current = GENERATED_MODEL_PATH.read_text(encoding="utf-8")
    if current == expected:
        return 0

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as handle:
        temp_path = Path(handle.name)
        _ = handle.write(expected)

    diff = difflib.unified_diff(
        current.splitlines(),
        expected.splitlines(),
        fromfile=str(GENERATED_MODEL_PATH),
        tofile=str(temp_path),
        lineterm="",
    )
    print("Schema drift detected between checked-in and regenerated models:")
    print("\n".join(diff))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
