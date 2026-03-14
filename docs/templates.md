# Architecture Templates

Templates allow users to start from predefined architectures.

Templates are reusable architecture models.

---

## Template Structure

```
templates/
  three-tier.json
  serverless-api.json
  event-pipeline.json
```

---

## Example Template

**Three-tier architecture:**

```
Internet
  ↓
Load Balancer
  ↓
Application Server
  ↓
Database
```

---

## Template Metadata

```json
{
  "name": "Three-tier architecture",
  "category": "web",
  "difficulty": "basic"
}
```

---

## Built-in Templates

CloudBlocks includes templates for:

- Three-tier web architecture
- Serverless API
- Event-driven pipelines
- Microservices architecture

> **Note:** Example architectures are available in the [`examples/`](../examples/) directory.

---

## Community Templates

Templates may be shared via Git repositories.

**Example:**

```
github.com/cloudblocks/templates
```

---

## Future Template Marketplace

Possible template marketplace for:

- SaaS architectures
- AI pipelines
- Data platforms

---

> **Cross-references:**
> - Architecture model format: [model.md](./model.md)
> - Roadmap timeline: [ROADMAP.md](./ROADMAP.md)
