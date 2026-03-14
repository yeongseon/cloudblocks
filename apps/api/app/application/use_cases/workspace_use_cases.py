"""CloudBlocks API - Workspace use cases."""


class CreateWorkspaceUseCase:
    """Create a new workspace for a user."""

    async def execute(self, owner_id: str, name: str, description: str | None = None) -> dict:
        """Execute the use case."""
        # TODO: Implement with workspace repository
        raise NotImplementedError


class ValidateArchitectureUseCase:
    """Validate a workspace's architecture against rules."""

    async def execute(self, workspace_id: str) -> dict:
        """Execute the use case."""
        # TODO: Implement with rule engine
        raise NotImplementedError
