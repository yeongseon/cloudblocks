import { create } from 'zustand';
import type { ProviderType, ResourceCategory } from '@cloudblocks/schema';
import type { EditorMode } from '../../shared/types/learning';
import type { DiffDelta } from '../../shared/types/diff';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { Persona, ComplexityLevel } from '../../shared/types';
import type { ThemeVariant } from '../../shared/tokens/themeTokens';
import type { DrawerPanelId } from '../../widgets/right-drawer/panelRegistry';
import { PERSONA_COMPLEXITY_MAP, PERSONA_PANEL_DEFAULTS } from '../../shared/types';

export type ToolMode = 'select' | 'connect' | 'delete';
export type InteractionState = 'idle' | 'selecting' | 'dragging' | 'placing' | 'connecting';
export type BackendStatus = 'unknown' | 'not_configured' | 'available' | 'unavailable';
export type PendingGitHubAction = 'sync' | 'pr' | 'repos' | null;
export type AppView = 'landing' | 'builder';
export type InspectorTabId = 'properties' | 'code' | 'connections';
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
export type { Persona, ComplexityLevel } from '../../shared/types';

const PENDING_GITHUB_ACTION_KEY = 'cloudblocks_pending_github_action';

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
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

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
  startPlacing: (category: ResourceCategory, resourceName: string) => void;
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
  showTemplateGallery: boolean;
  toggleTemplateGallery: () => void;
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

  // ── Persona ──
  persona: Persona | null;
  complexityLevel: ComplexityLevel;
  setPersona: (persona: Persona) => void;

  // ── Sound preference ──
  isSoundMuted: boolean;
  toggleSound: () => void;

  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;

  showStuds: boolean;
  toggleStuds: () => void;
  setShowStuds: (show: boolean) => void;

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
  snapTargetBlockId: string | null;
  triggerSnapAnimation: (blockId: string) => void;
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
  appView: 'landing',
  setAppView: (view) => set({ appView: view }),
  goToLanding: () => set({ appView: 'landing' }),
  goToBuilder: () => set({ appView: 'builder' }),

  selectedId: null,
  setSelectedId: (id) => {
    set({ selectedId: id });
    if (id !== null) {
      get().openDrawer('properties');
    }
  },

  toolMode: 'select',
  setToolMode: (mode) => set({ toolMode: mode, connectionSource: null }),

  activeProvider: 'azure',
  setActiveProvider: (provider) => set({ activeProvider: provider }),

  connectionSource: null,
  setConnectionSource: (id) => set({ connectionSource: id }),

  interactionState: 'idle',

  startPlacing: (category, resourceName) =>
    set({
      interactionState: 'placing',
      draggedBlockCategory: category,
      draggedResourceName: resourceName,
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
    }),

  completeInteraction: () =>
    set({
      interactionState: 'idle',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
    }),

  draggedBlockCategory: null,
  setDraggedBlockCategory: (category) => set({ draggedBlockCategory: category }),
  draggedResourceName: null,
  setDraggedResourceName: (name) => set({ draggedResourceName: name }),
  cancelDrag: () => set({ draggedBlockCategory: null, draggedResourceName: null }),

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

  showTemplateGallery: false,
  toggleTemplateGallery: () => set((s) => ({ showTemplateGallery: !s.showTemplateGallery })),

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

  themeVariant: (localStorage.getItem('cloudblocks:theme-variant') as ThemeVariant) || 'blueprint',
  setThemeVariant: (variant) => {
    localStorage.setItem('cloudblocks:theme-variant', variant);
    const defaultStuds = variant === 'workshop';
    localStorage.setItem('cloudblocks:show-studs', String(defaultStuds));
    set({ themeVariant: variant, showStuds: defaultStuds });
  },

  showStuds: (() => {
    const stored = localStorage.getItem('cloudblocks:show-studs');
    if (stored !== null) return stored === 'true';
    const theme = localStorage.getItem('cloudblocks:theme-variant');
    return theme === 'workshop';
  })(),
  toggleStuds: () =>
    set((s) => {
      const next = !s.showStuds;
      localStorage.setItem('cloudblocks:show-studs', String(next));
      return { showStuds: next };
    }),
  setShowStuds: (show) => {
    localStorage.setItem('cloudblocks:show-studs', String(show));
    set({ showStuds: show });
  },

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

  persona: localStorage.getItem('cloudblocks:persona') as Persona | null,
  complexityLevel: (() => {
    const saved = localStorage.getItem('cloudblocks:persona') as Persona | null;
    return saved ? PERSONA_COMPLEXITY_MAP[saved] : 'beginner';
  })(),
  setPersona: (persona) => {
    localStorage.setItem('cloudblocks:persona', persona);
    const defaults = PERSONA_PANEL_DEFAULTS[persona];
    set({
      persona,
      complexityLevel: PERSONA_COMPLEXITY_MAP[persona],
      showBlockPalette: defaults.showBlockPalette,
      showResourceGuide: defaults.showResourceGuide,
      showValidation: defaults.showValidation,
      showCodePreview: defaults.showCodePreview,
      showLearningPanel: defaults.showLearningPanel,
      showTemplateGallery: defaults.showTemplateGallery,
    });
  },

  upgradingBlockId: null,
  triggerUpgradeAnimation: (blockId) => {
    set({ upgradingBlockId: blockId });
    setTimeout(() => {
      set((s) => (s.upgradingBlockId === blockId ? { upgradingBlockId: null } : s));
    }, 1600);
  },

  snapTargetBlockId: null,
  triggerSnapAnimation: (blockId) => {
    set({ snapTargetBlockId: blockId });
    setTimeout(() => {
      set((s) => (s.snapTargetBlockId === blockId ? { snapTargetBlockId: null } : s));
    }, 500);
  },
}));
