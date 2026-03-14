"""CloudBlocks API - Template routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/")
async def list_templates() -> dict:
    """List all available architecture templates."""
    # TODO: Implement with GitHub template repository
    return {"templates": []}


@router.get("/{template_id}")
async def get_template(template_id: str) -> dict:
    """Get template by ID."""
    # TODO: Implement with GitHub template repository
    return {"id": template_id}


@router.post("/{template_id}/instantiate")
async def instantiate_template(template_id: str) -> dict:
    """Create a new workspace from a template."""
    # TODO: Implement
    return {"message": "Not implemented"}
