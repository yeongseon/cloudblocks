# M21 UI/UX Overhaul -- Implementation Spec (Phases 12-18)

Status: design/implementation spec only (no code in this doc).

This spec is grounded in the current repo structure:

- Grid shell: `apps/web/src/app/BuilderView.tsx`, `apps/web/src/app/BuilderView.css`
- Canvas: `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx` (pan/zoom/origin + placement)
- Right-side panels: `apps/web/src/widgets/code-preview/CodePreview.tsx`, `apps/web/src/widgets/diff-panel/DiffPanel.tsx`
- Bottom dock: `apps/web/src/widgets/bottom-panel/BottomPanel.tsx` (currently minimap/detail/command)
- Validation overlay: `apps/web/src/widgets/validation-panel/ValidationPanel.tsx`
- Connection rendering: `apps/web/src/entities/connection/BrickConnector.tsx`
- UI state: `apps/web/src/entities/store/uiStore.ts`
- Architecture state: `apps/web/src/entities/store/architectureStore.ts` (+ slices)

Key constraints / assumptions:

- Drag-to-place already exists via `useUIStore.startPlacing()` and the canvas drop handling in `SceneCanvas.tsx`.
- Current drop behavior creates blocks with a default grid position (`nextGridPosition()` in `domainSlice.ts`), not the cursor position. Phase 12 changes this.
- Motion tokens available as CSS variables in `apps/web/src/app/index.css`: `--duration-*`, `--easing-*`.

---

## Phase 12 -- Sidebar Palette (drag & drop resource creation)

Goal: introduce a persistent resource palette in the left grid slot (sidebar) with search, category sections, and interactjs drag-to-place onto the canvas.

### 1) New files to create

- `apps/web/src/widgets/sidebar-palette/SidebarPalette.tsx`
- `apps/web/src/widgets/sidebar-palette/SidebarPalette.css`
- `apps/web/src/widgets/sidebar-palette/SidebarPalette.test.tsx`
- `apps/web/src/widgets/sidebar-palette/index.ts`
- `apps/web/src/widgets/sidebar-palette/resourceCatalog.ts`

### 2) Existing files to modify

- `apps/web/src/app/BuilderView.tsx`
  - Render `<SidebarPalette />` inside `.builder-sidebar .builder-slot`.
  - Remove `<ResourceBar />` from `.builder-canvas` slot.
- `apps/web/src/widgets/resource-bar/ResourceBar.tsx`
  - Deprecate (Phase 12: stop rendering in builder canvas). Keep file temporarily to avoid broad delete churn, or remove entirely if desired.
- `apps/web/src/widgets/resource-bar/ResourceBar.test.tsx`
  - Remove or update depending on whether the widget is deleted.
- `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx`
  - Replace pointer-up placement from "drop creates block at default position" to "drop uses cursor world coords".
  - Add an interactjs `dropzone()` hook to accept drops from sidebar palette (optional; pointer-up placement is acceptable if the palette only sets `interactionState='placing'`).
- `apps/web/src/entities/store/slices/types.ts`
  - Extend `AddNodeInput` to optionally accept a `position` hint for `kind: 'resource'` placements.
- `apps/web/src/entities/store/slices/domainSlice.ts`
  - Teach `addNode()` / `addBlock()` to honor an optional `position` hint (clamped + snapped).

### 3) Component props interface

`apps/web/src/widgets/sidebar-palette/SidebarPalette.tsx`

```ts
export interface SidebarPaletteProps {
  className?: string;
}
```

Internal types in `apps/web/src/widgets/sidebar-palette/resourceCatalog.ts`:

```ts
import type { ResourceCategory } from '@cloudblocks/schema';

export type PaletteCategory = 'network' | 'compute' | 'data' | 'security' | 'operations';

export interface PaletteItem {
  id: string; // stable UI id (e.g. 'vm', 'sql')
  label: string; // display label
  icon: string; // emoji or icon id
  schemaResourceType: string; // e.g. 'virtual_machine'
  category: PaletteCategory;
  kind: 'resource' | 'container';
  layer?: 'region' | 'subnet';
  access?: 'public' | 'private';
}
```

### 4) State dependencies

- `useUIStore`
  - Reads: `sidebar.isOpen`, `activeProvider`.
  - Writes:
    - `startPlacing(category, resourceName)` for block items (so plates highlight drop targets).
    - `cancelInteraction()` on drag end.
- `useArchitectureStore`
  - Writes: `addNode()` when drop is committed.
- Derived state
  - MVP allowlist should match current command-card allowlist: `network`, `public-subnet`, `private-subnet`, `vm`, `sql`, `storage`, `key-vault`.
  - Grouping rules:
    - Network: network, public-subnet, private-subnet
    - Compute: vm
    - Data: sql, storage
    - Security: key-vault
    - Operations: empty (render "Coming soon" placeholder)

### 5) CSS approach

- Palette is contained in the grid slot; no absolute positioning.
- Layout:
  - `.sidebar-palette` uses column flex: search at top, scrollable list below.
  - Use `position: sticky` for the search row within the palette scroll region.
  - Use theme variables: background from `--bg-surface`, borders from `--border-default`, text from `--text-*`.
- Z-index:
  - No special z-index needed inside the sidebar.
  - Drag preview should be "body-level" via interactjs (a cloned element) or handled by existing `DragGhost` (canvas ghost) driven by `uiStore.startPlacing()`.

### 6) Drop handling on `SceneCanvas` (screen -> world -> plate-relative)

Implement a single source of truth for coordinate conversion in `apps/web/src/widgets/scene-canvas/SceneCanvas.tsx`:

- Inputs: `clientX`, `clientY`, `origin`, `pan`, `zoom`, and the target plate.
- Steps:
  1. Get viewport rect: `rect = containerRef.current.getBoundingClientRect()`.
  2. Convert to scene-local (pre-world-transform):
     - `localX = (clientX - rect.left - pan.x) / zoom`
     - `localY = (clientY - rect.top  - pan.y) / zoom`
  3. Choose plane height `worldYPlane = plate.position.y + plate.size.height`.
  4. Convert screen->world at that plane:
     - `const { worldX, worldZ } = screenToWorld(localX, localY, worldYPlane, origin.x, origin.y)`
  5. Convert world->plate-relative:
     - `relX = worldX - plate.position.x`
     - `relZ = worldZ - plate.position.z`
  6. Snap + clamp:
     - `snapped = snapToGrid(relX, relZ)`
     - clamp within plate bounds using `clampWithinParent()` (already exists in `apps/web/src/entities/store/slices/helpers.ts`).
  7. Commit creation:
     - `addNode({ kind: 'resource', resourceType: ..., name: ..., parentId: plate.id, provider: activeProvider, position: { x, z } })`

Store-side API change (recommended):

- Extend `AddNodeInput` resource variant with:

```ts
position?: { x: number; z: number };
```

- In `domainSlice.addBlock()`, if `position` is provided:
  - set `{ x, z }` after snap+clamp; keep `y` default (`0.5`) to match existing blocks.

### 7) What happens to the old ResourceBar?

- Phase 12: remove it from the canvas slot by updating `apps/web/src/app/BuilderView.tsx`.
- Optional cleanup (preferred): delete `apps/web/src/widgets/resource-bar/` and its test; otherwise mark as deprecated and keep unused until a later cleanup PR.

### Test considerations

- `apps/web/src/widgets/sidebar-palette/SidebarPalette.test.tsx`
  - Renders category sections + search input.
  - Search filters items by label.
  - Collapsing a category hides its items.
  - Drag start sets `useUIStore.getState().interactionState === 'placing'` and sets `draggedBlockCategory`/`draggedResourceName`.
- Canvas drop positioning should be tested as a pure helper:
  - Extract `clientPointToPlateRelativePosition()` into `apps/web/src/widgets/scene-canvas/placementCoords.ts` (optional) and unit test it.

### Dependencies

- Depends on existing `uiStore.startPlacing()` and existing plate DOM attribute `data-plate-id` (already on `PlateSprite.tsx`).
- Phase 18 will add the "drop bounce" animation hook (a tiny UI state for "recently dropped id").

---

## Phase 13 -- Persistent Right Inspector

Goal: replace ad-hoc right-side panels with a single persistent InspectorPanel rendered in the inspector grid slot, with tabs: Properties, Code Preview, Connections.

### 1) New files to create

- `apps/web/src/widgets/inspector-panel/InspectorPanel.tsx`
- `apps/web/src/widgets/inspector-panel/InspectorPanel.css`
- `apps/web/src/widgets/inspector-panel/InspectorPanel.test.tsx`
- `apps/web/src/widgets/inspector-panel/index.ts`

Optional subcomponents if you want files split:

- `apps/web/src/widgets/inspector-panel/InspectorPropertiesTab.tsx`
- `apps/web/src/widgets/inspector-panel/InspectorConnectionsTab.tsx`

### 2) Existing files to modify

- `apps/web/src/app/BuilderView.tsx`
  - Replace the current `.builder-inspector` slot contents with `<InspectorPanel />`.
  - Stop conditionally rendering `CodePreview` directly in the slot.
  - Move `DiffPanel` out of the inspector slot (Phase 14 will place it in bottom dock Diff tab).
- `apps/web/src/widgets/code-preview/CodePreview.tsx`
  - Add an "embedded" mode so it can live inside a tab:
    - hide the close button and header close behavior when embedded.
    - do not call `toggleCodePreview` if embedded.

### 3) Component props interface

`apps/web/src/widgets/inspector-panel/InspectorPanel.tsx`

```ts
export type InspectorTabId = 'properties' | 'code' | 'connections';

export interface InspectorPanelProps {
  className?: string;
  defaultTab?: InspectorTabId; // optional; used by onboarding or menu actions
}
```

`apps/web/src/widgets/code-preview/CodePreview.tsx`

```ts
export interface CodePreviewProps {
  embedded?: boolean;
}
```

### 4) State dependencies

- `useUIStore`
  - Reads: `selectedId`, `inspector.isOpen`.
  - (Recommended) add: `inspector.activeTab` + `setInspectorTab(tab)` to persist tab selection and enable menu shortcuts.
- `useArchitectureStore`
  - Reads: `workspace.architecture.nodes`, `workspace.architecture.connections`, `workspace.architecture.externalActors`.

Selection resolution rules inside InspectorPanel:

- If `selectedId` matches a `ContainerNode`: show Plate properties.
- Else if matches a `LeafNode`: show Block properties.
- Else if matches a `Connection`: show Connection properties.
- Else: show workspace properties.

### 5) CSS approach

- InspectorPanel fills `.builder-inspector .builder-slot` (no absolute positioning).
- Sticky header with tabs:
  - `.inspector-panel-header { position: sticky; top: 0; z-index: 1; }`
- Tabs as segmented controls using theme vars.
- Content region scrolls: `.inspector-panel-body { overflow: auto; }`

### 6) What happens to existing CodePreview?

- It becomes the content of the Inspector "Code Preview" tab.
- The Build menu's "Generate Code" action should become:
  - open inspector (`setInspectorOpen(true)`), then set tab to `code`.
  - (Option A) keep existing `uiStore.showCodePreview` as a compatibility shim.
  - (Option B, preferred) deprecate `showCodePreview/toggleCodePreview` and migrate to inspector tab state.

### Test considerations

- InspectorPanel renders workspace view when nothing selected.
- Selecting a block/plate/connection switches Properties tab content correctly.
- Tab switching works and is persisted if stored in uiStore.
- Embedded CodePreview renders without its close button (or close action does not hide inspector).

### Dependencies

- Depends on Phase 12 selection + canvas behavior remaining stable.
- Phase 14 will remove the remaining "floating/overlay" validation and diff UI, so Inspector stays focused.

---

## Phase 14 -- Bottom Panel Tab Unification

Goal: unify Output/Validation/Logs/Diff as bottom dock tabs; remove floating ValidationPanel overlay.

### 1) New files to create

- `apps/web/src/widgets/bottom-panel/tabs/BottomDockTabs.tsx`
- `apps/web/src/widgets/bottom-panel/tabs/BottomDockTabs.css`
- `apps/web/src/widgets/bottom-panel/tabs/ValidationTab.tsx`
- `apps/web/src/widgets/bottom-panel/tabs/LogsTab.tsx`
- `apps/web/src/widgets/bottom-panel/tabs/DiffTab.tsx`

Optional extraction (so Validation UI can be shared):

- `apps/web/src/widgets/validation-panel/ValidationResults.tsx`

### 2) Existing files to modify

- `apps/web/src/widgets/bottom-panel/BottomPanel.tsx`
  - Become the bottom dock container with:
    - left: CommandCard (side panel)
    - right: tabs + tab content
  - The existing minimap/detail become part of the Output tab (unless you redefine Output).
- `apps/web/src/widgets/validation-panel/ValidationPanel.tsx`
  - Convert to a pure results component (`ValidationResults`) or remove.
- `apps/web/src/app/BuilderView.tsx`
  - Remove `<ValidationPanel />` from the canvas slot.
  - Remove `<DiffPanel />` from the inspector slot.

### 3) Component props interface

`apps/web/src/widgets/bottom-panel/BottomPanel.tsx`

```ts
interface BottomPanelProps {
  className?: string;
}
```

`apps/web/src/widgets/bottom-panel/tabs/BottomDockTabs.tsx`

```ts
import type { BottomDockTab } from '../../entities/store/uiStore';

export interface BottomDockTabsProps {
  activeTab: BottomDockTab;
  onChange: (tab: BottomDockTab) => void;
}
```

`apps/web/src/widgets/bottom-panel/tabs/ValidationTab.tsx`

```ts
export interface ValidationTabProps {
  className?: string;
}
```

### 4) State dependencies

- `useUIStore`
  - Reads: `bottomDock.isOpen`, `bottomDock.activeTab`, `activityLog`.
  - Writes: `setBottomTab(tab)`, `closeBottomDock()`.
- `useArchitectureStore`
  - Reads: `validationResult`.
- `useUIStore` already opens validation/diff tabs when toggles are triggered (`toggleValidation`, `setDiffMode`). Keep that behavior.

### 5) CSS approach

- Reuse the grid slot `.builder-bottomdock` (no absolute positioning).
- Inside BottomPanel:
  - `.bottom-dock` display grid with columns: `command` (fixed width) + `content` (flex).
  - Tabs row sticky at top of content.
- Z-index:
  - Ensure bottom dock sits above canvas content but below onboarding overlay.

### 6) What happens to floating ValidationPanel?

- Removed from the canvas slot.
- Rendered in the bottom dock as the `validation` tab.

### Test considerations

- Switching tabs updates `uiStore.bottomDock.activeTab`.
- Validation tab shows "no results" state when `validationResult === null`.
- Logs tab shows the last N entries; clear works if supported.
- Diff tab renders DiffPanel content when `uiStore.diffMode === true`.

### Dependencies

- Depends on Phase 13 (InspectorPanel) if you want Diff removed from inspector.
- Required before Phase 17 onboarding updates (tour steps must point to the new locations).

---

## Phase 15 -- In-Canvas Invalid Connection Visualization

Goal: show invalid connections directly on the canvas: red dashed line + hover/select explanation.

### 1) New files to create

- `apps/web/src/entities/connection/connectionValidationOverlay.ts` (optional helper)

### 2) Existing files to modify

- `apps/web/src/entities/connection/BrickConnector.tsx`
  - Read `useArchitectureStore((s) => s.validationResult)`.
  - Detect whether the current connection has errors/warnings targeting it:
    - `validationResult.errors.filter((e) => e.targetId === connection.id)`.
  - Render a red dashed overlay path when invalid.
  - Render a hover/selected label explaining the first error message.
- `apps/web/src/entities/connection/BrickConnector.test.tsx`
  - Add tests for invalid styling and label rendering.

### 3) Component props interface

No external props changes required for `BrickConnector`.

### 4) State dependencies

- `useArchitectureStore`
  - Reads: `validationResult`.
- `useUIStore`
  - Reads: `selectedId` (already used).

### 5) CSS approach

- Prefer SVG primitives to avoid layout hacks:
  - Overlay invalid line:
    - `path d={hitPath} stroke="var(--accent-error)" strokeDasharray="6 6" strokeWidth={3} ...`
  - Tooltip/label:
    - Render when `(isHovered || isSelected) && hasConnError`.
    - Use `<g>` containing `<rect rx="6" ...>` + `<text>` anchored near `route.elbow ?? midpoint`.
- Z-index in SVG: ensure the overlay and label are rendered after the beam segments (later in the group).

### 6) Tooltip/label content

- Primary text: `error.message`.
- Secondary text (optional): `error.suggestion`.
- Keep it single-line and truncated if needed (SVG text can be clipped).

### Test considerations

- Provide a `validationResult` in the architecture store with an error whose `targetId` is the connection id.
- Assert the dashed overlay path exists (by `data-testid`, e.g. `data-testid="connection-invalid"`).
- Assert the label is only visible on hover/selection.

### Dependencies

- Depends on Phase 14 being done if you want ValidationPanel removed; otherwise both will coexist.

---

## Phase 16 -- Full Menu Restructuring

Goal: reorganize menus, add panel toggles, and implement keyboard shortcuts for panel visibility.

### 1) New files to create

- `apps/web/src/shared/utils/keyboardShortcuts.ts` (optional helper)

### 2) Existing files to modify

- `apps/web/src/widgets/menu-bar/MenuBar.tsx`
  - View menu:
    - Add toggles:
      - Sidebar (`uiStore.toggleSidebar()`)
      - Inspector (`uiStore.toggleInspector()`)
      - Bottom Dock (`uiStore.openBottomTab('output')` if closed; otherwise `closeBottomDock()`)
    - Keep theme toggles (already present).
  - Remove/rename old toggles that no longer represent layout (e.g. "Block Palette" if it was tied to the old ResourceBar).
- `apps/web/src/app/BuilderView.tsx`
  - Extend global key handler to include panel shortcuts.

### 3) Component props interface

No prop changes.

### 4) State dependencies

- `useUIStore`
  - Reads: `sidebar.isOpen`, `inspector.isOpen`, `bottomDock.isOpen`, `themeVariant`.
  - Writes: `toggleSidebar`, `toggleInspector`, `openBottomTab`, `closeBottomDock`, `setThemeVariant`.

### 5) Keyboard shortcuts (recommended defaults)

Choose combos that do not collide with browser defaults:

- Toggle Sidebar: `Ctrl+Alt+S` (or `Cmd+Alt+S`)
- Toggle Inspector: `Ctrl+Alt+I`
- Toggle Bottom Dock: `Ctrl+Alt+D`

Implementation location:

- `apps/web/src/app/BuilderView.tsx` inside `handleKeyDown` with the same "ignore inputs/textareas/contentEditable" guard.

### 6) CSS approach

No new CSS required.

### Test considerations

- `apps/web/src/widgets/menu-bar/MenuBar.test.tsx`
  - Assert View menu contains the new items.
  - Clicking toggles flips `uiStore.sidebar.isOpen` etc.
- `apps/web/src/app/BuilderView` keyboard tests (if present) or a new test verifying the keydown handler changes store state.

### Dependencies

- Phase 13 if "Generate Code" is now an Inspector tab action.
- Phase 14 for Bottom Dock tabs.

---

## Phase 17 -- Onboarding Detail Improvements

Goal: update onboarding tour selectors and steps to match the new sidebar/inspector/bottom dock layout and ensure steps can bring panels into view.

### 1) New files to create

None.

### 2) Existing files to modify

- `apps/web/src/widgets/onboarding-tour/OnboardingTour.tsx`
  - Update `STEPS` selectors:
    - Replace `.resource-bar` step with `.sidebar-palette`.
    - Replace `.validation-panel` step with a selector inside bottom dock validation tab (e.g. `.bottom-dock [data-tab="validation"]`).
    - Add steps for inspector tabs and bottom dock tabs.
  - Add per-step "ensure visible" hooks:
    - When moving to a step that targets sidebar/inspector/bottom dock, open that panel using `useUIStore.getState().setSidebarOpen(true)` etc.
    - When targeting Validation/Diff, also set the active tab via `useUIStore.getState().setBottomTab('validation')`.
- `apps/web/src/widgets/onboarding-tour/OnboardingTour.css`
  - Ensure spotlight overlay continues to sit above panels: keep z-index >= 10000.

### 3) Component props interface

No prop changes.

### 4) State dependencies

- `useUIStore`
  - Reads: `showOnboarding`, `persona`.
  - Writes: `setSidebarOpen`, `setInspectorOpen`, `openBottomTab`, `setBottomTab`.

### 5) CSS approach

- Avoid hardcoding positions based on the old absolute overlays.
- Keep spotlight based on `getBoundingClientRect()` (already used).

### Test considerations

- Update existing tests in `apps/web/src/widgets/onboarding-tour/OnboardingTour.test.tsx`:
  - Ensure steps resolve selectors for the new UI.
  - Ensure the "ensure visible" logic opens panels before measuring spotlight.

### Dependencies

- Depends on Phase 12, 13, 14 being complete (selectors must exist).

---

## Phase 18 -- Animation System

Goal: add consistent panel open/close transitions and key in-canvas animations (drop + connector draw) using CSS transitions with theme motion tokens.

### 1) New files to create

- `apps/web/src/shared/tokens/motionClasses.css` (optional) -- shared keyframes and utility classes.

### 2) Existing files to modify

- `apps/web/src/app/BuilderView.css`
  - Replace `--easing-standard` usage with `--easing-default` (or define `--easing-standard: var(--easing-default)` in `apps/web/src/app/index.css`).
  - Add "content fade/slide" transitions keyed off `data-*-open` attributes:
    - `.builder-shell[data-sidebar-open="false"] .builder-sidebar .sidebar-palette { opacity: 0; transform: translateX(-8px); }`
    - `.builder-shell[data-inspector-open="false"] .builder-inspector .inspector-panel { opacity: 0; transform: translateX(8px); }`
    - `.builder-shell:not([data-bottomdock-open="true"]) .builder-bottomdock .bottom-panel { opacity: 0; transform: translateY(8px); }`
- `apps/web/src/widgets/sidebar-palette/SidebarPalette.css`
  - Add a subtle "press/drag" affordance transition.
- `apps/web/src/widgets/inspector-panel/InspectorPanel.css`
  - Tab content fade between tabs (CSS opacity + translateY).
- `apps/web/src/widgets/bottom-panel/BottomPanel.css`
  - Tab switching animation (content crossfade).
- `apps/web/src/entities/block/BlockSprite.css`
  - Add a "firm drop + slight bounce" animation class (e.g. `.is-just-dropped`).
- `apps/web/src/entities/connection/BrickConnector.tsx`
  - Add a single overlay path for "draw-in" animation on mount (use `stroke-dashoffset`), while keeping the Lego beam rendering unchanged.

### 3) Component props interface

Recommended new UI state to drive "drop bounce" without threading props:

- Add to `apps/web/src/entities/store/uiStore.ts`:

```ts
justDroppedBlockId: string | null;
triggerJustDropped: (id: string) => void;
```

Then `BlockSprite.tsx` reads it and toggles a class.

### 4) State dependencies

- `useUIStore`
  - Reads: `sidebar.isOpen`, `inspector.isOpen`, `bottomDock.isOpen` (already used by the shell).
  - Reads/writes: `justDroppedBlockId`.

### 5) CSS approach

- Prefer transitions over keyframes for panel motion:
  - duration: `var(--duration-normal)`
  - easing: `var(--easing-default)`
- Use keyframes for "impact" moments only:
  - block drop bounce
  - connector draw-in

### 6) Test considerations

- Animation classes should be testable by presence/absence (don't assert timing).
- For connector draw-in, add `data-testid="connection-draw-path"` for shallow existence checks.

### Dependencies

- Depends on Phase 12 (drop commit point) to trigger "just dropped" animation.
- Depends on Phase 15 for connector overlays (the draw-in path can be reused for invalid overlays).
