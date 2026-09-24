# Completed Release Gates (Historical)

> Historical record relocated from `RELEASE_GATES.md` §7 for issue #1917. Values below are preserved as recorded, not current test counts or release requirements. For active gates see [Release Gates](RELEASE_GATES.md); for current version policy see [Version Alignment Policy](VERSION_POLICY.md).

## Version-Specific Gates

### Milestone 5 (Completed)

- All 5 CI jobs pass
- 1015+ frontend tests, 170+ backend tests
- Coverage ≥ 90% both layers
- Store decomposition complete (5 slices)
- GitHub integration functional

### Phase 7 (Completed)

- Session auth migration complete (JWT removed)
- Cookie-based session flow active (`cb_oauth` + `cb_session`)
- Server-side session storage active in SQLite

### Milestone 6 (Completed)

All Milestone 5 gates plus:

- Bicep generator produces valid output
- Pulumi generator produces valid output
- Template marketplace has 5+ templates
- Generator plugin interface documented
- Shared validation test fixtures exist (FE/BE compatibility)
- Performance regression tests pass (validation latency targets)

### Milestone 7 (Completed)

All Milestone 6 gates plus:

- Learning mode with guided scenarios functional
- Collaboration workspace operational
- Architecture diff visualization working

### Milestone 8 (Completed)

- AWS and GCP provider adapters functional
- Provider registry supports dynamic registration
- Multi-cloud code generation produces valid output per provider

### Milestone 9 (Completed)

- UX state machine refactored for reliable mode transitions
- Grid snapping via interactjs snap modifiers
- Undo/redo via zundo middleware
- Core interaction patterns hardened (drag, resize, connect)

### Milestone 10 (Completed)

- External actor blocks (user, device, external service) functional
- DevOps-oriented UX flows for deployment pipeline visualization
- Exit criteria flow covered in integration tests

### Milestone 11 (Completed)

- Block design system formalized (BRICK_DESIGN_SPEC.md)
- Universal port standard enforced (rx=12, ry=6, height=5)
- BLOCK_VISUAL_PROFILES consolidated from PORT_LAYOUTS
- Visual consistency validated across all block types

### Milestone 12 (Completed)

- Core model refactored for provider-aware resource types
- Provider system supports Azure, AWS, GCP resource categories
- Block design guidebook published

### Milestone 13 (Completed)

- Terraform pipeline end-to-end functional
- GitHub Pages deployment workflow active
- Infrastructure CI/CD operational

### Milestone 14 (Completed)

- AI-assisted architecture generation via LLM integration
- Natural language to architecture conversion
- Smart suggestions and cost estimation
- E2E integration tests for AI workflow

### Milestone 15 (Completed)

- CloudBlocks Specification v2.0 implemented (ADR-0008)
- Foundation layer: geometry constants, provider registry, visual token system
- Wave 1–4 integration complete
- Backward compatibility preserved via migration path

### Milestone 16 (Completed)

- Documentation architecture restored and canonical lifecycle established
- Block-themed MkDocs documentation site with dark mode
- User-centric navigation restructure (6-tab layout)
- Release management: CHANGELOG.md, annotated tags, GitHub Releases
- Versioning convention: Milestone N = v0.N.0

### Milestone 17 (Completed)

All Milestone 16 gates plus:

- SVG-only rendering model confirmed and documented (ADR-0010)
- Empty placeholder packages removed
- @cloudblocks/schema and @cloudblocks/domain extracted with real code
- Backend role accurately documented, FastAPI version mismatch fixed
- Validation rule ownership decided and implemented
- Root-level build/test/lint covers all modules
- CI pipeline builds and tests extracted packages
- Version alignment policy enforced: all packages at single version
