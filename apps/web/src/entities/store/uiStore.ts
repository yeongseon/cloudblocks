import { create } from 'zustand';
import type { BlockCategory } from '../../shared/types/index';
import type { EditorMode } from '../../shared/types/learning';

export type ToolMode = 'select' | 'connect' | 'delete';
export type { EditorMode } from '../../shared/types/learning';

interface UIState {
  // ── Selection ──
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  // ── Tool mode ──
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;

  // ── Connection mode ──
  connectionSource: string | null;
  setConnectionSource: (id: string | null) => void;

  // ── Drag state ──
  draggedBlockCategory: BlockCategory | null;
  setDraggedBlockCategory: (category: BlockCategory | null) => void;
  draggedResourceName: string | null;
  setDraggedResourceName: (name: string | null) => void;
  cancelDrag: () => void;

  // ── Panel visibility ──
  showBlockPalette: boolean;
  toggleBlockPalette: () => void;
  showProperties: boolean;
  toggleProperties: () => void;
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

  // ── Editor mode ──
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;

  // ── Learning panels ──
  showLearningPanel: boolean;
  toggleLearningPanel: () => void;
  showScenarioGallery: boolean;
  toggleScenarioGallery: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  toolMode: 'select',
  setToolMode: (mode) =>
    set({ toolMode: mode, connectionSource: null }),

  connectionSource: null,
  setConnectionSource: (id) => set({ connectionSource: id }),

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

  showProperties: true,
  toggleProperties: () =>
    set((s) => ({ showProperties: !s.showProperties })),

  showValidation: false,
  toggleValidation: () =>
    set((s) => ({ showValidation: !s.showValidation })),

  showCodePreview: false,
  toggleCodePreview: () =>
    set((s) => ({ showCodePreview: !s.showCodePreview })),

  showWorkspaceManager: false,
  toggleWorkspaceManager: () =>
    set((s) => ({ showWorkspaceManager: !s.showWorkspaceManager })),

  showTemplateGallery: false,
  toggleTemplateGallery: () =>
    set((s) => ({ showTemplateGallery: !s.showTemplateGallery })),

  showGitHubLogin: false,
  toggleGitHubLogin: () =>
    set((s) => ({ showGitHubLogin: !s.showGitHubLogin })),

  showGitHubRepos: false,
  toggleGitHubRepos: () =>
    set((s) => ({ showGitHubRepos: !s.showGitHubRepos })),

  showGitHubSync: false,
  toggleGitHubSync: () =>
    set((s) => ({ showGitHubSync: !s.showGitHubSync })),

  showGitHubPR: false,
  toggleGitHubPR: () =>
    set((s) => ({ showGitHubPR: !s.showGitHubPR })),

  editorMode: 'build',
  setEditorMode: (mode) => set({ editorMode: mode }),

  showLearningPanel: false,
  toggleLearningPanel: () =>
    set((s) => ({ showLearningPanel: !s.showLearningPanel })),
  showScenarioGallery: false,
  toggleScenarioGallery: () =>
    set((s) => ({ showScenarioGallery: !s.showScenarioGallery })),
}));
