from __future__ import annotations

BLOCK_CATEGORIES = (
    "compute",
    "database",
    "storage",
    "gateway",
    "function",
    "queue",
    "event",
    "timer",
)

CONNECTION_TYPES = ("dataflow", "http", "internal", "data", "async")
PROVIDER_TYPES = ("aws", "azure", "gcp")

SUBTYPE_REGISTRY: dict[str, dict[str, tuple[str, ...]]] = {
    "aws": {
        "compute": ("ec2", "ecs", "lambda"),
        "database": ("rds-postgres", "dynamodb"),
        "storage": ("s3",),
        "gateway": ("alb", "api-gateway"),
    },
    "azure": {
        "compute": ("vm", "container-instances", "functions"),
        "database": ("sql-database", "cosmos-db"),
        "storage": ("blob-storage",),
        "gateway": ("application-gateway", "api-management"),
    },
    "gcp": {
        "compute": ("compute-engine", "cloud-run", "cloud-functions"),
        "database": ("cloud-sql-postgres", "firestore"),
        "storage": ("cloud-storage",),
        "gateway": ("cloud-load-balancing", "api-gateway"),
    },
}


def get_provider_subtypes(provider: str) -> str:
    normalized = provider.lower()
    if normalized not in SUBTYPE_REGISTRY:
        raise ValueError(f"Unknown provider: {provider}")

    lines = [f"{normalized.upper()} Subtypes:"]
    for category, subtypes in SUBTYPE_REGISTRY[normalized].items():
        lines.append(f"- {category}: {', '.join(subtypes)}")
    return "\n".join(lines)


def _all_provider_subtypes() -> str:
    lines = ["SubtypeRegistry (exact allowed values):"]
    for provider in PROVIDER_TYPES:
        lines.append(get_provider_subtypes(provider))
    return "\n".join(lines)


def build_architecture_prompt(provider: str) -> str:
    provider_subtypes = get_provider_subtypes(provider)
    all_provider_subtypes = _all_provider_subtypes()

    return f"""You are a CloudBlocks architecture model generator.

Return ONLY valid JSON for an ArchitectureModel object. No markdown, no prose, no comments.

Output JSON Schema (required shape):
{{
  "type": "object",
  "required": ["plates", "blocks", "connections", "externalActors"],
  "properties": {{
    "plates": {{
      "type": "array",
      "description": "network boundaries",
      "items": {{
        "type": "object",
        "required": ["id", "name", "type", "parentId", "children", "position", "size"],
        "properties": {{
          "id": {{"type": "string"}},
          "name": {{"type": "string"}},
          "type": {{"type": "string", "enum": ["network", "subnet"]}},
          "subnetAccess": {{"type": "string", "enum": ["public", "private"]}},
          "parentId": {{"type": ["string", "null"]}},
          "children": {{"type": "array", "items": {{"type": "string"}}}},
          "position": {{
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {{"x": {{"type": "number"}}, "y": {{"type": "number"}}, "z": {{"type": "number"}}}}
          }},
          "size": {{
            "type": "object",
            "required": ["width", "height", "depth"],
            "properties": {{"width": {{"type": "number"}}, "height": {{"type": "number"}}, "depth": {{"type": "number"}}}}
          }}
        }}
      }}
    }},
    "blocks": {{
      "type": "array",
      "description": "cloud resources",
      "items": {{
        "type": "object",
        "required": ["id", "name", "category", "placementId", "position", "provider", "subtype"],
        "properties": {{
          "id": {{"type": "string"}},
          "name": {{"type": "string"}},
          "category": {{"type": "string", "enum": ["compute", "database", "storage", "gateway", "function", "queue", "event", "timer"]}},
          "placementId": {{"type": "string"}},
          "position": {{
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {{"x": {{"type": "number"}}, "y": {{"type": "number"}}, "z": {{"type": "number"}}}}
          }},
          "provider": {{"type": "string", "enum": ["aws", "azure", "gcp"]}},
          "subtype": {{"type": "string"}},
          "config": {{"type": "object"}}
        }}
      }}
    }},
    "connections": {{
      "type": "array",
      "items": {{
        "type": "object",
        "required": ["id", "sourceId", "targetId", "type"],
        "properties": {{
          "id": {{"type": "string"}},
          "sourceId": {{"type": "string"}},
          "targetId": {{"type": "string"}},
          "type": {{"type": "string", "enum": ["dataflow", "http", "internal", "data", "async"]}}
        }}
      }}
    }},
    "externalActors": {{
      "type": "array",
      "items": {{
        "type": "object",
        "required": ["id", "name", "type", "position"],
        "properties": {{
          "id": {{"type": "string"}},
          "name": {{"type": "string"}},
          "type": {{"type": "string", "enum": ["internet"]}},
          "position": {{
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {{"x": {{"type": "number"}}, "y": {{"type": "number"}}, "z": {{"type": "number"}}}}
          }}
        }}
      }}
    }}
  }}
}}

Valid Enums:
- BlockCategory: {", ".join(BLOCK_CATEGORIES)}
- ConnectionType: {", ".join(CONNECTION_TYPES)}
- ProviderType: {", ".join(PROVIDER_TYPES)}

{all_provider_subtypes}

Provider focus for this request:
{provider_subtypes}

Placement Rules:
- Every block's placementId MUST reference an existing plate id.
- Root plates have parentId: null.
- Subnet plates have parentId referencing a network plate.
- Network plates must contain at least one subnet.

Connection Rules:
- sourceId and targetId must reference existing block ids or external actor ids.
- No self-connections.
- No duplicate connections.

Position and layout guidance:
- Use grid-based positions with x increments of 200 and z increments of 200.
- Plates should be large enough to contain their blocks.
- Example plate size: {{"width": 800, "height": 10, "depth": 600}}.
- Block positions are relative to parent plate and can start at {{"x": 50, "y": 0, "z": 50}}.

Negative instructions:
- Do NOT generate subtypes that are not in the SubtypeRegistry.
- Do NOT create blocks without a valid placementId.
- Do NOT use 'name' as an ID — generate unique IDs like 'plate-1', 'block-compute-1'.
- Always include at least one network plate with at least one subnet.

Few-shot example 1 (three-tier web app):
{{
  "plates": [
    {{"id": "plate-1", "name": "Prod VPC", "type": "network", "parentId": null, "children": ["plate-2", "plate-3"], "position": {{"x": 0, "y": 0, "z": 0}}, "size": {{"width": 1000, "height": 10, "depth": 700}}}},
    {{"id": "plate-2", "name": "Public Subnet", "type": "subnet", "subnetAccess": "public", "parentId": "plate-1", "children": ["block-1"], "position": {{"x": 100, "y": 0, "z": 100}}, "size": {{"width": 400, "height": 10, "depth": 500}}}},
    {{"id": "plate-3", "name": "Private Subnet", "type": "subnet", "subnetAccess": "private", "parentId": "plate-1", "children": ["block-2", "block-3"], "position": {{"x": 600, "y": 0, "z": 100}}, "size": {{"width": 350, "height": 10, "depth": 500}}}}
  ],
  "blocks": [
    {{"id": "block-1", "name": "Web ALB", "category": "gateway", "placementId": "plate-2", "position": {{"x": 50, "y": 0, "z": 50}}, "provider": "aws", "subtype": "alb"}},
    {{"id": "block-2", "name": "App ECS", "category": "compute", "placementId": "plate-3", "position": {{"x": 50, "y": 0, "z": 50}}, "provider": "aws", "subtype": "ecs"}},
    {{"id": "block-3", "name": "App DB", "category": "database", "placementId": "plate-3", "position": {{"x": 250, "y": 0, "z": 250}}, "provider": "aws", "subtype": "rds-postgres"}},
    {{"id": "block-4", "name": "Assets", "category": "storage", "placementId": "plate-3", "position": {{"x": 250, "y": 0, "z": 50}}, "provider": "aws", "subtype": "s3"}}
  ],
  "connections": [
    {{"id": "conn-1", "sourceId": "block-1", "targetId": "block-2", "type": "http"}},
    {{"id": "conn-2", "sourceId": "block-2", "targetId": "block-3", "type": "data"}},
    {{"id": "conn-3", "sourceId": "block-2", "targetId": "block-4", "type": "dataflow"}}
  ],
  "externalActors": [
    {{"id": "actor-1", "name": "Internet", "type": "internet", "position": {{"x": -200, "y": 0, "z": 100}}}}
  ]
}}

Few-shot example 2 (serverless event-driven):
{{
  "plates": [
    {{"id": "plate-10", "name": "Serverless Network", "type": "network", "parentId": null, "children": ["plate-11"], "position": {{"x": 0, "y": 0, "z": 0}}, "size": {{"width": 900, "height": 10, "depth": 600}}}},
    {{"id": "plate-11", "name": "App Subnet", "type": "subnet", "subnetAccess": "private", "parentId": "plate-10", "children": ["block-10", "block-11", "block-12", "block-13", "block-14"], "position": {{"x": 100, "y": 0, "z": 100}}, "size": {{"width": 700, "height": 10, "depth": 400}}}}
  ],
  "blocks": [
    {{"id": "block-10", "name": "Public API", "category": "gateway", "placementId": "plate-11", "position": {{"x": 50, "y": 0, "z": 50}}, "provider": "aws", "subtype": "api-gateway"}},
    {{"id": "block-11", "name": "Ingest Function", "category": "function", "placementId": "plate-11", "position": {{"x": 250, "y": 0, "z": 50}}, "provider": "aws", "subtype": "lambda"}},
    {{"id": "block-12", "name": "Work Queue", "category": "queue", "placementId": "plate-11", "position": {{"x": 450, "y": 0, "z": 50}}, "provider": "aws", "subtype": "dynamodb"}},
    {{"id": "block-13", "name": "Worker Function", "category": "function", "placementId": "plate-11", "position": {{"x": 250, "y": 0, "z": 250}}, "provider": "aws", "subtype": "lambda"}},
    {{"id": "block-14", "name": "Event Store", "category": "database", "placementId": "plate-11", "position": {{"x": 450, "y": 0, "z": 250}}, "provider": "aws", "subtype": "dynamodb"}}
  ],
  "connections": [
    {{"id": "conn-10", "sourceId": "block-10", "targetId": "block-11", "type": "http"}},
    {{"id": "conn-11", "sourceId": "block-11", "targetId": "block-12", "type": "async"}},
    {{"id": "conn-12", "sourceId": "block-12", "targetId": "block-13", "type": "async"}},
    {{"id": "conn-13", "sourceId": "block-13", "targetId": "block-14", "type": "data"}}
  ],
  "externalActors": [
    {{"id": "actor-10", "name": "Internet", "type": "internet", "position": {{"x": -200, "y": 0, "z": 50}}}}
  ]
}}
"""
