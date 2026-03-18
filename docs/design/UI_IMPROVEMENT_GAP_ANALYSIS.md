# UI Improvement Guide — Gap Analysis & Decision Record

> **Status: Historical** — This gap analysis was completed during Phase 9. All identified improvements have been implemented.

> **Status**: Historical archive  
> **Created**: 2026-03-16  
> **Purpose**: Analyze the 12-item UI Improvement Guide against the current CloudBlocks codebase, record implementation status and architectural decisions, and define the remaining work for Milestone 6B.

---

## 1. Purpose and Scope

The user provided a comprehensive **UI Improvement Guide** covering 12 areas for the CloudBlocks visual architecture builder. This document:

1. Maps each guide item to the current codebase implementation
2. Classifies each item with a clear status taxonomy
3. Records architectural decisions where the implementation intentionally diverges from the guide
4. Defines prioritized UX gaps that need implementation
5. Provides the Drag-to-Create MVP specification
6. Maps remaining work to **Milestone 6B: Builder UX Completion**

### Status Taxonomy

| Status | Meaning |
|--------|---------|
| ✅ **Implemented** | Fully matches the guide's intent |
| ✅ **Implemented via different pattern** | Satisfies the guide's goal through a different UI approach — intentional divergence |
| ⚠️ **Partial gap** | Core functionality exists but specific sub-features are missing |
| ❌ **Not started** | Feature does not exist in the codebase |
| 🔒 **Deferred** | Deliberately postponed to a later milestone |

---

## 2. Current-State Snapshot

**Codebase**: `apps/web/src/` (React 19 + TypeScript + Zustand + interactjs)  
**Build**: ✅ Passing (`pnpm build`)  
**Tests**: 967 passing across 60 test files
**Last milestone completed**: Milestone 7 (Collaboration + CI/CD)

### Key Technologies in Use

| Concern | Technology | Files |
|---------|-----------|-------|
| Drag & Drop (repositioning) | `interactjs` | `BlockSprite.tsx` |
| State Management | Zustand + `zundo` (undo/redo) | `architectureStore.ts`, `uiStore.ts` |
| Canvas Rendering | SVG-based isometric sprites | `PlateSprite.tsx`, `BlockSprite.tsx` |
| Validation | Rule engine | `entities/validation/` |
| Code Generation | Multi-generator pipeline | `entities/generator/` |

---

## 3. Guide-to-Codebase Mapping Matrix

| # | Guide Item | Status | Implementation | Key Files |
|---|-----------|--------|----------------|-----------|
| 1 | UI Structure | ✅ Implemented | StarCraft-style layout: Canvas + Bottom Panel (Minimap, Portrait, Details, CommandCard) | `BottomPanel.tsx`, `SceneCanvas.tsx` |
| 2 | Resource Drag & Drop | ⚠️ Partial gap | Block **repositioning** via interactjs works. **Drag-to-create** from palette → canvas is NOT implemented. `draggedBlockCategory` state exists in uiStore but is unused. | `BlockSprite.tsx`, `uiStore.ts`, `useDraggable.ts` |
| 3 | Selection → Command | ✅ Implemented | 4-state CommandCard: CreationMode → PlateActionMode → PlateCreationMode → BlockActionMode. Plate actions: Deploy/Config/Delete/Move/Rename. Block actions: Link/Edit/Delete/Copy/Config/App/Move/Rename. | `CommandCard.tsx`, `useTechTree.ts` |
| 4 | Resource Connection | ✅ Implemented | Click source → click target. SVG curved paths with arrow markers. Connection validation rules. `toolMode: 'connect'` in uiStore. | `ConnectionPath.tsx`, `BlockSprite.tsx`, `connection.ts` |
| 5 | Canvas Structure | ✅ Implemented | VNet → Subnet → Block containment hierarchy. Isometric sprites with proper z-ordering. LEGO-style badges on plates. | `PlateSprite.tsx`, `BlockSprite.tsx` |
| 6 | Internet Representation | ✅ Implemented | `ExternalActorSprite` renders Internet as cylinder SVG outside VNet. Connections draw from Internet → Gateway. | `ExternalActorSprite.tsx` |
| 7 | Resource Panel Grouping | ✅ Implemented via different pattern | Guide suggests expandable sections. Implementation uses **5-tab paging** (Infra/Compute/Data/Edge/Messaging) with 3×3 grids per tab. Tabs are better for space-constrained bottom panel. | `CommandCard.tsx`, `useTechTree.ts` |
| 8 | Bottom Panel Info + Commands | ✅ Implemented via different pattern | Guide suggests combined info+commands. Implementation **splits** them: DetailPanel (properties) + CommandCard (actions). This is the intentional StarCraft layout — information and command areas are separate by design. | `DetailPanel.tsx`, `CommandCard.tsx`, `BottomPanel.tsx` |
| 9 | Minimap | ✅ Implemented | Minimap renders scaled-down architecture overview. | `Minimap.tsx` |
| 10 | Selection Visuals | ⚠️ Partial gap | **Implemented**: Yellow glow (selected), Green glow (connect source), Red glow (delete mode), Hover brightness. **Missing**: Anchor handles, invalid target state, connected state highlight, warning state. | `BlockSprite.css`, `PlateSprite.css` |
| 11 | First Screen UX | ⚠️ Partial gap | **Implemented**: TemplateGallery with 3+ built-in templates. **Missing**: Onboarding hints, empty canvas message, guided first-click flow. | `TemplateGallery.tsx` |
| 12 | MVP Scope | ✅ Implemented | All MVP items (place, connect, validate, generate, save/load) are functional. | — |

### Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ Implemented | 7 | #1, #3, #4, #5, #6, #9, #12 |
| ✅ Implemented via different pattern | 2 | #7, #8 |
| ⚠️ Partial gap | 3 | #2, #10, #11 |
| ❌ Not started | 0 | — |

---

## 4. Accepted Divergences from the Guide

### 4.1 Resource Panel: Tabs vs. Expandable Sections (Guide Item #7)

**Guide**: Expandable/collapsible category sections in a scrollable panel.  
**Implementation**: 5-tab paging with 3×3 grids per tab.

**Decision**: **Keep tabs.** The bottom panel has limited vertical space (~200px). Expandable sections would require scrolling to reach categories, while tabs provide instant access to any category with a single click. The 3×3 grid format also matches the StarCraft command card aesthetic.

### 4.2 Bottom Panel: Combined vs. Split Layout (Guide Item #8)

**Guide**: Single bottom panel combining resource info and command buttons.  
**Implementation**: Separate DetailPanel (properties/info on left) and CommandCard (actions on right).

**Decision**: **Keep split layout.** This is the StarCraft design principle — information readout and command interface occupy distinct zones. This prevents visual clutter and makes the interface scannable. The Portrait section between them provides visual identity for the selected entity.

---

## 5. Prioritized UX Gaps

Ranked by user impact for the **Architecture Builder** experience:

### P1: Drag-to-Create from Palette → Canvas (Guide Item #2)

**Impact**: HIGH — This is the primary creation workflow gap. Users currently create resources only via CommandCard click (which places at a default position). Drag-to-create enables intuitive spatial placement.

**Current state**:
- `interactjs` installed and used for block repositioning
- `draggedBlockCategory` state exists in `uiStore.ts` but is completely unused
- `useDraggable.ts` hook exists (basic mouse events) but isn't connected to creation flow
- No drag preview, no drop zone highlighting, no hover-over-subnet detection

**Effort**: Medium  
**Specification**: See §6 below.

### P2: First-Screen Onboarding (Guide Item #11)

**Impact**: MEDIUM — New users land on an empty canvas with no guidance. TemplateGallery exists but requires discovery. An empty-state message with a CTA ("Start from template" or "Add your first network") would significantly improve first-use experience.

**Current state**:
- `TemplateGallery.tsx` functional with 3+ templates
- No empty-canvas message
- No onboarding tooltips or guided flow

**Effort**: Low  
**Deliverables**:
- Empty canvas overlay with "Get Started" CTA
- Link to TemplateGallery from empty state
- Optional: Subtle pulse on "Infra" tab when canvas is empty

### P3: Richer Selection Visual States (Guide Item #10)

**Impact**: MEDIUM-LOW — Current selection visuals (yellow/green/red glows) cover the primary use cases. Advanced states (anchor handles, invalid target, connected highlight, warning) are polish items that improve precision in complex architectures.

**Current state**:
- `.is-selected`: Yellow glow `#FFD500` (`drop-shadow(0 0 8px #FFD500)`)
- `.is-connection-source`: Green glow `#00852B` (`drop-shadow(0 0 10px #00852B)`)
- `.is-delete-mode`: Red glow + sepia filter `#E3000B`
- Hover: Brightness increase + subtle translateY

**Missing states**:

| State | Visual | Purpose |
|-------|--------|---------|
| `is-valid-target` | Green pulsing border | Highlight valid connection targets during connect mode |
| `is-invalid-target` | Red dimmed overlay | Show blocks that cannot accept a connection |
| `is-connected` | Subtle link indicator | Show blocks that have existing connections |
| `is-warning` | Orange/amber glow | Indicate validation warnings on a block |

**Effort**: Low  
**Deliverables**:
- CSS classes for 4 new states
- Connect-mode target highlighting in `BlockSprite.tsx`
- Validation warning state integration

### P4: Bottom Panel Action Shortcuts (Deferred)

**Impact**: LOW — The CommandCard already provides contextual actions. Bottom panel info-area shortcuts are a power-user feature.

**Decision**: 🔒 **Deferred to Milestone 7+.** Current CommandCard state machine is sufficient.

---

## 6. Drag-to-Create MVP Specification

### 6.1 Overview

Add drag-to-create as a **parallel input method alongside click-to-create**. Both methods coexist — click-to-create remains as fallback and keyboard-friendly option.

### 6.2 Interaction Flow

```
User drags resource tile from CommandCard
  → Ghost preview follows cursor
  → Valid drop zones (subnets/plates) highlight with green border
  → User drops on a valid target
    → Block created at drop position (snapped to grid)
  → User drops on invalid area
    → Drop cancelled, no block created
  → User presses ESC during drag
    → Drag cancelled
```

### 6.3 Technical Approach

**Reuse `interactjs`** — already installed and used for block repositioning in `BlockSprite.tsx`.

| Component | Role |
|-----------|------|
| `CommandCard.tsx` | Resource tiles become draggable sources (interactjs `draggable`) |
| `uiStore.ts` | `draggedBlockCategory` state already exists — activate it |
| `PlateSprite.tsx` | Add dropzone detection — highlight when drag hovers over valid plate |
| `SceneCanvas.tsx` | Handle drop event — create block at pointer position |
| CSS | `.is-drop-target` class for valid target highlighting |

### 6.4 MVP Scope (IN)

- Drag resource tile from CommandCard 3×3 grid
- Set `draggedBlockCategory` on drag start
- Highlight valid plates/subnets during drag (green border via `.is-drop-target`)
- Create block on valid drop (snapped to grid center of target plate)
- Cancel on invalid drop or ESC
- Clear `draggedBlockCategory` on drag end

### 6.5 Non-Goals (OUT of MVP)

- Ghost preview element following cursor (use cursor change instead)
- Auto-scroll canvas during drag
- Multi-block drag (drag multiple resources at once)
- Drag from palette to create plates (plates use click-to-create only)
- Touch device optimization
- Animated drop feedback

### 6.6 Placement Rules

| Drop Target | Result |
|-------------|--------|
| Public Subnet | Create block if allowed by placement rules |
| Private Subnet | Create block if allowed by placement rules |
| VNet (not on subnet) | ❌ Reject — blocks must be on subnets |
| Empty canvas | ❌ Reject — blocks need a parent plate |
| Another block | ❌ Reject — no stacking |

> Placement validation MUST reuse existing rule engine (`entities/validation/`). Do not duplicate validation logic.

### 6.7 State Management

```typescript
// uiStore.ts — already exists, needs activation
draggedBlockCategory: BlockCategory | null
setDraggedBlockCategory: (category: BlockCategory | null) => void

// New state needed:
dropTargetPlateId: string | null           // Plate being hovered during drag
setDropTargetPlateId: (id: string | null) => void
```

### 6.8 Code References

| File | Current Role | Change Needed |
|------|-------------|---------------|
| `apps/web/src/entities/store/uiStore.ts` | Has `draggedBlockCategory` (unused) | Add `dropTargetPlateId`, wire up setters |
| `apps/web/src/widgets/bottom-panel/CommandCard.tsx` | Click-to-create buttons | Add interactjs `draggable` to resource tiles |
| `apps/web/src/entities/plate/PlateSprite.tsx` | Renders plates | Add `.is-drop-target` CSS class when hovered during drag |
| `apps/web/src/entities/plate/PlateSprite.css` | Plate styles | Add `.is-drop-target` green border style |
| `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` | Main canvas | Handle drop event, call `addBlock` with position |
| `apps/web/src/shared/hooks/useDraggable.ts` | Basic drag hook | May be refactored or replaced by interactjs |

---

## 7. Deferred Items and Non-Goals

### Deferred to Future Milestones

| Item | Reason | Target |
|------|--------|--------|
| Bottom panel action shortcuts | Low impact, CommandCard sufficient | Milestone 7+ |
| Drag-to-create for plates | Plates are infrequent; click-to-create is adequate | Milestone 7+ |
| Advanced onboarding tutorial | Requires content design effort | Milestone 7+ |
| Touch/mobile optimization | Desktop-first product | Milestone 8+ |

### Non-Goals

- **Replacing click-to-create** — Both input methods coexist permanently
- **Drag-and-drop between plates** — Move blocks via cut/paste or drag repositioning (existing interactjs)
- **Collapsible sections in CommandCard** — Tabs are the chosen pattern (see §4.1)
- **Combined info+command panel** — Split layout is intentional (see §4.2)

---

## 8. Roadmap Placement and Acceptance Criteria

### Milestone 6B: Builder UX Completion

**Position**: Between Milestone 6 (Multi-Generator) and Milestone 7 (Collaboration)  
**Rationale**: Core builder UX gaps must be closed before adding collaboration features. Multi-user workflows should not inherit a weak single-user creation flow.

#### Deliverables

| # | Deliverable | Priority | Effort |
|---|------------|----------|--------|
| 1 | Drag-to-Create MVP | P1 | Medium |
| 2 | First-Screen Onboarding | P2 | Low |
| 3 | Selection Visual States | P3 | Low |

#### Acceptance Criteria

- [ ] Resources can be dragged from CommandCard and dropped onto valid subnet plates
- [ ] Invalid drops are rejected cleanly (no orphaned blocks, no broken state)
- [ ] Click-to-create continues to work unchanged
- [ ] Empty canvas shows a "Get Started" message with link to TemplateGallery
- [ ] Connect mode highlights valid/invalid targets on blocks
- [ ] Validation warnings display as amber glow on affected blocks
- [ ] All existing tests continue to pass (717+)
- [ ] Build passes (`pnpm build`)

---

## 9. Appendix: Code References

### Store Layer

| File | Key State |
|------|-----------|
| `apps/web/src/entities/store/uiStore.ts` | `selectedId`, `toolMode`, `connectionSource`, `draggedBlockCategory` |
| `apps/web/src/entities/store/architectureStore.ts` | `plates`, `blocks`, `connections`, `addBlock`, `removeBlock` |

### Component Layer

| File | Role |
|------|------|
| `apps/web/src/widgets/bottom-panel/CommandCard.tsx` | 4-state command interface (Creation/PlateAction/PlateCreation/BlockAction) |
| `apps/web/src/widgets/bottom-panel/useTechTree.ts` | Tech tree definitions, action types, dependency checks |
| `apps/web/src/widgets/bottom-panel/DetailPanel.tsx` | Selected entity properties display |
| `apps/web/src/widgets/bottom-panel/BottomPanel.tsx` | StarCraft-style bottom panel layout |
| `apps/web/src/entities/block/BlockSprite.tsx` | Block rendering + interactjs drag repositioning |
| `apps/web/src/entities/plate/PlateSprite.tsx` | Plate rendering + selection |
| `apps/web/src/entities/connection/ConnectionPath.tsx` | SVG connection paths with arrows |

### Style Layer

| File | Selection States |
|------|-----------------|
| `apps/web/src/entities/block/BlockSprite.css` | `.is-selected`, `.is-connection-source`, `.is-delete-mode` |
| `apps/web/src/entities/plate/PlateSprite.css` | `.is-selected` |

### Validation Layer

| File | Role |
|------|------|
| `apps/web/src/entities/validation/` | Rule engine for placement + connection validation |
| `apps/web/src/shared/types/connection.ts` | Connection types + validation rules |
