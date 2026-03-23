# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for CloudBlocks. ADRs capture significant architectural decisions along with their context and consequences.

## Index

| ADR                                                     | Title                                     | Status             | Date    |
| ------------------------------------------------------- | ----------------------------------------- | ------------------ | ------- |
| [0001](0001-architecture-model-as-source-of-truth.md)   | Architecture Model as Source of Truth     | Accepted           | 2025-01 |
| [0002](0002-git-native-storage.md)                      | Git-Native Storage Strategy               | Accepted           | 2025-01 |
| [0003](0003-lego-style-composition-model.md)            | Lego-Style Composition Model              | Superseded by 0012 | 2025-01 |
| [0004](0004-rule-engine-architecture.md)                | Rule Engine Architecture                  | Accepted           | 2025-01 |
| [0005](0005-2d-first-editor-with-25d-rendering.md)      | 2D-First Editor with 2.5D Rendering       | Accepted           | 2025-01 |
| [0006](0006-graph-ir-evolution-approach.md)             | Graph IR evolution approach               | Accepted           | 2026-03 |
| [0007](0007-multi-environment-deployment-strategy.md)   | Multi-Environment Deployment Strategy     | Accepted           | 2026-03 |
| [0008](0008-v2-universal-architecture-specification.md) | v2.0 Universal Architecture Specification | Accepted           | 2026-03 |
| [0009](0009-ai-assisted-architecture.md)                | AI-Assisted Architecture                  | Accepted           | 2026-03 |
| [0010](0010-svg-only-rendering-model.md)                | SVG-Only Rendering Model                  | Accepted           | 2026-03 |
| [0011](0011-dual-theme-system.md)                       | Dual Theme System — Professional and Lego | Accepted           | 2026-03 |
| [0012](0012-modular-surface-visual-language.md)         | Modular Surface Visual Language           | Accepted           | 2026-03 |

## ADR Template

When creating a new ADR, use the following structure:

```markdown
# ADR-NNNN: Title

**Status**: Proposed | Accepted | Superseded | Deprecated
**Date**: YYYY-MM

## Context

Why this decision was needed.

## Decision

What was decided.

## Consequences

Trade-offs and implications.
```

## Process

1. Copy the template above into a new file: `NNNN-short-description.md`
2. Fill in all sections
3. Set status to `Proposed`
4. Submit a PR for review
5. Once merged, update status to `Accepted`
