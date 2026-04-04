import { create } from 'zustand';
import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';
import type { EditorMode } from '../../shared/types/learning';
import type { DiffDelta } from '../../shared/types/diff';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { ComplexityLevel } from '../../shared/types';
import type { ThemeVariant } from '../../shared/tokens/themeTokens';
import type { DrawerPanelId } from '../../widgets/right-drawer/panelRegistry';

export type ToolMode = 'select' | 'connect' | 'delete';
export type InteractionState = 'idle' | 'selecting' | 'dragging' | 'placing' | 'connecting';
export type BackendStatus = 'unknown' | 'not_configured' | 'available' | 'unavailable';
export type PendingGitHubAction = 'sync' | 'pr' | 'repos' | null;
export type AppView = 'landing' | 'builder';
export type InspectorTabId = 'properties' | 'code' | 'connections';
export type LabelMode = 'compact' | 'learning' | 'inspect';
export type RightOverlayId =
  | 'githubLogin'
  | 'githubRepos'
  | 'githubSync'
  | 'githubPR'
  | 'diff'
  | null;

export interface ActivityLogEntry {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
export type { EditorMode } from '../../shared/types/learning';
export type { ComplexityLevel } from '../../shared/types';

/** Runtime health/status for a block — not persisted in architecture model. */
export type BlockHealthStatus = 'ok' | 'warn' | 'error';

/**
 * Block-level operational status overlay.
 * These are runtime states (not persisted in the architecture model).
 * Priority: disabled > error > warning > health > default.
 */
export interface BlockStatus {
  disabled?: boolean;
  error?: boolean;
  healthStatus?: BlockHealthStatus;
}

const PENDING_GITHUB_ACTION_KEY = 'cloudblocks_pending_github_action';

export function computeAutoLabelMode(zoom: number, currentMode: LabelMode): LabelMode {
  if (zoom < 0.55) {
    return 'compact';
  }

  if (zoom <= 0.65) {
    return currentMode === 'compact' ? 'compact' : 'learning';
  }

  if (zoom < 1.4) {
    return 'learning';
  }

  if (zoom <= 1.6) {
    return currentMode === 'inspect' ? 'inspect' : 'learning';
  }

  return 'inspect';
}

function computeEffectiveLabelMode(
  override: LabelMode | 'auto',
  zoom: number,
  currentMode: LabelMode,
): LabelMode {
  if (override !== 'auto') {
    return override;
  }

  return computeAutoLabelMode(zoom, currentMode);
}

function readPendingGitHubAction(): PendingGitHubAction {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_GITHUB_ACTION_KEY);
  if (raw === 'sync' || raw === 'pr' || raw === 'repos') {
    return raw;
  }

  return null;
}

function writePendingGitHubAction(action: PendingGitHubAction): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (action === null) {
    window.sessionStorage.removeItem(PENDING_GITHUB_ACTION_KEY);
    return;
  }

  window.sessionStorage.setItem(PENDING_GITHUB_ACTION_KEY, action);
}

interface UIState {
  // ── App view ──
  appView: AppView;
  setAppView: (view: AppView) => void;
  goToLanding: () => void;
  goToBuilder: () => void;

  // ── Selection ──
  /** Primary selection set — supports multi-select (shift-click, lasso). */
  selectedIds: Set<string>;
  /** Backward-compat getter: returns first selected id or null. */
  selectedId: string | null;
  /** Replace entire selection with a single id (or null to clear). */
  setSelectedId: (id: string | null) => void;
  /** Add id to selection set (shift-click additive). */
  addToSelection: (id: string) => void;
  /** Remove id from selection set. */
  removeFromSelection: (id: string) => void;
  /** Toggle id in/out of selection set (shift-click toggle). */
  toggleSelection: (id: string) => void;
  /** Replace entire selection set (lasso result). */
  setSelectedIds: (ids: ReadonlySet<string> | readonly string[]) => void;
  /** Clear all selections. */
  clearSelection: () => void;

  // ── Tool mode ──
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  activeProvider: ProviderType;
  setActiveProvider: (provider: ProviderType) => void;

  // ── Connection mode ──
  connectionSource: string | null;
  setConnectionSource: (id: string | null) => void;

  // ── Interaction state machine ──
  interactionState: InteractionState;
  startPlacing: (
    category: ResourceCategory,
    resourceName: string,
    resourceType?: string,
    subtype?: string,
  ) => void;
  startConnecting: (sourceId: string) => void;
  startDragging: () => void;
  startSelecting: () => void;
  cancelInteraction: () => void;
  completeInteraction: () => void;

  // ── Drag state ──
  draggedBlockCategory: ResourceCategory | null;
  setDraggedBlockCategory: (category: ResourceCategory | null) => void;
  draggedResourceName: string | null;
  setDraggedResourceName: (name: string | null) => void;
  draggedResourceType: string | null;
  draggedSubtype: string | null;
  cancelDrag: () => void;

  // ── Panel visibility ──
  showBlockPalette: boolean;
  toggleBlockPalette: () => void;
  showResourceGuide: boolean;
  toggleResourceGuide: () => void;
  showValidation: boolean;
  toggleValidation: () => void;
  showCodePreview: boolean;
  toggleCodePreview: () => void;
  showAdvancedGeneration: boolean;
  toggleAdvancedGeneration: () => void;
  showWorkspaceManager: boolean;
  toggleWorkspaceManager: () => void;

  showGitHubLogin: boolean;
  toggleGitHubLogin: () => void;
  showGitHubRepos: boolean;
  toggleGitHubRepos: () => void;
  showGitHubSync: boolean;
  toggleGitHubSync: () => void;
  showGitHubPR: boolean;
  toggleGitHubPR: () => void;
  showSuggestionsPanel: boolean;
  toggleSuggestionsPanel: () => void;
  showCostPanel: boolean;
  toggleCostPanel: () => void;

  // ── Layout panels ──
  sidebar: { isOpen: boolean };
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  inspector: { isOpen: boolean; activeTab: InspectorTabId };
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTabId) => void;
  openInspectorTab: (tab: InspectorTabId) => void;

  rightOverlay: RightOverlayId;
  setRightOverlay: (overlay: RightOverlayId) => void;

  // ── Right drawer ──
  drawer: { isOpen: boolean; activePanel: DrawerPanelId | null };
  openDrawer: (panel: DrawerPanelId) => void;
  closeDrawer: () => void;
  toggleDrawer: (panel: DrawerPanelId) => void;

  // ── Activity log ──
  activityLog: ActivityLogEntry[];
  appendLog: (entry: Omit<ActivityLogEntry, 'id' | 'ts'>) => void;
  clearLog: () => void;

  backendStatus: BackendStatus;
  setBackendStatus: (status: BackendStatus) => void;

  // ── Editor mode ──
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

  // ── Learning panels ──
  showLearningPanel: boolean;
  toggleLearningPanel: () => void;
  setShowLearningPanel: (show: boolean) => void;
  showScenarioGallery: boolean;
  toggleScenarioGallery: () => void;
  setShowScenarioGallery: (show: boolean) => void;

  // ── Diff mode ──
  diffMode: boolean;
  diffDelta: DiffDelta | null;
  diffVersion: number;
  diffBaseArchitecture: ArchitectureModel | null;
  setDiffMode: (mode: boolean, delta?: DiffDelta | null, base?: ArchitectureModel | null) => void;
  clearDiffState: () => void;

  // ── Onboarding ──
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // ── Complexity ──
  complexityLevel: ComplexityLevel;

  // ── Sound preference ──
  isSoundMuted: boolean;
  toggleSound: () => void;

  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;

  showPorts: boolean;
  togglePorts: () => void;
  setShowPorts: (show: boolean) => void;

  gridStyle: 'paper' | 'dot' | 'none';
  setGridStyle: (style: 'paper' | 'dot' | 'none') => void;

  // ── Label presentation mode ──
  labelModeOverride: LabelMode | 'auto';
  setLabelModeOverride: (mode: LabelMode | 'auto') => void;
  /** Zoom level reported by SceneCanvas, used for auto label density */
  canvasZoom: number;
  setCanvasZoom: (zoom: number) => void;
  fitToContentRequested: boolean;
  requestFitToContent: () => void;
  clearFitToContentRequest: () => void;
  /** Computed: the label mode that should be used for rendering */
  effectiveLabelMode: LabelMode;
  labelMode: LabelMode;
  setLabelMode: (mode: LabelMode) => void;
  cycleLabelMode: () => void;
  cycleGridStyle: () => void;
  pendingGitHubAction: PendingGitHubAction;
  setPendingGitHubAction: (action: PendingGitHubAction) => void;
  pendingLinkRepo: string | null;
  setPendingLinkRepo: (fullName: string | null) => void;

  // ── Compare review prefill ──
  compareReviewPrefill: string | null;
  setCompareReviewPrefill: (prefill: string | null) => void;
  // ── Resource self-animation ──
  upgradingBlockId: string | null;
  triggerUpgradeAnimation: (blockId: string) => void;
  // ── Connection snap animation ──
  snapTargetBlockIds: Set<string>;
  triggerSnapAnimation: (blockId: string) => void;

  // ── Magnetic snap (connection preview proximity) ──
  magneticSnapTargetId: string | null;
  setMagneticSnapTarget: (id: string | null) => void;

  // ── Block status overlay (#1591) ──
  blockStatuses: Map<string, BlockStatus>;
  setBlockStatus: (blockId: string, status: BlockStatus) => void;
  clearBlockStatus: (blockId: string) => void;
}

/** Keys that occupy the right-side panel slot — only one may be open. */
const RIGHT_PANEL_KEYS = [
  'showCodePreview',
  'showGitHubLogin',
  'showGitHubRepos',
  'showGitHubSync',
  'showGitHubPR',
  'showSuggestionsPanel',
  'showCostPanel',
] as const;

type RightPanelKey = (typeof RIGHT_PANEL_KEYS)[number];

/** Returns a partial state that closes every right panel except the given key. */
function closeOtherRightPanels(except: RightPanelKey): Partial<UIState> {
  const patch: Record<string, boolean> = {};
  for (const key of RIGHT_PANEL_KEYS) {
    if (key !== except) patch[key] = false;
  }
  return patch as Partial<UIState>;
}

export const useUIStore = create<UIState>((set, get) => ({
  appView: 'landing' as AppView,
  setAppView: (view) => {
    set({ appView: view });
  },
  goToLanding: () => {
    set({ appView: 'landing' });
  },
  goToBuilder: () => {
    set({ appView: 'builder' });
  },

  selectedIds: new Set<string>(),
  selectedId: null,
  setSelectedId: (id) => {
    const selectedIds = id !== null ? new Set([id]) : new Set<string>();
    set({ selectedIds, selectedId: id });
    if (id !== null) {
      get().openDrawer('properties');
    }
  },
  addToSelection: (id) => {
    const next = new Set(get().selectedIds);
    next.add(id);
    const selectedId = next.size > 0 ? (next.values().next().value ?? null) : null;
    set({ selectedIds: next, selectedId });
    if (next.size === 1) {
      get().openDrawer('properties');
    }
  },
  removeFromSelection: (id) => {
    const next = new Set(get().selectedIds);
    next.delete(id);
    const selectedId = next.size > 0 ? (next.values().next().value ?? null) : null;
    set({ selectedIds: next, selectedId });
  },
  toggleSelection: (id) => {
    const prev = get().selectedIds;
    const next = new Set(prev);
    if (prev.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    const selectedId = next.size > 0 ? (next.values().next().value ?? null) : null;
    set({ selectedIds: next, selectedId });
    if (next.size === 1) {
      get().openDrawer('properties');
    }
  },
  setSelectedIds: (ids) => {
    const next = ids instanceof Set ? new Set(ids) : new Set(ids);
    const selectedId = next.size > 0 ? (next.values().next().value ?? null) : null;
    set({ selectedIds: next, selectedId });
    if (next.size === 1) {
      get().openDrawer('properties');
    }
  },
  clearSelection: () => {
    set({ selectedIds: new Set(), selectedId: null });
  },

  toolMode: 'select',
  setToolMode: (mode) => set({ toolMode: mode, connectionSource: null }),

  activeProvider: 'azure',
  setActiveProvider: (provider) => set({ activeProvider: provider }),

  connectionSource: null,
  setConnectionSource: (id) => set({ connectionSource: id }),

  interactionState: 'idle',

  startPlacing: (category, resourceName, resourceType, subtype) =>
    set({
      interactionState: 'placing',
      draggedBlockCategory: category,
      draggedResourceName: resourceName,
      draggedResourceType: resourceType ?? null,
      draggedSubtype: subtype ?? null,
      toolMode: 'select',
      connectionSource: null,
    }),

  startConnecting: (sourceId) =>
    set({
      interactionState: 'connecting',
      connectionSource: sourceId,
      toolMode: 'connect',
      draggedBlockCategory: null,
      draggedResourceName: null,
    }),

  startDragging: () =>
    set({
      interactionState: 'dragging',
    }),

  startSelecting: () =>
    set({
      interactionState: 'selecting',
    }),

  cancelInteraction: () =>
    set({
      interactionState: 'idle',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
      draggedResourceType: null,
      draggedSubtype: null,
      magneticSnapTargetId: null,
    }),

  completeInteraction: () =>
    set({
      interactionState: 'idle',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
      draggedResourceType: null,
      draggedSubtype: null,
      magneticSnapTargetId: null,
    }),

  draggedBlockCategory: null,
  setDraggedBlockCategory: (category) => set({ draggedBlockCategory: category }),
  draggedResourceName: null,
  setDraggedResourceName: (name) => set({ draggedResourceName: name }),
  draggedResourceType: null,
  draggedSubtype: null,
  cancelDrag: () =>
    set({
      draggedBlockCategory: null,
      draggedResourceName: null,
      draggedResourceType: null,
      draggedSubtype: null,
    }),

  showBlockPalette: true,
  toggleBlockPalette: () => set((s) => ({ showBlockPalette: !s.showBlockPalette })),

  showResourceGuide: true,
  toggleResourceGuide: () => set((s) => ({ showResourceGuide: !s.showResourceGuide })),

  showValidation: false,
  toggleValidation: () =>
    set((s) => ({
      showValidation: !s.showValidation,
      ...(!s.showValidation
        ? { drawer: { isOpen: true, activePanel: 'validation' as const } }
        : {}),
    })),

  showCodePreview: false,
  toggleCodePreview: () =>
    set((s) => ({
      showCodePreview: !s.showCodePreview,
      ...(!s.showCodePreview
        ? {
            inspector: { isOpen: true, activeTab: 'code' as const },
          }
        : { inspector: { ...s.inspector, activeTab: 'properties' as const } }),
    })),

  showAdvancedGeneration: false,
  toggleAdvancedGeneration: () =>
    set((s) => ({ showAdvancedGeneration: !s.showAdvancedGeneration })),

  rightOverlay: null,
  setRightOverlay: (overlay) =>
    set({
      rightOverlay: overlay,
      showGitHubLogin: overlay === 'githubLogin',
      showGitHubRepos: overlay === 'githubRepos',
      showGitHubSync: overlay === 'githubSync',
      showGitHubPR: overlay === 'githubPR',
    }),

  showWorkspaceManager: false,
  toggleWorkspaceManager: () => set((s) => ({ showWorkspaceManager: !s.showWorkspaceManager })),

  showGitHubLogin: false,
  toggleGitHubLogin: () =>
    set((s) => ({
      showGitHubLogin: !s.showGitHubLogin,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
      rightOverlay: s.showGitHubLogin ? null : 'githubLogin',
    })),

  showGitHubRepos: false,
  toggleGitHubRepos: () =>
    set((s) => ({
      showGitHubRepos: !s.showGitHubRepos,
      showGitHubLogin: false,
      showGitHubSync: false,
      showGitHubPR: false,
      rightOverlay: s.showGitHubRepos ? null : 'githubRepos',
    })),

  showGitHubSync: false,
  toggleGitHubSync: () =>
    set((s) => ({
      showGitHubSync: !s.showGitHubSync,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubPR: false,
      rightOverlay: s.showGitHubSync ? null : 'githubSync',
    })),

  showGitHubPR: false,
  toggleGitHubPR: () =>
    set((s) => ({
      showGitHubPR: !s.showGitHubPR,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      rightOverlay: s.showGitHubPR ? null : 'githubPR',
    })),

  showSuggestionsPanel: false,
  toggleSuggestionsPanel: () =>
    set((s) => ({
      showSuggestionsPanel: !s.showSuggestionsPanel,
      ...(!s.showSuggestionsPanel ? closeOtherRightPanels('showSuggestionsPanel') : {}),
      ...(!s.showSuggestionsPanel ? { rightOverlay: null } : {}),
    })),

  showCostPanel: false,
  toggleCostPanel: () =>
    set((s) => ({
      showCostPanel: !s.showCostPanel,
      ...(!s.showCostPanel ? closeOtherRightPanels('showCostPanel') : {}),
      ...(!s.showCostPanel ? { rightOverlay: null } : {}),
    })),

  sidebar: { isOpen: true },
  toggleSidebar: () => set((s) => ({ sidebar: { isOpen: !s.sidebar.isOpen } })),
  setSidebarOpen: (open) => set({ sidebar: { isOpen: open } }),

  inspector: { isOpen: true, activeTab: 'properties' },
  toggleInspector: () =>
    set((s) => ({ inspector: { ...s.inspector, isOpen: !s.inspector.isOpen } })),
  setInspectorOpen: (open) => set((s) => ({ inspector: { ...s.inspector, isOpen: open } })),
  setInspectorTab: (tab) =>
    set((s) => ({
      inspector: { ...s.inspector, activeTab: tab },
      showCodePreview: tab === 'code',
    })),
  openInspectorTab: (tab) =>
    set({
      inspector: { isOpen: true, activeTab: tab },
      showCodePreview: tab === 'code',
    }),

  // ── Right drawer ──
  drawer: { isOpen: false, activePanel: null },
  openDrawer: (panel) => set({ drawer: { isOpen: true, activePanel: panel } }),
  closeDrawer: () => set({ drawer: { isOpen: false, activePanel: null } }),
  toggleDrawer: (panel) =>
    set((s) =>
      s.drawer.isOpen && s.drawer.activePanel === panel
        ? { drawer: { isOpen: false, activePanel: null } }
        : { drawer: { isOpen: true, activePanel: panel } },
    ),

  activityLog: [],
  appendLog: (entry) =>
    set((s) => {
      const newEntry: ActivityLogEntry = {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        ts: new Date().toISOString(),
        ...entry,
      };
      const log = [...s.activityLog, newEntry];
      return { activityLog: log.length > 200 ? log.slice(-200) : log };
    }),
  clearLog: () => set({ activityLog: [] }),

  backendStatus: 'unknown',
  setBackendStatus: (status) => set({ backendStatus: status }),

  editorMode: 'build',
  setEditorMode: (mode) => set({ editorMode: mode }),

  showLearningPanel: false,
  toggleLearningPanel: () => set((s) => ({ showLearningPanel: !s.showLearningPanel })),
  setShowLearningPanel: (show) => set({ showLearningPanel: show }),
  showScenarioGallery: false,
  toggleScenarioGallery: () => set((s) => ({ showScenarioGallery: !s.showScenarioGallery })),
  setShowScenarioGallery: (show) => set({ showScenarioGallery: show }),

  diffMode: false,
  diffDelta: null,
  diffVersion: 0,
  diffBaseArchitecture: null,
  setDiffMode: (mode, delta, base) =>
    set((s) => ({
      diffMode: mode,
      diffDelta: delta ?? null,
      diffBaseArchitecture: base ?? null,
      diffVersion: s.diffVersion + 1,
    })),
  clearDiffState: () =>
    set({
      diffMode: false,
      diffDelta: null,
      diffBaseArchitecture: null,
    }),

  isSoundMuted: true,
  toggleSound: () => set((s) => ({ isSoundMuted: !s.isSoundMuted })),

  themeVariant: (localStorage.getItem('cloudblocks:theme-variant') as ThemeVariant) || 'workshop',
  setThemeVariant: (variant) => {
    localStorage.setItem('cloudblocks:theme-variant', variant);
    // Ports are always shown — theme does not affect port visibility
    set({ themeVariant: variant });
  },

  showPorts: (() => {
    // Migration: support old localStorage key 'cloudblocks:show-studs'
    const oldStored = localStorage.getItem('cloudblocks:show-studs');
    if (oldStored !== null) {
      localStorage.setItem('cloudblocks:show-ports', oldStored);
      localStorage.removeItem('cloudblocks:show-studs');
      return oldStored === 'true';
    }
    const stored = localStorage.getItem('cloudblocks:show-ports');
    if (stored !== null) return stored === 'true';
    // Default to true: all blocks render port grids
    return true;
  })(),
  togglePorts: () =>
    set((s) => {
      const next = !s.showPorts;
      localStorage.setItem('cloudblocks:show-ports', String(next));
      return { showPorts: next };
    }),
  setShowPorts: (show) => {
    localStorage.setItem('cloudblocks:show-ports', String(show));
    set({ showPorts: show });
  },

  gridStyle:
    (localStorage.getItem('cloudblocks:grid-style') as 'paper' | 'dot' | 'none') || 'paper',
  setGridStyle: (style) => {
    localStorage.setItem('cloudblocks:grid-style', style);
    set({ gridStyle: style });
  },
  cycleGridStyle: () =>
    set((s) => {
      const order: Array<'paper' | 'dot' | 'none'> = ['paper', 'dot', 'none'];
      const next = order[(order.indexOf(s.gridStyle) + 1) % order.length];
      localStorage.setItem('cloudblocks:grid-style', next);
      return { gridStyle: next };
    }),

  pendingGitHubAction: readPendingGitHubAction(),
  setPendingGitHubAction: (action) => {
    writePendingGitHubAction(action);
    set({ pendingGitHubAction: action });
  },
  pendingLinkRepo: null,
  setPendingLinkRepo: (fullName) => set({ pendingLinkRepo: fullName }),

  compareReviewPrefill: null,
  setCompareReviewPrefill: (prefill) => set({ compareReviewPrefill: prefill }),

  showOnboarding: !localStorage.getItem('cloudblocks:onboarding-completed'),
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  complexityLevel: 'beginner',

  upgradingBlockId: null,
  triggerUpgradeAnimation: (blockId) => {
    set({ upgradingBlockId: blockId });
    setTimeout(() => {
      set((s) => (s.upgradingBlockId === blockId ? { upgradingBlockId: null } : s));
    }, 1600);
  },

  snapTargetBlockIds: new Set<string>(),
  triggerSnapAnimation: (blockId) => {
    set((s) => {
      const next = new Set(s.snapTargetBlockIds);
      next.add(blockId);
      return { snapTargetBlockIds: next };
    });
    setTimeout(() => {
      set((s) => {
        if (!s.snapTargetBlockIds.has(blockId)) return s;
        const next = new Set(s.snapTargetBlockIds);
        next.delete(blockId);
        return { snapTargetBlockIds: next };
      });
    }, 500);
  },

  magneticSnapTargetId: null,
  setMagneticSnapTarget: (id) => set({ magneticSnapTargetId: id }),

  labelModeOverride: 'auto',
  canvasZoom: 0.85,
  effectiveLabelMode: computeAutoLabelMode(0.85, 'learning'),
  labelMode: computeAutoLabelMode(0.85, 'learning'),
  setLabelModeOverride: (mode) =>
    set((s) => {
      const effectiveLabelMode = computeEffectiveLabelMode(
        mode,
        s.canvasZoom,
        s.effectiveLabelMode,
      );
      return {
        labelModeOverride: mode,
        effectiveLabelMode,
        labelMode: effectiveLabelMode,
      };
    }),
  setCanvasZoom: (zoom) =>
    set((s) => {
      const effectiveLabelMode = computeEffectiveLabelMode(
        s.labelModeOverride,
        zoom,
        s.effectiveLabelMode,
      );
      return {
        canvasZoom: zoom,
        effectiveLabelMode,
        labelMode: effectiveLabelMode,
      };
    }),
  fitToContentRequested: false,
  requestFitToContent: () => set({ fitToContentRequested: true }),
  clearFitToContentRequest: () => set({ fitToContentRequested: false }),
  setLabelMode: (mode) =>
    set({
      labelModeOverride: mode,
      effectiveLabelMode: mode,
      labelMode: mode,
    }),
  cycleLabelMode: () => {
    const order: Array<LabelMode | 'auto'> = ['auto', 'compact', 'learning', 'inspect'];
    const current = get().labelModeOverride;
    const next = order[(order.indexOf(current) + 1) % order.length];
    set((s) => {
      const effectiveLabelMode = computeEffectiveLabelMode(
        next,
        s.canvasZoom,
        s.effectiveLabelMode,
      );
      return {
        labelModeOverride: next,
        effectiveLabelMode,
        labelMode: effectiveLabelMode,
      };
    });
  },

  // ── Block status overlay (#1591) ──
  blockStatuses: new Map<string, BlockStatus>(),
  setBlockStatus: (blockId, status) => {
    set((s) => {
      const next = new Map(s.blockStatuses);
      next.set(blockId, { ...next.get(blockId), ...status });
      return { blockStatuses: next };
    });
  },
  clearBlockStatus: (blockId) => {
    set((s) => {
      const next = new Map(s.blockStatuses);
      next.delete(blockId);
      return { blockStatuses: next };
    });
  },
}));

// One-time cleanup of legacy persona localStorage key
if (typeof window !== 'undefined') {
  localStorage.removeItem('cloudblocks:persona');
}
