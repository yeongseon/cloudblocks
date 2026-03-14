"""CloudBlocks API - Scenario routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("/")
async def list_scenarios() -> dict:
    """List all available learning scenarios."""
    # TODO: Implement with CUBRID repository
    return {"scenarios": []}


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str) -> dict:
    """Get scenario by ID."""
    # TODO: Implement with CUBRID repository
    return {"id": scenario_id}


@router.post("/{scenario_id}/start")
async def start_scenario(scenario_id: str) -> dict:
    """Start a scenario and create workspace from template."""
    # TODO: Implement
    return {"message": "Not implemented"}
