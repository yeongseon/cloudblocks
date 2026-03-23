# FAQ

Answers to common questions about CloudBlocks.

---

## General

### What is CloudBlocks?

CloudBlocks is a visual cloud architecture builder that converts your designs into infrastructure-as-code. You design cloud infrastructure by placing nodes on containers, connect them, validate against real-world rules, and generate Terraform, Bicep, or Pulumi — all from the browser.

### Is CloudBlocks free?

Yes. CloudBlocks is open-source under the [Apache 2.0 license](https://github.com/yeongseon/cloudblocks/blob/main/LICENSE). You can use it for free, modify it, and contribute to it.

### Do I need a cloud account to use CloudBlocks?

No. CloudBlocks runs entirely in your browser. You don't need an Azure, AWS, or GCP account to design architectures and generate code. You only need a cloud account when you actually deploy the generated code.

### Does CloudBlocks deploy infrastructure?

No. CloudBlocks generates infrastructure-as-code files (Terraform, Bicep, Pulumi). You deploy the generated code using your preferred IaC tool and CI/CD pipeline. CloudBlocks is an architecture compiler, not a deployment tool.

---

## Architecture Design

### What cloud providers are supported?

CloudBlocks supports **Azure**, **AWS**, and **GCP**. Azure is the default provider with the most complete resource mappings. AWS and GCP support covers core resource categories.

### Can I mix resources from different cloud providers?

CloudBlocks allows it, but warns you. Mixed-provider architectures generate valid code for each provider, but real-world deployments typically use a single provider. The warning helps you catch accidental provider mixing.

### What are the 10 node categories?

Compute, Database, Storage, Gateway, Function, Queue, Event, Analytics, Identity, and Observability. See [Core Concepts](core-concepts.md) for details on each category.

### Why can't I connect from a database to a compute node?

CloudBlocks enforces an **initiator model** — only certain categories can be the source of a connection. Database, Storage, Analytics, Identity, and Observability nodes are receiver-only, reflecting real-world patterns where applications connect to databases, not the other way around. See [Core Concepts → Connections](core-concepts.md#connections) for the full rules.

---

## Code Generation

### What output formats are supported?

- **Terraform** (HCL) — Multi-cloud, industry standard
- **Bicep** — Azure-native
- **Pulumi** (TypeScript) — Code-first IaC

### Is the generated code production-ready?

Generated code follows cloud best practices and includes proper resource definitions, networking, and variable extraction (in production mode). However, you should review and customize it for your specific requirements — security policies, naming conventions, and organization-specific configurations.

### Will regenerating code produce different output?

No. Code generation is **deterministic** — the same architecture always produces the same code. Only actual changes to your architecture produce different output.

---

## Data and Storage

### Where is my architecture saved?

Your architecture is saved to your browser's **local storage**. It persists across browser sessions but is specific to your browser and device.

### Can I export my architecture?

Yes — you can export as infrastructure code (Terraform, Bicep, Pulumi) via the Code Preview panel. The architecture model itself is stored as JSON and can be pushed to GitHub if you connect the backend API.

### What happens if I clear my browser data?

Your saved workspaces will be lost. If you need to preserve your work across devices, use the GitHub integration (requires backend) or copy the generated code.

---

## Templates and Learning

### How many templates are available?

CloudBlocks includes **6 built-in templates**: Three-Tier Web Application, Simple Compute Setup, Data Storage Backend, Serverless HTTP API, Event-Driven Pipeline, and Full-Stack Serverless with Event Processing. See [Use Templates](templates.md) for details.

### Can I create my own templates?

Community template sharing is planned for a future release. Currently, you can save your architectures as workspaces and recreate patterns manually.

### What is Learning Mode?

Learning Mode provides guided, step-by-step tutorials that teach you cloud architecture patterns. Access it via the **Learn** menu or by clicking **Learn How** on the empty canvas.

---

## GitHub Integration

### Do I need a GitHub account?

No — GitHub integration is optional. The visual builder, code generation, and templates work without any account. GitHub features (repo sync, PR creation, architecture diff) require the backend API and GitHub OAuth login.

### How do I set up the backend?

See the [Getting Started guide](../guides/TUTORIALS.md) for backend setup instructions. The backend is a Python FastAPI application that handles GitHub OAuth, repository operations, and AI integration.

---

## Troubleshooting

### The canvas is empty and nothing loads

Try refreshing the page. If the issue persists, check your browser's developer console for errors. CloudBlocks requires a modern browser with JavaScript enabled.

### I can't place a node on the canvas

Nodes must be placed inside a container (Network or Subnet). Make sure you have at least one container on the canvas first. If starting fresh, click **Start from Scratch** to create a default network.

### My connections aren't working

Check that your source node is an **initiator** category (Compute, Gateway, Function, Queue, or Event). Receiver-only nodes (Database, Storage, Analytics, Identity, Observability) cannot be the source of a connection.

### Validation shows errors

Read the error message — it tells you exactly what's wrong. Common issues:

- Node placed outside a container
- Invalid connection source/target pair
- Missing required connections

---

## Getting Help

- [GitHub Issues](https://github.com/yeongseon/cloudblocks/issues) — Report bugs or request features
- [GitHub Discussions](https://github.com/yeongseon/cloudblocks/discussions) — Ask questions and share ideas
- [Live Demo](https://yeongseon.github.io/cloudblocks/) — Try CloudBlocks without installing anything
