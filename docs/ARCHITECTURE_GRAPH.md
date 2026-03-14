# Architecture Graph Model

CloudBlocks represents infrastructure as a directed architecture graph.

This graph is derived from the CloudBlocks DSL and acts as the internal execution model for validation and code generation.

---

# Purpose

The architecture graph exists to provide a normalized structure for:

- topology validation
- dependency resolution
- infrastructure generation
- future deployment analysis

The graph is not the same as the visual layout.

The visual diagram is a user-facing projection.
The architecture graph is the canonical execution model.

---

# Graph Structure

The CloudBlocks architecture graph is composed of:

- nodes
- edges
- boundaries

---

## Nodes

Nodes represent deployable or structural entities.

Node types:

- plate
- block
- externalActor

Examples:

- VPC
- subnet
- compute
- database
- storage
- internet

---

## Edges

Edges represent directed communication or dependency flow.

In v0.1, the supported edge type is:

- dataflow

Example:

compute → database

---

## Boundaries

Boundaries represent containment relationships.

Examples:

- VPC contains subnets
- subnet contains blocks

These relationships are modeled separately from communication edges.

---

# Graph Layers

CloudBlocks graph model has two distinct layers.

### 1. Structural Layer

Represents containment and placement.

Examples:

- workspace → architecture
- architecture → plate
- plate → child plate
- plate → block

### 2. Flow Layer

Represents communication flow between blocks.

Examples:

- gateway → compute
- compute → database
- compute → storage

---

# Why Two Layers Matter

Containment and communication are different concepts.

Example:

A database may be placed inside a private subnet,
but it may receive traffic only from compute.

This means:

- placement belongs to the structural layer
- traffic belongs to the flow layer

Keeping these separate makes validation and generation easier.

---

# Graph Invariants

The architecture graph must satisfy structural, flow, and identity invariants to be considered valid.

> For the complete invariant specifications (identity rules, structural invariants, connection invariants), see [DOMAIN_MODEL.md](model/DOMAIN_MODEL.md) §2 (Model Invariants).

---

# Example Graph

Example architecture:

```
internet
→ gateway
→ compute
→ database

compute
→ storage
```

Structural representation:

```
- root plate
  - public subnet
    - gateway
  - private subnet
    - compute
    - database
    - storage
```

Flow representation:

```
- internet → gateway
- gateway → compute
- compute → database
- compute → storage
```

---

# Graph Construction

The architecture graph is constructed from the DSL model in the following order:

1. load workspace
2. load architecture
3. resolve structural nodes
4. resolve placements
5. resolve connections
6. validate graph invariants

---

# Graph Usage

The architecture graph is consumed by:

- rule engine
- generator pipeline
- future policy engine
- future diff engine

---

# Future Extensions

Planned graph extensions include:

- multiple edge types
- explicit dependency edges
- policy attachment points
- deployment environment overlays
- runtime metadata
