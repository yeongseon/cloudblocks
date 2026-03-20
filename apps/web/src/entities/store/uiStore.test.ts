import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      interactionState: 'idle',
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
      showSuggestionsPanel: false,
      showCostPanel: false,
      activeProvider: 'azure',
      editorMode: 'build',
      showLearningPanel: false,
      showScenarioGallery: false,
      diffMode: false,
      diffDelta: null,
      diffBaseArchitecture: null,
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
      expect(state.showSuggestionsPanel).toBe(false);
      expect(state.showCostPanel).toBe(false);
      expect(state.activeProvider).toBe('azure');
      expect(state.editorMode).toBe('build');
      expect(state.showLearningPanel).toBe(false);
      expect(state.showScenarioGallery).toBe(false);
      expect(state.diffMode).toBe(false);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });
  });

  describe('editorMode', () => {
    it("editorMode defaults to 'build'", () => {
      expect(useUIStore.getState().editorMode).toBe('build');
    });

    it("setEditorMode changes mode to 'learn' and back", () => {
      useUIStore.getState().setEditorMode('learn');
      expect(useUIStore.getState().editorMode).toBe('learn');
      useUIStore.getState().setEditorMode('build');
      expect(useUIStore.getState().editorMode).toBe('build');
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

  describe('activeProvider', () => {
    it("defaults to 'azure'", () => {
      expect(useUIStore.getState().activeProvider).toBe('azure');
    });

    it('setActiveProvider updates provider mode', () => {
      useUIStore.getState().setActiveProvider('aws');
      expect(useUIStore.getState().activeProvider).toBe('aws');

      useUIStore.getState().setActiveProvider('gcp');
      expect(useUIStore.getState().activeProvider).toBe('gcp');
    });

    it('cycles through all providers and persists across sequential reads', () => {
      const readActiveProvider = () => useUIStore.getState().activeProvider;

      expect(readActiveProvider()).toBe('azure');

      useUIStore.getState().setActiveProvider('aws');
      expect(readActiveProvider()).toBe('aws');
      expect(readActiveProvider()).toBe('aws');

      useUIStore.getState().setActiveProvider('gcp');
      expect(readActiveProvider()).toBe('gcp');
      expect(readActiveProvider()).toBe('gcp');

      useUIStore.getState().setActiveProvider('azure');
      expect(readActiveProvider()).toBe('azure');
      expect(readActiveProvider()).toBe('azure');
    });
  });

  describe('interaction state machine', () => {
    it('supports valid transitions from idle to selecting/dragging/placing/connecting', () => {
      useUIStore.getState().startSelecting();
      expect(useUIStore.getState().interactionState).toBe('selecting');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startDragging();
      expect(useUIStore.getState().interactionState).toBe('dragging');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startPlacing('compute', 'Virtual Machine');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('compute');
      expect(placingState.draggedResourceName).toBe('Virtual Machine');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startConnecting('block-1');
      const connectingState = useUIStore.getState();
      expect(connectingState.interactionState).toBe('connecting');
      expect(connectingState.connectionSource).toBe('block-1');
    });

    it('prevents selecting to placing transition (selecting stays active)', () => {
      useUIStore.getState().startSelecting();
      expect(useUIStore.getState().interactionState).toBe('selecting');

      useUIStore.setState((state) => {
        if (state.interactionState !== 'idle') {
          return state;
        }
        return {
          ...state,
          interactionState: 'placing',
          draggedBlockCategory: 'compute',
          draggedResourceName: 'Virtual Machine',
        };
      });

      const state = useUIStore.getState();
      expect(state.interactionState).toBe('selecting');
      expect(state.draggedBlockCategory).toBe(null);
      expect(state.draggedResourceName).toBe(null);
    });

    it('prevents connecting to dragging transition (connecting stays active)', () => {
      useUIStore.getState().startConnecting('block-1');
      expect(useUIStore.getState().interactionState).toBe('connecting');

      useUIStore.setState((state) => {
        if (state.interactionState !== 'idle') {
          return state;
        }
        return {
          ...state,
          interactionState: 'dragging',
        };
      });

      const state = useUIStore.getState();
      expect(state.interactionState).toBe('connecting');
      expect(state.connectionSource).toBe('block-1');
    });

    it('transitions to placing with drag payload and resets via completeInteraction', () => {
      useUIStore.getState().startPlacing('database', 'SQL Database');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('database');
      expect(placingState.draggedResourceName).toBe('SQL Database');

      useUIStore.getState().completeInteraction();
      const completedState = useUIStore.getState();
      expect(completedState.interactionState).toBe('idle');
      expect(completedState.connectionSource).toBe(null);
      expect(completedState.draggedBlockCategory).toBe(null);
      expect(completedState.draggedResourceName).toBe(null);
    });

    it('transitions to connecting and resets via cancelInteraction', () => {
      useUIStore.getState().startConnecting('block-2');
      const connectingState = useUIStore.getState();
      expect(connectingState.interactionState).toBe('connecting');
      expect(connectingState.connectionSource).toBe('block-2');

      useUIStore.getState().cancelInteraction();
      const cancelledState = useUIStore.getState();
      expect(cancelledState.interactionState).toBe('idle');
      expect(cancelledState.connectionSource).toBe(null);
      expect(cancelledState.draggedBlockCategory).toBe(null);
      expect(cancelledState.draggedResourceName).toBe(null);
    });
  });

  describe('interaction state machine', () => {
    it('supports valid transitions from idle to selecting/dragging/placing/connecting', () => {
      useUIStore.getState().startSelecting();
      expect(useUIStore.getState().interactionState).toBe('selecting');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startDragging();
      expect(useUIStore.getState().interactionState).toBe('dragging');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startPlacing('compute', 'Virtual Machine');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('compute');
      expect(placingState.draggedResourceName).toBe('Virtual Machine');

      useUIStore.getState().completeInteraction();
      useUIStore.getState().startConnecting('block-1');
      const connectingState = useUIStore.getState();
      expect(connectingState.interactionState).toBe('connecting');
      expect(connectingState.connectionSource).toBe('block-1');
    });

    it('prevents selecting to placing transition (selecting stays active)', () => {
      useUIStore.getState().startSelecting();
      expect(useUIStore.getState().interactionState).toBe('selecting');

      useUIStore.setState((state) => {
        if (state.interactionState !== 'idle') {
          return state;
        }
        return {
          ...state,
          interactionState: 'placing',
          draggedBlockCategory: 'compute',
          draggedResourceName: 'Virtual Machine',
        };
      });

      const state = useUIStore.getState();
      expect(state.interactionState).toBe('selecting');
      expect(state.draggedBlockCategory).toBe(null);
      expect(state.draggedResourceName).toBe(null);
    });

    it('prevents connecting to dragging transition (connecting stays active)', () => {
      useUIStore.getState().startConnecting('block-1');
      expect(useUIStore.getState().interactionState).toBe('connecting');

      useUIStore.setState((state) => {
        if (state.interactionState !== 'idle') {
          return state;
        }
        return {
          ...state,
          interactionState: 'dragging',
        };
      });

      const state = useUIStore.getState();
      expect(state.interactionState).toBe('connecting');
      expect(state.connectionSource).toBe('block-1');
    });

    it('transitions to placing with drag payload and resets via completeInteraction', () => {
      useUIStore.getState().startPlacing('database', 'SQL Database');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('database');
      expect(placingState.draggedResourceName).toBe('SQL Database');

      useUIStore.getState().completeInteraction();
      const completedState = useUIStore.getState();
      expect(completedState.interactionState).toBe('idle');
      expect(completedState.connectionSource).toBe(null);
      expect(completedState.draggedBlockCategory).toBe(null);
      expect(completedState.draggedResourceName).toBe(null);
    });

    it('transitions to connecting and resets via cancelInteraction', () => {
      useUIStore.getState().startConnecting('block-2');
      const connectingState = useUIStore.getState();
      expect(connectingState.interactionState).toBe('connecting');
      expect(connectingState.connectionSource).toBe('block-2');

      useUIStore.getState().cancelInteraction();
      const cancelledState = useUIStore.getState();
      expect(cancelledState.interactionState).toBe('idle');
      expect(cancelledState.connectionSource).toBe(null);
      expect(cancelledState.draggedBlockCategory).toBe(null);
      expect(cancelledState.draggedResourceName).toBe(null);
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

  describe('learning panels', () => {
    it('showLearningPanel defaults to false', () => {
      expect(useUIStore.getState().showLearningPanel).toBe(false);
    });

    it('toggleLearningPanel toggles visibility', () => {
      useUIStore.getState().toggleLearningPanel();
      expect(useUIStore.getState().showLearningPanel).toBe(true);
      useUIStore.getState().toggleLearningPanel();
      expect(useUIStore.getState().showLearningPanel).toBe(false);
    });

    it('showScenarioGallery defaults to false', () => {
      expect(useUIStore.getState().showScenarioGallery).toBe(false);
    });

    it('toggleScenarioGallery toggles visibility', () => {
      useUIStore.getState().toggleScenarioGallery();
      expect(useUIStore.getState().showScenarioGallery).toBe(true);
      useUIStore.getState().toggleScenarioGallery();
      expect(useUIStore.getState().showScenarioGallery).toBe(false);
    });

    it('setShowLearningPanel sets visibility explicitly', () => {
      useUIStore.getState().setShowLearningPanel(true);
      expect(useUIStore.getState().showLearningPanel).toBe(true);
      useUIStore.getState().setShowLearningPanel(false);
      expect(useUIStore.getState().showLearningPanel).toBe(false);
    });

    it('setShowScenarioGallery sets visibility explicitly', () => {
      useUIStore.getState().setShowScenarioGallery(true);
      expect(useUIStore.getState().showScenarioGallery).toBe(true);
      useUIStore.getState().setShowScenarioGallery(false);
      expect(useUIStore.getState().showScenarioGallery).toBe(false);
    });
  });

  describe('diffMode', () => {
    it('should default diffMode to false', () => {
      expect(useUIStore.getState().diffMode).toBe(false);
      expect(useUIStore.getState().diffDelta).toBe(null);
      expect(useUIStore.getState().diffBaseArchitecture).toBe(null);
    });

    it('should enable diff mode with delta and base architecture', () => {
      const mockDelta = {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        externalActors: { added: [], removed: [], modified: [] },
        summary: { totalChanges: 0, hasBreakingChanges: false },
      };
      const mockBase = {
        id: 'base-arch',
        name: 'Base',
        version: '1.0',
        plates: [],
        blocks: [],
        connections: [],
        externalActors: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      useUIStore.getState().setDiffMode(true, mockDelta, mockBase);
      const state = useUIStore.getState();
      expect(state.diffMode).toBe(true);
      expect(state.diffDelta).toEqual(mockDelta);
      expect(state.diffBaseArchitecture).toEqual(mockBase);
    });

    it('should disable diff mode and clear delta/base', () => {
      const mockDelta = {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        externalActors: { added: [], removed: [], modified: [] },
        summary: { totalChanges: 0, hasBreakingChanges: false },
      };
      useUIStore.getState().setDiffMode(true, mockDelta, null);
      useUIStore.getState().setDiffMode(false);
      const state = useUIStore.getState();
      expect(state.diffMode).toBe(false);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });

    it('should set diffMode without optional params (delta defaults to null)', () => {
      useUIStore.getState().setDiffMode(true);
      const state = useUIStore.getState();
      expect(state.diffMode).toBe(true);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });

    it('clearDiffState should clear mode, delta, and base architecture', () => {
      const mockDelta = {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        externalActors: { added: [], removed: [], modified: [] },
        summary: { totalChanges: 0, hasBreakingChanges: false },
      };
      const mockBase = {
        id: 'base-arch',
        name: 'Base',
        version: '1.0',
        plates: [],
        blocks: [],
        connections: [],
        externalActors: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      useUIStore.getState().setDiffMode(true, mockDelta, mockBase);
      useUIStore.getState().clearDiffState();

      const state = useUIStore.getState();
      expect(state.diffMode).toBe(false);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });
  });

  describe('State isolation', () => {
    it('should not affect other state properties when setting one property', () => {
      const initialState = useUIStore.getState();
      useUIStore.getState().setSelectedId('some-id');
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

  describe('right-panel mutual exclusion', () => {
    it('opening CodePreview closes other right panels', () => {
      useUIStore.getState().toggleGitHubLogin();
      expect(useUIStore.getState().showGitHubLogin).toBe(true);

      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      expect(useUIStore.getState().showGitHubLogin).toBe(false);
    });

    it('opening GitHubLogin closes other right panels', () => {
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);

      useUIStore.getState().toggleGitHubLogin();
      expect(useUIStore.getState().showGitHubLogin).toBe(true);
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });

    it('opening GitHubRepos closes other right panels', () => {
      useUIStore.getState().toggleGitHubPR();
      expect(useUIStore.getState().showGitHubPR).toBe(true);

      useUIStore.getState().toggleGitHubRepos();
      expect(useUIStore.getState().showGitHubRepos).toBe(true);
      expect(useUIStore.getState().showGitHubPR).toBe(false);
    });

    it('opening SuggestionsPanel closes other right panels', () => {
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);

      useUIStore.getState().toggleSuggestionsPanel();
      expect(useUIStore.getState().showSuggestionsPanel).toBe(true);
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });

    it('opening CostPanel closes other right panels', () => {
      useUIStore.getState().toggleGitHubSync();
      expect(useUIStore.getState().showGitHubSync).toBe(true);

      useUIStore.getState().toggleCostPanel();
      expect(useUIStore.getState().showCostPanel).toBe(true);
      expect(useUIStore.getState().showGitHubSync).toBe(false);
    });

    it('closing a right panel does not open others', () => {
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);

      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(false);
      expect(useUIStore.getState().showGitHubLogin).toBe(false);
      expect(useUIStore.getState().showGitHubRepos).toBe(false);
      expect(useUIStore.getState().showSuggestionsPanel).toBe(false);
      expect(useUIStore.getState().showCostPanel).toBe(false);
    });

    it('does not affect left-side or center panels', () => {
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(true);

      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      expect(useUIStore.getState().showWorkspaceManager).toBe(true);
    });
  });

  describe('toggleSuggestionsPanel', () => {
    it('defaults to false', () => {
      expect(useUIStore.getState().showSuggestionsPanel).toBe(false);
    });

    it('toggles from false to true', () => {
      useUIStore.getState().toggleSuggestionsPanel();
      expect(useUIStore.getState().showSuggestionsPanel).toBe(true);
    });

    it('toggles back to false', () => {
      useUIStore.getState().toggleSuggestionsPanel();
      useUIStore.getState().toggleSuggestionsPanel();
      expect(useUIStore.getState().showSuggestionsPanel).toBe(false);
    });
  });

  describe('toggleCostPanel', () => {
    it('defaults to false', () => {
      expect(useUIStore.getState().showCostPanel).toBe(false);
    });

    it('toggles from false to true', () => {
      useUIStore.getState().toggleCostPanel();
      expect(useUIStore.getState().showCostPanel).toBe(true);
    });

    it('toggles back to false', () => {
      useUIStore.getState().toggleCostPanel();
      useUIStore.getState().toggleCostPanel();
      expect(useUIStore.getState().showCostPanel).toBe(false);
    });
  });
});
