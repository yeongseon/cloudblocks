import { create } from 'zustand';
import type { BlockCategory } from '../models/types';

export type ToolMode = 'select' | 'connect' | 'delete';

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

  // ── Panel visibility ──
  showBlockPalette: boolean;
  toggleBlockPalette: () => void;
  showProperties: boolean;
  toggleProperties: () => void;
  showValidation: boolean;
  toggleValidation: () => void;
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

  showBlockPalette: true,
  toggleBlockPalette: () =>
    set((s) => ({ showBlockPalette: !s.showBlockPalette })),

  showProperties: true,
  toggleProperties: () =>
    set((s) => ({ showProperties: !s.showProperties })),

  showValidation: false,
  toggleValidation: () =>
    set((s) => ({ showValidation: !s.showValidation })),
}));
