# Use Templates

Templates are pre-built architecture patterns that provide a working starting point. Instead of building from scratch, you can load a template and customize it for your specific needs.

---

## Loading a Template

You can load a template in two ways:

1.  On the empty canvas, click **Use Template** from the initial call to action.
2.  Use the menu: **Build → Browse Templates**.

Once the Template Gallery opens, you can browse the available patterns. Click any template to see a preview of its architecture and description. Click **Use** to load the template into your workspace.

When a template loads, it creates a complete workspace with all containers, nodes, and connections pre-configured.

---

## Built-in Templates

CloudBlocks includes six built-in templates covering various use cases and difficulty levels:

### 1. Three-Tier Web Application

**Difficulty:** Beginner | **Category:** Web Application

This template implements the classic web architecture pattern. It features an Internet source connecting to an Application Gateway, which routes traffic to a Virtual Machine. The backend includes both a SQL Database and Blob Storage. The resources are organized into two pre-wired subnets.

### 2. Simple Compute Setup

**Difficulty:** Beginner | **Category:** Web Application

A minimal architecture designed for simple workloads. It connects the Internet to a Gateway, which then routes to an App Service. Everything is contained within a single subnet, making it an ideal starting point for learning the builder.

### 3. Data Storage Backend

**Difficulty:** Intermediate | **Category:** Data Pipeline

This pattern focuses on a backend-only setup where compute resources connect to multiple data stores. It includes an Internet source, an API Gateway, and an API Server. The architecture is split across two subnets: an App Subnet for compute and a Data Subnet for Database and File Storage resources.

### 4. Serverless HTTP API

**Difficulty:** Intermediate | **Category:** Serverless

A modern serverless pattern using managed services. It routes Internet traffic through an API Gateway to an HTTP Handler (Function). Data is persisted in Blob Storage and CosmosDB. This template demonstrates how to build scalable APIs without managing traditional servers.

### 5. Event-Driven Pipeline

**Difficulty:** Advanced | **Category:** Data Pipeline

This template represents a pure asynchronous processing pipeline. It features Event Sources and a Queue that trigger Processing Functions, which eventually store results in Data Lake Storage. Note that this architecture has no direct internet traffic and relies on timers and events to drive the flow.

### 6. Full-Stack Serverless with Event Processing

**Difficulty:** Advanced | **Category:** Serverless

The most complex built-in template, featuring 13 nodes and 11 connections. It combines a synchronous web frontend (Internet → API Gateway → Web Frontend + API Handler Function) with an asynchronous processing backend (Queue → Worker Function and Event → Batch Processor).

---

## Customizing Templates

Templates are fully editable. After loading one, you can modify it just like a workspace built from scratch:

- **Add resources**: Drag new components from the **Sidebar Palette** on the left.
- **Remove elements**: Select any node, container, or connection and press **Delete**.
- **Connect components**: Click an output port on a source node, then click an input port on a target node.
- **Rearrange**: Drag nodes and containers to change their position on the canvas.
- **Rename**: Click a node to select it, then edit its name in the **Inspector Panel** on the right.

---

## Choosing the Right Template

| If you need...                                  | Use this template          |
| :---------------------------------------------- | :------------------------- |
| A standard web app with a database              | Three-Tier Web Application |
| The simplest possible starting point            | Simple Compute Setup       |
| A backend with structured and unstructured data | Data Storage Backend       |
| A serverless API without server management      | Serverless HTTP API        |
| Asynchronous, event-driven processing           | Event-Driven Pipeline      |
| A complete production-ready serverless stack    | Full-Stack Serverless      |
