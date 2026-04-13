# CloudBlocks — Tutorials

> **Audience**: Contributors | **Status**: Stable — Internal | **Verified against**: v0.43.0

## Overview

CloudBlocks tutorials guide you through building real-world cloud architectures and generating infrastructure code. Each tutorial teaches specific concepts through hands-on practice with the 2.5D isometric builder.

## Tutorial Structure

Each tutorial includes:

1. **Objective**: What you will build
2. **Prerequisites**: Required knowledge
3. **Steps**: Step-by-step instructions
4. **Validation**: Rule engine checks your solution
5. **Generated Code**: See the Terraform/Bicep output

---

## Getting Started

### Tutorial 1: Hello Cloud — Build a 3-Tier Web App

**Objective**: Build a basic 3-tier web application architecture.

**You'll learn**:

- Network/Subnet container block concepts
- Public vs Private subnet distinction
- Block placement rules
- DataFlow connections

**Steps**:

1. Create a Network (VNet) container block as the foundation
2. Add a Public Subnet container block inside the network
3. Add a Private Subnet container block inside the network
4. Place a Gateway block on the Public Subnet
5. Place a Compute block on the Private Subnet
6. Place a Database block on the Private Subnet
7. Connect Internet → Gateway → Compute → Database
8. Validate the architecture

**Result**:

```
Internet → [Public Subnet: Gateway] → [Private Subnet: Compute → Database]
```

**Generated Terraform**:

```hcl
resource "azurerm_virtual_network" "main" {
  name                = "vnet-main"
  address_space       = ["10.0.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_subnet" "public" {
  name                 = "subnet-public"
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "private" {
  name                 = "subnet-private"
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}
```

---

### Tutorial 2: Static Website

**Objective**: Build a static website with CDN and storage.

**You'll learn**:

- Storage block usage
- Gateway as CDN entry point
- Simple two-tier architecture

**Result**:

```
Internet → [Public Subnet: Gateway] → [Private Subnet: Compute → Storage]
```

---

## Intermediate

### Tutorial 3: Microservices Architecture

**Objective**: Build a microservices architecture with multiple compute instances.

**You'll learn**:

- Multiple compute blocks
- Service-to-service communication
- Shared database patterns

**Result**:

```
Internet → Gateway → [Compute-A, Compute-B] → Database
```

---

### Tutorial 4: Event-Driven Pipeline

**Objective**: Build an event-driven data processing pipeline.

**You'll learn**:

- Storage as event source
- Compute as processor
- Database as sink
- Multi-hop data flows

**Result**:

```
Internet → Gateway → Compute → Storage → (event-driven processing coming soon)
```

> **Note**: Storage and Database are currently receiver-only. The `Storage → Compute` event-driven pattern requires the `EventFlow` connection type (coming soon). For now, model this as `Compute → Storage` (polling pattern).

**Alternative architecture using current features:**

```
Internet → Gateway → Compute → Storage
                      ↓
                   Compute → Database
```

---

## Advanced

### Tutorial 5: High-Availability Architecture

**Objective**: Build a multi-subnet HA architecture with redundancy.

**You'll learn**:

- Redundant compute instances
- Multiple subnets
- Complex connection patterns

---

### Tutorial 6: Serverless API

**Objective**: Build a serverless API with functions and queues.

**You'll learn**:

- Function block usage
- Queue block for async processing
- EventFlow connection type

**Result**:

```
HTTP → Function → Queue → Function → Database
```

---

## Tutorial File Format

Tutorials are defined as JSON files for programmatic use:

```json
{
  "id": "tutorial-three-tier",
  "title": "Hello Cloud: 3-Tier Web App",
  "description": "Build your first cloud architecture and generate Terraform code",
  "difficulty": "beginner",
  "category": "web-application",
  "estimatedMinutes": 15,
  "prerequisites": [],
  "template": {
    "architecture": {
      "nodes": [],
      "blocks": [],
      "connections": [],
      "externalActors": [{ "id": "ext-internet", "name": "Internet", "type": "internet" }]
    }
  },
  "steps": [
    {
      "order": 1,
      "instruction": "Create a Network (VNet) container block as the foundation",
      "hint": "Click the 'Network' button in the block palette",
      "validation": {
        "check": "nodes.some(n => n.kind === 'container' && n.resourceType === 'virtual_network')"
      }
    }
  ],
  "tags": ["networking", "three-tier", "beginner", "terraform"]
}
```

## Adding Community Tutorials

> **Note**: Community tutorial contributions are planned for a future release. The directory structure below shows the intended organization.

Tutorial scenarios will live in a dedicated package:

```
packages/scenario-library/
├── scenarios/
│   ├── beginner/
│   │   ├── three-tier-web-app.json
│   │   └── static-website.json
│   ├── intermediate/
│   │   ├── microservices.json
│   │   └── event-driven.json
│   └── advanced/
│       ├── high-availability.json
│       └── serverless-api.json
└── index.ts
```

Community contributions are welcome! See [CONTRIBUTING.md](../contributing.md) for guidelines on adding new tutorials.
