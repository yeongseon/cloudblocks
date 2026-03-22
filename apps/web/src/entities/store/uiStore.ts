import { create } from 'zustand';
import type { BlockCategory, ProviderType } from '@cloudblocks/schema';
import type { EditorMode } from '../../shared/types/learning';
import type { DiffDelta } from '../../shared/types/diff';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { Persona, ComplexityLevel } from '../../shared/types';
import { PERSONA_COMPLEXITY_MAP, PERSONA_PANEL_DEFAULTS } from '../../shared/types';

export type ToolMode = 'select' | 'connect' | 'delete';
export type InteractionState = 'idle' | 'selecting' | 'dragging' | 'placing' | 'connecting';
export type BackendStatus = 'unknown' | 'not_configured' | 'available' | 'unavailable';
export type { EditorMode } from '../../shared/types/learning';
export type { Persona, ComplexityLevel } from '../../shared/types';

interface UIState {
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
  startPlacing: (category: BlockCategory, resourceName: string) => void;
  startConnecting: (sourceId: string) => void;
  startDragging: () => void;
  startSelecting: () => void;
  cancelInteraction: () => void;
  completeInteraction: () => void;

  // ── Drag state ──
  draggedBlockCategory: BlockCategory | null;
  setDraggedBlockCategory: (category: BlockCategory | null) => void;
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
  setDiffMode: (
    mode: boolean,
    delta?: DiffDelta | null,
    base?: ArchitectureModel | null,
  ) => void;
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

  // ── Resource self-animation ──
  upgradingBlockId: string | null;
  triggerUpgradeAnimation: (blockId: string) => void;
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

export const useUIStore = create<UIState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  toolMode: 'select',
  setToolMode: (mode) =>
    set({ toolMode: mode, connectionSource: null }),

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
  setDraggedBlockCategory: (category) =>
    set({ draggedBlockCategory: category }),
  draggedResourceName: null,
  setDraggedResourceName: (name) => set({ draggedResourceName: name }),
  cancelDrag: () =>
    set({ draggedBlockCategory: null, draggedResourceName: null }),

  showBlockPalette: true,
  toggleBlockPalette: () =>
    set((s) => ({ showBlockPalette: !s.showBlockPalette })),

  showResourceGuide: true,
  toggleResourceGuide: () =>
    set((s) => ({ showResourceGuide: !s.showResourceGuide })),

  showValidation: false,
  toggleValidation: () =>
    set((s) => ({ showValidation: !s.showValidation })),

  showCodePreview: false,
  toggleCodePreview: () =>
    set((s) => ({
      showCodePreview: !s.showCodePreview,
      ...(!s.showCodePreview ? closeOtherRightPanels('showCodePreview') : {}),
    })),

  showWorkspaceManager: false,
  toggleWorkspaceManager: () =>
    set((s) => ({ showWorkspaceManager: !s.showWorkspaceManager })),

  showTemplateGallery: false,
  toggleTemplateGallery: () =>
    set((s) => ({ showTemplateGallery: !s.showTemplateGallery })),

  showGitHubLogin: false,
  toggleGitHubLogin: () =>
    set((s) => ({
      showGitHubLogin: !s.showGitHubLogin,
      ...(!s.showGitHubLogin ? closeOtherRightPanels('showGitHubLogin') : {}),
    })),

  showGitHubRepos: false,
  toggleGitHubRepos: () =>
    set((s) => ({
      showGitHubRepos: !s.showGitHubRepos,
      ...(!s.showGitHubRepos ? closeOtherRightPanels('showGitHubRepos') : {}),
    })),

  showGitHubSync: false,
  toggleGitHubSync: () =>
    set((s) => ({
      showGitHubSync: !s.showGitHubSync,
      ...(!s.showGitHubSync ? closeOtherRightPanels('showGitHubSync') : {}),
    })),

  showGitHubPR: false,
  toggleGitHubPR: () =>
    set((s) => ({
      showGitHubPR: !s.showGitHubPR,
      ...(!s.showGitHubPR ? closeOtherRightPanels('showGitHubPR') : {}),
    })),

  showSuggestionsPanel: false,
  toggleSuggestionsPanel: () =>
    set((s) => ({
      showSuggestionsPanel: !s.showSuggestionsPanel,
      ...(!s.showSuggestionsPanel ? closeOtherRightPanels('showSuggestionsPanel') : {}),
    })),

  showCostPanel: false,
  toggleCostPanel: () =>
    set((s) => ({
      showCostPanel: !s.showCostPanel,
      ...(!s.showCostPanel ? closeOtherRightPanels('showCostPanel') : {}),
    })),

  backendStatus: 'unknown',
  setBackendStatus: (status) => set({ backendStatus: status }),

  editorMode: 'build',
  setEditorMode: (mode) => set({ editorMode: mode }),

  showLearningPanel: false,
  toggleLearningPanel: () =>
    set((s) => ({ showLearningPanel: !s.showLearningPanel })),
  setShowLearningPanel: (show) => set({ showLearningPanel: show }),
  showScenarioGallery: false,
  toggleScenarioGallery: () =>
    set((s) => ({ showScenarioGallery: !s.showScenarioGallery })),
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

  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  persona: (localStorage.getItem('cloudblocks:persona') as Persona | null),
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
      set((s) => s.upgradingBlockId === blockId ? { upgradingBlockId: null } : s);
    }, 1600);
  },
}));
