from __future__ import annotations

from pathlib import Path

from datamodel_code_generator import (  # pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false
    DataModelType,
    InputFileType,
    PythonVersion,
    generate,
)

ROOT_DIR = Path(__file__).resolve().parents[3]
SCHEMA_PATH = ROOT_DIR / "packages/schema/dist/architecture-model.schema.json"
GENERATED_MODEL_PATH = ROOT_DIR / "apps/api/app/models/generated/architecture_model.py"
HEADER = "\n".join(
    [
        "# AUTO-GENERATED from packages/schema/dist/architecture-model.schema.json",
        "# DO NOT EDIT - re-run scripts/generate_models.py to update",
        "# pyright: reportUnannotatedClassAttribute=false, reportExplicitAny=false",
    ]
)


def build_generated_source(schema_path: Path) -> str:
    generated = generate(
        input_=schema_path,
        input_file_type=InputFileType.JsonSchema,
        output_model_type=DataModelType.PydanticV2BaseModel,
        target_python_version=PythonVersion.PY_310,
        disable_timestamp=True,
        enable_version_header=False,
        custom_file_header=HEADER,
    )
    if not isinstance(generated, str):
        raise RuntimeError("Failed to generate Pydantic models from JSON Schema.")
    if not generated.endswith("\n"):
        generated = f"{generated}\n"
    return generated


def write_generated_model(schema_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _ = output_path.write_text(build_generated_source(schema_path), encoding="utf-8")


def main() -> int:
    write_generated_model(SCHEMA_PATH, GENERATED_MODEL_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
