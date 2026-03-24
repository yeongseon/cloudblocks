from __future__ import annotations

import json

BLOCK_CATEGORIES = (
    "compute",
    "database",
    "storage",
    "gateway",
    "function",
    "queue",
    "event",
    "analytics",
    "identity",
    "observability",
)

CONNECTION_TYPES = ("dataflow", "http", "internal", "data", "async")
PROVIDER_TYPES = ("aws", "azure", "gcp")
LAYER_TYPES = ("global", "edge", "region", "zone", "subnet")
SUBTYPE_REGISTRY: dict[str, dict[str, tuple[str, ...]]] = {
    "aws": {
        "compute": ("ec2", "ecs", "lambda"),
        "database": ("rds-postgres", "dynamodb", "elasticache"),
        "storage": ("s3",),
        "gateway": ("alb", "api-gateway", "nat-gateway"),
        "function": ("lambda",),
        "queue": ("sqs",),
        "event": ("sns", "eventbridge"),
        "analytics": ("kinesis", "redshift"),
        "identity": ("iam",),
        "observability": ("cloudwatch",),
    },
    "azure": {
        "compute": ("vm", "container-instances", "aks"),
        "database": ("sql-database", "cosmos-db", "cache-for-redis"),
        "storage": ("blob-storage",),
        "gateway": ("application-gateway", "api-management", "firewall"),
        "function": ("functions",),
        "queue": ("service-bus",),
        "event": ("event-grid", "event-hubs"),
        "analytics": ("synapse",),
        "identity": ("entra-id",),
        "observability": ("monitor",),
    },
    "gcp": {
        "compute": ("compute-engine", "cloud-run", "gke"),
        "database": ("cloud-sql-postgres", "cloud-spanner", "memorystore"),
        "storage": ("cloud-storage",),
        "gateway": ("cloud-load-balancing", "api-gateway", "cloud-armor"),
        "function": ("cloud-functions",),
        "queue": ("pub-sub",),
        "event": ("eventarc",),
        "analytics": ("bigquery", "dataflow"),
        "identity": ("cloud-iam",),
        "observability": ("cloud-monitoring",),
    },
}

EXAMPLE_THREE_TIER = {
    "plates": [
        {
            "id": "cb-1",
            "name": "Prod VPC",
            "type": "region",
            "parentId": None,
            "children": ["cb-2", "cb-3"],
            "position": {"x": 0, "y": 0, "z": 0},
            "size": {"width": 30, "height": 1, "depth": 20},
        },
        {
            "id": "cb-2",
            "name": "Public Subnet",
            "type": "subnet",
            "subnetAccess": "public",
            "parentId": "cb-1",
            "children": ["block-1"],
            "position": {"x": 2, "y": 0, "z": 2},
            "size": {"width": 12, "height": 1, "depth": 16},
        },
        {
            "id": "cb-3",
            "name": "Private Subnet",
            "type": "subnet",
            "subnetAccess": "private",
            "parentId": "cb-1",
            "children": ["block-2", "block-3"],
            "position": {"x": 16, "y": 0, "z": 2},
            "size": {"width": 12, "height": 1, "depth": 16},
        },
    ],
    "blocks": [
        {
            "id": "block-1",
            "name": "Web ALB",
            "category": "gateway",
            "placementId": "cb-2",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "alb",
        },
        {
            "id": "block-2",
            "name": "App ECS",
            "category": "compute",
            "placementId": "cb-3",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "ecs",
        },
        {
            "id": "block-3",
            "name": "App DB",
            "category": "database",
            "placementId": "cb-3",
            "position": {"x": 6, "y": 0, "z": 6},
            "provider": "aws",
            "subtype": "rds-postgres",
        },
        {
            "id": "block-4",
            "name": "Assets",
            "category": "storage",
            "placementId": "cb-3",
            "position": {"x": 6, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "s3",
        },
    ],
    "connections": [
        {
            "id": "conn-1",
            "sourceId": "block-1",
            "targetId": "block-2",
            "type": "http",
        },
        {
            "id": "conn-2",
            "sourceId": "block-2",
            "targetId": "block-3",
            "type": "data",
        },
        {
            "id": "conn-3",
            "sourceId": "block-2",
            "targetId": "block-4",
            "type": "dataflow",
        },
    ],
    "externalActors": [
        {
            "id": "actor-1",
            "name": "Internet",
            "type": "internet",
            "position": {"x": -5, "y": 0, "z": 2},
        }
    ],
}

EXAMPLE_SERVERLESS_EVENT = {
    "plates": [
        {
            "id": "cb-10",
            "name": "Serverless Region",
            "type": "region",
            "parentId": None,
            "children": ["cb-11"],
            "position": {"x": 0, "y": 0, "z": 0},
            "size": {"width": 25, "height": 1, "depth": 15},
        },
        {
            "id": "cb-11",
            "name": "App Subnet",
            "type": "subnet",
            "subnetAccess": "private",
            "parentId": "cb-10",
            "children": [
                "block-10",
                "block-11",
                "block-12",
                "block-13",
                "block-14",
            ],
            "position": {"x": 2, "y": 0, "z": 2},
            "size": {"width": 21, "height": 1, "depth": 11},
        },
    ],
    "blocks": [
        {
            "id": "block-10",
            "name": "Public API",
            "category": "gateway",
            "placementId": "cb-11",
            "position": {"x": 2, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "api-gateway",
        },
        {
            "id": "block-11",
            "name": "Ingest Function",
            "category": "function",
            "placementId": "cb-11",
            "position": {"x": 6, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "lambda",
        },
        {
            "id": "block-12",
            "name": "Work Queue",
            "category": "queue",
            "placementId": "cb-11",
            "position": {"x": 10, "y": 0, "z": 2},
            "provider": "aws",
            "subtype": "sqs",
        },
        {
            "id": "block-13",
            "name": "Worker Function",
            "category": "function",
            "placementId": "cb-11",
            "position": {"x": 6, "y": 0, "z": 6},
            "provider": "aws",
            "subtype": "lambda",
        },
        {
            "id": "block-14",
            "name": "Event Store",
            "category": "database",
            "placementId": "cb-11",
            "position": {"x": 10, "y": 0, "z": 6},
            "provider": "aws",
            "subtype": "dynamodb",
        },
    ],
    "connections": [
        {
            "id": "conn-10",
            "sourceId": "block-10",
            "targetId": "block-11",
            "type": "http",
        },
        {
            "id": "conn-11",
            "sourceId": "block-11",
            "targetId": "block-12",
            "type": "async",
        },
        {
            "id": "conn-12",
            "sourceId": "block-12",
            "targetId": "block-13",
            "type": "async",
        },
        {
            "id": "conn-13",
            "sourceId": "block-13",
            "targetId": "block-14",
            "type": "data",
        },
    ],
    "externalActors": [
        {
            "id": "actor-10",
            "name": "Internet",
            "type": "internet",
            "position": {"x": -5, "y": 0, "z": 2},
        }
    ],
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
    for registry_provider in PROVIDER_TYPES:
        lines.append(get_provider_subtypes(registry_provider))
    return "\n".join(lines)


def build_architecture_prompt(provider: str) -> str:
    provider_subtypes = get_provider_subtypes(provider)
    all_provider_subtypes = _all_provider_subtypes()
    example_one_json = json.dumps(EXAMPLE_THREE_TIER, indent=2)
    example_two_json = json.dumps(EXAMPLE_SERVERLESS_EVENT, indent=2)

    return f"""You are a CloudBlocks architecture model generator.

Return ONLY valid JSON for an ArchitectureModel object. No markdown, no prose, no comments.

Output JSON Schema (required shape):
{{
  "type": "object",
  "required": ["plates", "blocks", "connections", "externalActors"],
  "properties": {{
    "plates": {{
      "type": "array",
      "description": "infrastructure layer boundaries (region, zone, subnet, etc.)",
      "items": {{
        "type": "object",
        "required": ["id", "name", "type", "parentId", "children", "position", "size"],
        "properties": {{
          "id": {{"type": "string"}},
          "name": {{"type": "string"}},
          "type": {{"type": "string", "enum": ["global", "edge", "region", "zone", "subnet"]}},
          "subnetAccess": {{"type": "string", "enum": ["public", "private"]}},
          "parentId": {{"type": ["string", "null"]}},
          "children": {{"type": "array", "items": {{"type": "string"}}}},
          "position": {{
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {{
              "x": {{"type": "number"}},
              "y": {{"type": "number"}},
              "z": {{"type": "number"}}
            }}
          }},
          "size": {{
            "type": "object",
            "required": ["width", "height", "depth"],
            "properties": {{
              "width": {{"type": "number"}},
              "height": {{"type": "number"}},
              "depth": {{"type": "number"}}
            }}
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
          "category": {{
            "type": "string",
            "enum": [
              "compute",
              "database",
              "storage",
              "gateway",
              "function",
              "queue",
              "event",
              "analytics",
              "identity",
              "observability"
            ]
          }},
          "placementId": {{"type": "string"}},
          "position": {{
            "type": "object",
            "required": ["x", "y", "z"],
            "properties": {{
              "x": {{"type": "number"}},
              "y": {{"type": "number"}},
              "z": {{"type": "number"}}
            }}
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
            "properties": {{
              "x": {{"type": "number"}},
              "y": {{"type": "number"}},
              "z": {{"type": "number"}}
            }}
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
- LayerType: {', '.join(LAYER_TYPES)}

{all_provider_subtypes}

Provider focus for this request:
{provider_subtypes}

Placement Rules:
- Every block's placementId MUST reference an existing container block id.
- Root container blocks (global, edge) have parentId: null.
- Layer nesting follows a strict hierarchy: global > edge > region > zone > subnet > resource.
- Valid parent types:
  - region container blocks can be children of global or edge container blocks, or have no parent.
  - zone container blocks must be inside a region container block.
  - subnet container blocks must be inside a zone or region container block.
- Blocks (resources) must be placed on a subnet or higher-level container block.
- Region container blocks should contain at least one subnet.

Connection Rules:
- sourceId and targetId must reference existing block ids or external actor ids.
- No self-connections.
- No duplicate connections.

Position and layout guidance:
- All positions and sizes use integer CU (Cloud Unit) values.
- Use grid-based positions with x and z increments of 1 CU.
- Block spacing: 1 CU between blocks. Container block padding: 2 CU.
- Container blocks should be large enough to contain their blocks with 2 CU padding on each side.
- Example container block size: {{"width": 25, "height": 1, "depth": 15}}.
- Block positions are relative to parent container block
  and should start at {{"x": 2, "y": 0, "z": 2}} (2 CU padding).

Negative instructions:
- Do NOT generate subtypes that are not in the SubtypeRegistry.
- Do NOT create blocks without a valid placementId.
- Do NOT use 'name' as an ID — generate unique IDs like 'cb-1', 'block-compute-1'.
- Always include at least one region container block with at least one subnet.

Few-shot example 1 (three-tier web app):
{example_one_json}

Few-shot example 2 (serverless event-driven):
{example_two_json}
"""
