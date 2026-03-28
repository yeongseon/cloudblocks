# CloudBlocks Compatibility & Migration Policy

> **Audience**: All Users | **Status**: Stable — V1 Core | **Verified against**: v0.26.0

This document defines how CloudBlocks handles versioning, backward compatibility, and data migration. Compatibility guarantees are scoped to **blessed (built-in) templates and the Terraform starter export flow**. Experimental features (Bicep, Pulumi) and custom blank-canvas architectures may change without a major version bump.

## Versioning

CloudBlocks follows [Semantic Versioning](https://semver.org/) starting from v1.0.0:

- **Major** (v2.0.0): Breaking changes to workspace format, UI patterns, or feature removal
- **Minor** (v1.1.0): New features, backward-compatible enhancements
- **Patch** (v1.0.1): Bug fixes only

Pre-1.0 versions (v0.x) do not carry compatibility guarantees.

## Scope of Guarantees

| Scope         | Covered                            | Not Covered                                     |
| ------------- | ---------------------------------- | ----------------------------------------------- |
| **Templates** | All 6 built-in (blessed) templates | Custom blank-canvas designs                     |
| **Export**    | Terraform starter export           | Bicep _(Experimental)_, Pulumi _(Experimental)_ |
| **Providers** | Provider-aware visual preview      | Provider-specific resource completeness         |
| **Learning**  | Built-in guided scenarios          | Future community-contributed scenarios          |

Experimental features are clearly labeled in the UI and may change between minor versions.

## Workspace Data (localStorage)

CloudBlocks stores workspace data in the browser's localStorage.

### Migration Policy

- **Minor versions** (v1.0 → v1.1): Automatic migration. Existing workspaces load without user action.
- **Major versions** (v1.x → v2.0): Migration provided but may require user confirmation. Data structure changes documented in release notes.
- **Format changes**: Any change to the `ArchitectureModel` schema that affects localStorage includes a migration function in the release.

### What Is Preserved

- Block positions and configurations
- Container block hierarchy
- Connection endpoints and port assignments
- Workspace metadata (name, description)

### Export as Backup

Users can export workspace data as JSON at any time via File → Export. This serves as a version-independent backup.

## Breaking Changes

In the context of a visual cloud learning tool, a "breaking change" means:

| Breaking                                 | Not Breaking                         |
| ---------------------------------------- | ------------------------------------ |
| Workspace data fails to load             | New UI layout or panel arrangement   |
| Block types removed without migration    | New block types or categories added  |
| Connection model incompatible            | Visual style changes (colors, fonts) |
| Template format change without migration | New templates added                  |
| Learning scenario removed without notice | New scenarios added                  |

## Deprecation Process

1. Feature marked as "Deprecated" in release notes
2. Deprecation warning shown in UI for at least one minor version
3. Feature removed in the next major version

## Browser Support

CloudBlocks targets evergreen browsers:

| Browser       | Minimum Version       |
| ------------- | --------------------- |
| Chrome / Edge | Last 2 major versions |
| Firefox       | Last 2 major versions |
| Safari        | Last 2 major versions |

Mobile browsers are not officially supported in V1 but may work for viewing.

## See Also

- [V1 Product Contract](V1_PRODUCT_CONTRACT.md) — What V1 guarantees
- [ROADMAP.md](ROADMAP.md) — Product evolution plan
