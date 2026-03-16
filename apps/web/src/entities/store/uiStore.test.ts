import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
      showBlockPalette: true,
      showProperties: true,
      showValidation: false,
      showCodePreview: false,
      showWorkspaceManager: false,
      showTemplateGallery: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
    });
  });

  describe('Initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();
      expect(state.selectedId).toBe(null);
      expect(state.toolMode).toBe('select');
      expect(state.connectionSource).toBe(null);
      expect(state.draggedBlockCategory).toBe(null);
      expect(state.showBlockPalette).toBe(true);
      expect(state.showProperties).toBe(true);
      expect(state.showValidation).toBe(false);
      expect(state.showCodePreview).toBe(false);
      expect(state.showWorkspaceManager).toBe(false);
      expect(state.showTemplateGallery).toBe(false);
      expect(state.showGitHubLogin).toBe(false);
      expect(state.showGitHubRepos).toBe(false);
      expect(state.showGitHubSync).toBe(false);
      expect(state.showGitHubPR).toBe(false);
    });
  });

  describe('setSelectedId', () => {
    it('should set selectedId when given a string', () => {
      useUIStore.getState().setSelectedId('some-id');
      expect(useUIStore.getState().selectedId).toBe('some-id');
    });

    it('should set selectedId to null when given null', () => {
      useUIStore.getState().setSelectedId('some-id');
      useUIStore.getState().setSelectedId(null);
      expect(useUIStore.getState().selectedId).toBe(null);
    });

    it('should overwrite previousSelectedId', () => {
      useUIStore.getState().setSelectedId('id-1');
      expect(useUIStore.getState().selectedId).toBe('id-1');
      useUIStore.getState().setSelectedId('id-2');
      expect(useUIStore.getState().selectedId).toBe('id-2');
    });
  });

  describe('setToolMode', () => {
    it('should set toolMode to connect', () => {
      useUIStore.getState().setToolMode('connect');
      expect(useUIStore.getState().toolMode).toBe('connect');
    });

    it('should set toolMode to delete', () => {
      useUIStore.getState().setToolMode('delete');
      expect(useUIStore.getState().toolMode).toBe('delete');
    });

    it('should set toolMode back to select', () => {
      useUIStore.getState().setToolMode('connect');
      useUIStore.getState().setToolMode('select');
      expect(useUIStore.getState().toolMode).toBe('select');
    });

    it('should clear connectionSource when setToolMode is called', () => {
      useUIStore.getState().setConnectionSource('block-1');
      expect(useUIStore.getState().connectionSource).toBe('block-1');
      useUIStore.getState().setToolMode('connect');
      expect(useUIStore.getState().connectionSource).toBe(null);
    });

    it('should clear connectionSource even when setting same toolMode', () => {
      useUIStore.getState().setConnectionSource('block-1');
      useUIStore.getState().setToolMode('select');
      expect(useUIStore.getState().connectionSource).toBe(null);
    });
  });

  describe('setConnectionSource', () => {
    it('should set connectionSource when given a block ID', () => {
      useUIStore.getState().setConnectionSource('block-1');
      expect(useUIStore.getState().connectionSource).toBe('block-1');
    });

    it('should set connectionSource to null', () => {
      useUIStore.getState().setConnectionSource('block-1');
      useUIStore.getState().setConnectionSource(null);
      expect(useUIStore.getState().connectionSource).toBe(null);
    });

    it('should overwrite previous connectionSource', () => {
      useUIStore.getState().setConnectionSource('block-1');
      expect(useUIStore.getState().connectionSource).toBe('block-1');
      useUIStore.getState().setConnectionSource('block-2');
      expect(useUIStore.getState().connectionSource).toBe('block-2');
    });

    it('should not affect toolMode when setting connectionSource', () => {
      useUIStore.getState().setToolMode('connect');
      useUIStore.getState().setConnectionSource('block-1');
      expect(useUIStore.getState().toolMode).toBe('connect');
      expect(useUIStore.getState().connectionSource).toBe('block-1');
    });
  });

  describe('setDraggedBlockCategory', () => {
    it('should set draggedBlockCategory to compute', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      expect(useUIStore.getState().draggedBlockCategory).toBe('compute');
    });

    it('should set draggedBlockCategory to database', () => {
      useUIStore.getState().setDraggedBlockCategory('database');
      expect(useUIStore.getState().draggedBlockCategory).toBe('database');
    });

    it('should set draggedBlockCategory to storage', () => {
      useUIStore.getState().setDraggedBlockCategory('storage');
      expect(useUIStore.getState().draggedBlockCategory).toBe('storage');
    });

    it('should set draggedBlockCategory to gateway', () => {
      useUIStore.getState().setDraggedBlockCategory('gateway');
      expect(useUIStore.getState().draggedBlockCategory).toBe('gateway');
    });

    it('should clear draggedBlockCategory when given null', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      useUIStore.getState().setDraggedBlockCategory(null);
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
    });

    it('should overwrite previous draggedBlockCategory', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      useUIStore.getState().setDraggedBlockCategory('database');
      expect(useUIStore.getState().draggedBlockCategory).toBe('database');
    });
  });

  describe('setDraggedResourceName', () => {
    it('should set draggedResourceName to a string value', () => {
      useUIStore.getState().setDraggedResourceName('VM-Instance');
      expect(useUIStore.getState().draggedResourceName).toBe('VM-Instance');
    });

    it('should clear draggedResourceName when given null', () => {
      useUIStore.getState().setDraggedResourceName('VM-Instance');
      useUIStore.getState().setDraggedResourceName(null);
      expect(useUIStore.getState().draggedResourceName).toBe(null);
    });

    it('should overwrite previous draggedResourceName', () => {
      useUIStore.getState().setDraggedResourceName('VM-Instance');
      expect(useUIStore.getState().draggedResourceName).toBe('VM-Instance');
      useUIStore.getState().setDraggedResourceName('SQL-Database');
      expect(useUIStore.getState().draggedResourceName).toBe('SQL-Database');
    });
  });

  describe('cancelDrag', () => {
    it('should clear both draggedBlockCategory and draggedResourceName', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      useUIStore.getState().setDraggedResourceName('VM-Instance');
      expect(useUIStore.getState().draggedBlockCategory).toBe('compute');
      expect(useUIStore.getState().draggedResourceName).toBe('VM-Instance');
      useUIStore.getState().cancelDrag();
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
      expect(useUIStore.getState().draggedResourceName).toBe(null);
    });

    it('should work when both are already null', () => {
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
      expect(useUIStore.getState().draggedResourceName).toBe(null);
      useUIStore.getState().cancelDrag();
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
      expect(useUIStore.getState().draggedResourceName).toBe(null);
    });

    it('should clear draggedResourceName even if draggedBlockCategory is already null', () => {
      useUIStore.getState().setDraggedResourceName('VM-Instance');
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
      expect(useUIStore.getState().draggedResourceName).toBe('VM-Instance');
      useUIStore.getState().cancelDrag();
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
      expect(useUIStore.getState().draggedResourceName).toBe(null);
    });
  });

  describe('toggleBlockPalette', () => {
    it('should toggle showBlockPalette from true to false', () => {
      expect(useUIStore.getState().showBlockPalette).toBe(true);
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
    });

    it('should toggle showBlockPalette back from false to true', () => {
      useUIStore.getState().toggleBlockPalette();
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showBlockPalette).toBe(true);
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(true);
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
    });
  });

  describe('toggleProperties', () => {
    it('should toggle showProperties from true to false', () => {
      expect(useUIStore.getState().showProperties).toBe(true);
      useUIStore.getState().toggleProperties();
      expect(useUIStore.getState().showProperties).toBe(false);
    });

    it('should toggle showProperties back from false to true', () => {
      useUIStore.getState().toggleProperties();
      useUIStore.getState().toggleProperties();
      expect(useUIStore.getState().showProperties).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showProperties).toBe(true);
      useUIStore.getState().toggleProperties();
      expect(useUIStore.getState().showProperties).toBe(false);
      useUIStore.getState().toggleProperties();
      expect(useUIStore.getState().showProperties).toBe(true);
    });
  });

  describe('toggleValidation', () => {
    it('should toggle showValidation from false to true', () => {
      expect(useUIStore.getState().showValidation).toBe(false);
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().showValidation).toBe(true);
    });

    it('should toggle showValidation back from true to false', () => {
      useUIStore.getState().toggleValidation();
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().showValidation).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showValidation).toBe(false);
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().showValidation).toBe(true);
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().showValidation).toBe(false);
    });
  });

  describe('toggleCodePreview', () => {
    it('should toggle showCodePreview from false to true', () => {
      expect(useUIStore.getState().showCodePreview).toBe(false);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
    });

    it('should toggle showCodePreview back from true to false', () => {
      useUIStore.getState().toggleCodePreview();
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showCodePreview).toBe(false);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });
  });

  describe('toggleWorkspaceManager', () => {
    it('should toggle showWorkspaceManager from false to true', () => {
      expect(useUIStore.getState().showWorkspaceManager).toBe(false);
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(true);
    });

    it('should toggle showWorkspaceManager back from true to false', () => {
      useUIStore.getState().toggleWorkspaceManager();
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showWorkspaceManager).toBe(false);
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(true);
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(false);
    });
  });

  describe('toggleTemplateGallery', () => {
    it('should toggle showTemplateGallery from false to true', () => {
      expect(useUIStore.getState().showTemplateGallery).toBe(false);
      useUIStore.getState().toggleTemplateGallery();
      expect(useUIStore.getState().showTemplateGallery).toBe(true);
    });

    it('should toggle showTemplateGallery back from true to false', () => {
      useUIStore.getState().toggleTemplateGallery();
      useUIStore.getState().toggleTemplateGallery();
      expect(useUIStore.getState().showTemplateGallery).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showTemplateGallery).toBe(false);
      useUIStore.getState().toggleTemplateGallery();
      expect(useUIStore.getState().showTemplateGallery).toBe(true);
      useUIStore.getState().toggleTemplateGallery();
      expect(useUIStore.getState().showTemplateGallery).toBe(false);
    });
  });

  describe('toggleGitHubLogin', () => {
    it('should default showGitHubLogin to false', () => {
      expect(useUIStore.getState().showGitHubLogin).toBe(false);
    });

    it('should toggle showGitHubLogin from false to true', () => {
      useUIStore.getState().toggleGitHubLogin();
      expect(useUIStore.getState().showGitHubLogin).toBe(true);
    });

    it('should toggle showGitHubLogin back to false', () => {
      useUIStore.getState().toggleGitHubLogin();
      useUIStore.getState().toggleGitHubLogin();
      expect(useUIStore.getState().showGitHubLogin).toBe(false);
    });
  });

  describe('toggleGitHubRepos', () => {
    it('should default showGitHubRepos to false', () => {
      expect(useUIStore.getState().showGitHubRepos).toBe(false);
    });

    it('should toggle showGitHubRepos from false to true', () => {
      useUIStore.getState().toggleGitHubRepos();
      expect(useUIStore.getState().showGitHubRepos).toBe(true);
    });

    it('should toggle showGitHubRepos back to false', () => {
      useUIStore.getState().toggleGitHubRepos();
      useUIStore.getState().toggleGitHubRepos();
      expect(useUIStore.getState().showGitHubRepos).toBe(false);
    });
  });

  describe('toggleGitHubSync', () => {
    it('should default showGitHubSync to false', () => {
      expect(useUIStore.getState().showGitHubSync).toBe(false);
    });

    it('should toggle showGitHubSync from false to true', () => {
      useUIStore.getState().toggleGitHubSync();
      expect(useUIStore.getState().showGitHubSync).toBe(true);
    });

    it('should toggle showGitHubSync back to false', () => {
      useUIStore.getState().toggleGitHubSync();
      useUIStore.getState().toggleGitHubSync();
      expect(useUIStore.getState().showGitHubSync).toBe(false);
    });
  });

  describe('toggleGitHubPR', () => {
    it('should default showGitHubPR to false', () => {
      expect(useUIStore.getState().showGitHubPR).toBe(false);
    });

    it('should toggle showGitHubPR from false to true', () => {
      useUIStore.getState().toggleGitHubPR();
      expect(useUIStore.getState().showGitHubPR).toBe(true);
    });

    it('should toggle showGitHubPR back to false', () => {
      useUIStore.getState().toggleGitHubPR();
      useUIStore.getState().toggleGitHubPR();
      expect(useUIStore.getState().showGitHubPR).toBe(false);
    });
  });

  describe('State isolation', () => {
    it('should not affect other state properties when setting one property', () => {
      const initialState = useUIStore.getState();
      useUIStore.getState().setSelectedId('id-1');
      expect(useUIStore.getState().toolMode).toBe(initialState.toolMode);
      expect(useUIStore.getState().showBlockPalette).toBe(initialState.showBlockPalette);
    });

    it('should not affect toolMode when toggling panels', () => {
      useUIStore.getState().setToolMode('connect');
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().toolMode).toBe('connect');
    });

    it('should allow independent manipulation of panel visibility', () => {
      useUIStore.getState().toggleBlockPalette();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
      expect(useUIStore.getState().showProperties).toBe(true);
      useUIStore.getState().toggleProperties();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
      expect(useUIStore.getState().showProperties).toBe(false);
    });
  });
});
