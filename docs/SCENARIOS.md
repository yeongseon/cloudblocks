# CloudBlocks - Learning Scenarios

## Overview

CloudBlocks provides **scenario-based learning** where users build real-world cloud architectures step-by-step. Each scenario teaches specific cloud concepts through hands-on practice with the 3D block builder.

## Scenario Structure

Each scenario includes:

1. **Objective**: What the user will build
2. **Prerequisites**: Required knowledge
3. **Template**: Starting workspace state
4. **Steps**: Guided instructions
5. **Validation**: Rule engine checks the solution
6. **Solution**: Reference architecture

## Built-in Scenarios

### Beginner

#### 1. Hello Cloud (three-tier-web-app)

**Objective**: Build a basic 3-tier web application architecture.

**Teaches**:
- Network/Subnet plate concepts
- Public vs Private subnet distinction
- Block placement rules
- DataFlow connections

**Steps**:
1. Create a Network (VNet) plate
2. Add a Public Subnet plate inside the network
3. Add a Private Subnet plate inside the network
4. Place a Gateway block on the Public Subnet
5. Place a Compute block on the Public Subnet
6. Place a Database block on the Private Subnet
7. Connect Internet → Gateway → Compute → Database
8. Validate the architecture

**Solution Architecture**:
```
Internet → [Public Subnet: Gateway → Compute] → [Private Subnet: Database]
```

#### 2. Static Website

**Objective**: Build a static website with CDN and storage.

**Teaches**:
- Storage block usage
- Gateway as CDN entry point
- Simple two-tier architecture

### Intermediate

#### 3. Microservices Architecture

**Objective**: Build a microservices architecture with multiple compute instances.

**Teaches**:
- Multiple compute blocks
- Service-to-service communication
- Shared database patterns

#### 4. Event-Driven Pipeline

**Objective**: Build an event-driven data processing pipeline.

**Teaches**:
- Storage as event source
- Compute as processor
- Database as sink
- Multi-hop data flows

### Advanced

#### 5. High-Availability Architecture

**Objective**: Build a multi-subnet HA architecture.

**Teaches**:
- Redundant compute instances
- Multiple subnets
- Complex connection patterns

#### 6. CUBRID Reference Architecture

**Objective**: Build a production CUBRID deployment architecture.

**Teaches**:
- CUBRID-specific deployment patterns
- HA configuration
- Backup and monitoring

## Scenario File Format

```json
{
  "id": "scenario-three-tier",
  "title": "Hello Cloud: 3-Tier Web App",
  "description": "Build your first cloud architecture",
  "difficulty": "beginner",
  "category": "web-application",
  "estimatedMinutes": 15,
  "prerequisites": [],
  "template": {
    "architecture": {
      "plates": [],
      "blocks": [],
      "connections": [],
      "externalActors": [
        { "id": "ext-internet", "name": "Internet", "type": "internet" }
      ]
    }
  },
  "steps": [
    {
      "order": 1,
      "instruction": "Create a Network (VNet) plate as the foundation",
      "hint": "Click the 'Network' button in the toolbar",
      "validation": {
        "check": "plates.some(p => p.type === 'network')"
      }
    }
  ],
  "solution": { ... },
  "tags": ["networking", "three-tier", "beginner"]
}
```

## Scoring

- **Correctness**: All validation rules pass (60%)
- **Completeness**: All required components present (30%)
- **Naming**: Meaningful names for components (10%)

## Adding Custom Scenarios

Place scenario JSON files in `packages/scenario-library/scenarios/`:

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
│       └── cubrid-reference.json
└── index.ts
```
