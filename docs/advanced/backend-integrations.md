# Backend Integrations

> **Audience**: Advanced users / Contributors | **Status**: Not in V1 Core | **Verified against**: v0.26.0

!!! note "Optional for V1"
CloudBlocks V1 is a frontend-only tool. The backend is optional and provides additional features like GitHub sync and AI assistance. These features are not part of the V1 Core experience.

The CloudBlocks backend is a FastAPI application that enables additional features beyond the core visual builder.

---

## Backend Features

| Feature                   | Description                                                |
| :------------------------ | :--------------------------------------------------------- |
| **GitHub OAuth**          | Log in with your GitHub account                            |
| **Workspace Sync**        | Sync architectures to a GitHub repository                  |
| **Pull Request Creation** | Generate PRs from architecture changes                     |
| **AI Assistance**         | Natural language architecture generation (Experimental)    |
| **Cost Estimation**       | Estimated cloud costs for your architecture (Experimental) |

---

## Setup

```bash
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The backend starts at `http://localhost:8000`. The frontend will automatically detect and connect to it.

For detailed setup instructions, see [Tutorials](../guides/TUTORIALS.md).

---

## What's Next?

| Goal               | Guide                                 |
| :----------------- | :------------------------------------ |
| Full setup guide   | [Tutorials](../guides/TUTORIALS.md)   |
| Deployment options | [Deployment](../guides/DEPLOYMENT.md) |
| REST API reference | [API Spec](../api/API_SPEC.md)        |
