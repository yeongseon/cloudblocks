# Use Templates

Templates are pre-built architecture patterns that give you a working starting point. Instead of building from scratch, load a template, then customize it for your specific needs.

---

## Loading a Template

1. Open CloudBlocks
2. On the empty canvas, click **Use Template**
   - Or use the menu: **File → New Workspace**, then click **Use Template**
3. Browse the **Template Gallery**
4. Click a template to preview its description and architecture
5. Click **Use** to load it onto the canvas

The template creates a new workspace with all containers, nodes, and connections pre-configured.

---

## Built-in Templates

CloudBlocks ships with 6 built-in templates, organized by difficulty and use case:

### Three-Tier Web Application

**Difficulty:** Beginner · **Category:** Web Application

The classic web architecture pattern with three layers:

```
Internet → Gateway (Load Balancer) → Compute (App Server) → Database + Storage
```

Best for: Web applications, APIs with a database backend, traditional server-based apps.

---

### Simple Compute Setup

**Difficulty:** Beginner · **Category:** Compute

The simplest possible architecture — a single compute instance:

```
Compute (VM / App Service)
```

Best for: Learning CloudBlocks, quick prototyping, single-service deployments.

---

### Data Storage Backend

**Difficulty:** Beginner · **Category:** Data

A backend-focused architecture where compute connects to multiple data stores:

```
Compute → Database + Storage (in private subnet)
```

Best for: Data processing services, backend APIs, batch processing.

---

### Serverless HTTP API

**Difficulty:** Intermediate · **Category:** Serverless

A serverless API pattern using functions instead of traditional compute:

```
Gateway (API Gateway) → Function → Storage + Database
```

Best for: REST APIs, microservices, event-driven backends, cost-optimized workloads.

---

### Event-Driven Pipeline

**Difficulty:** Intermediate · **Category:** Event Processing

An asynchronous processing pipeline driven by events and queues:

```
Event → Function → Queue → Function → Storage
```

Best for: Data pipelines, stream processing, decoupled architectures, IoT backends.

---

### Full-Stack Serverless with Event Processing

**Difficulty:** Advanced · **Category:** Full Stack

A comprehensive architecture combining multiple patterns:

```
Gateway → Function (API) → Database + Storage
Event → Function (Worker) → Queue → Function (Processor)
```

Best for: Production applications, complex microservices, architectures that need both synchronous APIs and asynchronous processing.

---

## Customizing Templates

Templates are fully editable. After loading a template:

- **Add nodes** — Drag new resources from the Command Palette
- **Remove nodes** — Select a node and press Delete
- **Add connections** — Click a source node, then click a target node
- **Remove connections** — Select a connection and press Delete
- **Rearrange** — Drag nodes to reposition them
- **Add containers** — Insert new networks or subnets via the Insert menu
- **Rename** — Click any element and edit its name in the bottom panel

!!! tip "Templates as learning tools"
Load a template and examine how it's structured before building your own architecture. Notice the container layout, connection types, and node placement — these follow cloud best practices.

---

## Choosing the Right Template

| If you need...                            | Use this template          |
| ----------------------------------------- | -------------------------- |
| A standard web app with a database        | Three-Tier Web Application |
| The simplest possible starting point      | Simple Compute Setup       |
| A backend with database and storage       | Data Storage Backend       |
| A serverless API without managing servers | Serverless HTTP API        |
| Asynchronous event processing             | Event-Driven Pipeline      |
| A full production architecture            | Full-Stack Serverless      |

---

## What's Next?

| Goal                               | Guide                                            |
| ---------------------------------- | ------------------------------------------------ |
| Generate code from your template   | [Generate Code](generate-code.md)                |
| Build an architecture from scratch | [Create an Architecture](create-architecture.md) |
| Understand the building blocks     | [Core Concepts](core-concepts.md)                |
