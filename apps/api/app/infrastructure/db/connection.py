"""CloudBlocks API - Database connection for minimal metadata store.

This module provides a lightweight connection layer for the metadata database.
CloudBlocks uses a Git-native architecture where GitHub repos serve as the
primary data store. This database only stores minimal metadata:
  - User / identity records
  - Workspace index (pointers to GitHub repos)
  - Generation run status
  - Audit summary
"""


class MetadataDB:
    """Connection manager for the minimal metadata database.

    Uses SQLite for local development and Supabase (PostgreSQL) for production.
    This is intentionally thin — most data lives in GitHub repos.
    """

    def __init__(self, database_url: str = "sqlite:///cloudblocks.db") -> None:
        self.database_url = database_url
        self._connected = False

    async def connect(self) -> None:
        """Initialize the database connection."""
        # TODO: Implement with aiosqlite (dev) or asyncpg (prod)
        self._connected = True

    async def disconnect(self) -> None:
        """Close the database connection."""
        # TODO: Implement
        self._connected = False

    async def execute(self, query: str, params: tuple = ()) -> list:
        """Execute a SQL query and return results."""
        # TODO: Implement
        raise NotImplementedError

    async def execute_one(self, query: str, params: tuple = ()) -> dict | None:
        """Execute a SQL query and return first result."""
        # TODO: Implement
        raise NotImplementedError
