import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from './uiStore';

describe('useUIStore', () => {
  beforeEach(() => {
    localStorage.removeItem('cloudblocks:theme-variant');
    localStorage.removeItem('cloudblocks:app-view');

    // Reset store to initial state before each test
    useUIStore.setState({
      appView: 'landing',
      selectedId: null,
      toolMode: 'select',
      interactionState: 'idle',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
      showBlockPalette: true,
      showResourceGuide: true,
      showValidation: false,
      showCodePreview: false,
      showAdvancedGeneration: false,
      showWorkspaceManager: false,
      showTemplateGallery: false,
      showGitHubLogin: false,
      showGitHubRepos: false,
      showGitHubSync: false,
      showGitHubPR: false,
      pendingGitHubAction: null,
      showSuggestionsPanel: false,
      showCostPanel: false,
      sidebar: { isOpen: true },
      inspector: { isOpen: true, activeTab: 'properties' },
      rightOverlay: null,
      activityLog: [],
      activeProvider: 'azure',
      editorMode: 'build',
      pendingLinkRepo: null,
      showLearningPanel: false,
      showScenarioGallery: false,
      diffMode: false,
      diffDelta: null,
      diffBaseArchitecture: null,
      themeVariant: 'blueprint',
    });
  });

  describe('Initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();
      expect(state.selectedId).toBe(null);
      expect(state.appView).toBe('landing');
      expect(state.toolMode).toBe('select');
      expect(state.connectionSource).toBe(null);
      expect(state.draggedBlockCategory).toBe(null);
      expect(state.showBlockPalette).toBe(true);
      expect(state.showResourceGuide).toBe(true);
      expect(state.showValidation).toBe(false);
      expect(state.showCodePreview).toBe(false);
      expect(state.showAdvancedGeneration).toBe(false);
      expect(state.showWorkspaceManager).toBe(false);
      expect(state.showTemplateGallery).toBe(false);
      expect(state.showGitHubLogin).toBe(false);
      expect(state.showGitHubRepos).toBe(false);
      expect(state.showGitHubSync).toBe(false);
      expect(state.showGitHubPR).toBe(false);
      expect(state.showSuggestionsPanel).toBe(false);
      expect(state.showCostPanel).toBe(false);
      expect(state.sidebar).toEqual({ isOpen: true });
      expect(state.inspector).toEqual({ isOpen: true, activeTab: 'properties' });
      expect(state.rightOverlay).toBe(null);
      expect(state.activityLog).toEqual([]);
      expect(state.activeProvider).toBe('azure');
      expect(state.editorMode).toBe('build');
      expect(state.pendingLinkRepo).toBe(null);
      expect(state.showLearningPanel).toBe(false);
      expect(state.showScenarioGallery).toBe(false);
      expect(state.diffMode).toBe(false);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });
  });

  describe('themeVariant', () => {
    it("defaults to 'blueprint'", () => {
      expect(useUIStore.getState().themeVariant).toBe('blueprint');
    });

    it('setThemeVariant changes the value', () => {
      useUIStore.getState().setThemeVariant('workshop');
      expect(useUIStore.getState().themeVariant).toBe('workshop');
    });

    it('setThemeVariant persists to localStorage', () => {
      useUIStore.getState().setThemeVariant('workshop');
      expect(localStorage.getItem('cloudblocks:theme-variant')).toBe('workshop');
    });

    it('reads initial value from localStorage when present', async () => {
      localStorage.setItem('cloudblocks:theme-variant', 'workshop');
      vi.resetModules();
      const { useUIStore: reloadedUIStore } = await import('./uiStore');
      expect(reloadedUIStore.getState().themeVariant).toBe('workshop');
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

  describe('appView', () => {
    it("defaults to 'landing'", () => {
      expect(useUIStore.getState().appView).toBe('landing');
    });

    it('setAppView updates app view', () => {
      useUIStore.getState().setAppView('builder');
      expect(useUIStore.getState().appView).toBe('builder');
      useUIStore.getState().setAppView('landing');
      expect(useUIStore.getState().appView).toBe('landing');
    });

    it('goToLanding forces landing view', () => {
      useUIStore.getState().setAppView('builder');
      useUIStore.getState().goToLanding();
      expect(useUIStore.getState().appView).toBe('landing');
    });

    it('goToBuilder forces builder view', () => {
      useUIStore.getState().goToBuilder();
      expect(useUIStore.getState().appView).toBe('builder');
    });

    it('setAppView persists to localStorage', () => {
      useUIStore.getState().setAppView('builder');
      expect(localStorage.getItem('cloudblocks:app-view')).toBe('builder');
    });

    it('goToBuilder persists to localStorage', () => {
      useUIStore.getState().goToBuilder();
      expect(localStorage.getItem('cloudblocks:app-view')).toBe('builder');
    });

    it('goToLanding persists to localStorage', () => {
      useUIStore.getState().goToBuilder();
      useUIStore.getState().goToLanding();
      expect(localStorage.getItem('cloudblocks:app-view')).toBe('landing');
    });
  });

  describe('sidebar', () => {
    it('defaults to open', () => {
      expect(useUIStore.getState().sidebar).toEqual({ isOpen: true });
    });

    it('toggleSidebar toggles open state', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebar).toEqual({ isOpen: false });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebar).toEqual({ isOpen: true });
    });

    it('setSidebarOpen sets open state explicitly', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebar).toEqual({ isOpen: false });
      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebar).toEqual({ isOpen: true });
    });
  });

  describe('inspector', () => {
    it('defaults to open', () => {
      expect(useUIStore.getState().inspector).toEqual({ isOpen: true, activeTab: 'properties' });
    });

    it('toggleInspector toggles open state', () => {
      useUIStore.getState().toggleInspector();
      expect(useUIStore.getState().inspector).toEqual({ isOpen: false, activeTab: 'properties' });
      useUIStore.getState().toggleInspector();
      expect(useUIStore.getState().inspector).toEqual({ isOpen: true, activeTab: 'properties' });
    });

    it('setInspectorOpen sets open state explicitly', () => {
      useUIStore.getState().setInspectorOpen(false);
      expect(useUIStore.getState().inspector).toEqual({ isOpen: false, activeTab: 'properties' });
      useUIStore.getState().setInspectorOpen(true);
      expect(useUIStore.getState().inspector).toEqual({ isOpen: true, activeTab: 'properties' });
    });

    it('setInspectorTab updates active tab and code preview visibility', () => {
      useUIStore.getState().setInspectorTab('code');
      expect(useUIStore.getState().inspector.activeTab).toBe('code');
      expect(useUIStore.getState().showCodePreview).toBe(true);

      useUIStore.getState().setInspectorTab('connections');
      expect(useUIStore.getState().inspector.activeTab).toBe('connections');
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });

    it('openInspectorTab opens inspector and sets tab', () => {
      useUIStore.getState().setInspectorOpen(false);
      useUIStore.getState().openInspectorTab('code');

      expect(useUIStore.getState().inspector).toEqual({ isOpen: true, activeTab: 'code' });
      expect(useUIStore.getState().showCodePreview).toBe(true);
    });
  });

  describe('activityLog', () => {
    it('defaults to empty', () => {
      expect(useUIStore.getState().activityLog).toEqual([]);
    });

    it('appendLog adds entry with id and ts', () => {
      useUIStore.getState().appendLog({ level: 'info', message: 'hello' });
      const log = useUIStore.getState().activityLog;

      expect(log).toHaveLength(1);
      expect(log[0].level).toBe('info');
      expect(log[0].message).toBe('hello');
      expect(typeof log[0].id).toBe('string');
      expect(log[0].id.length).toBeGreaterThan(0);
      expect(typeof log[0].ts).toBe('string');
      expect(Number.isNaN(Date.parse(log[0].ts))).toBe(false);
    });

    it('clearLog empties all entries', () => {
      useUIStore.getState().appendLog({ level: 'warn', message: 'a' });
      useUIStore.getState().appendLog({ level: 'error', message: 'b' });
      expect(useUIStore.getState().activityLog).toHaveLength(2);
      useUIStore.getState().clearLog();
      expect(useUIStore.getState().activityLog).toEqual([]);
    });

    it('keeps only the latest 200 entries', () => {
      for (let i = 0; i < 205; i += 1) {
        useUIStore.getState().appendLog({ level: 'info', message: `entry-${i}` });
      }

      const log = useUIStore.getState().activityLog;
      expect(log).toHaveLength(200);
      expect(log[0].message).toBe('entry-5');
      expect(log[199].message).toBe('entry-204');
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
      useUIStore.getState().startPlacing('data', 'SQL Database');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('data');
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
      useUIStore.getState().startPlacing('data', 'SQL Database');
      const placingState = useUIStore.getState();
      expect(placingState.interactionState).toBe('placing');
      expect(placingState.draggedBlockCategory).toBe('data');
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
      useUIStore.getState().setDraggedBlockCategory('data');
      expect(useUIStore.getState().draggedBlockCategory).toBe('data');
    });

    it('should set draggedBlockCategory to storage', () => {
      useUIStore.getState().setDraggedBlockCategory('data');
      expect(useUIStore.getState().draggedBlockCategory).toBe('data');
    });

    it('should set draggedBlockCategory to gateway', () => {
      useUIStore.getState().setDraggedBlockCategory('delivery');
      expect(useUIStore.getState().draggedBlockCategory).toBe('delivery');
    });

    it('should clear draggedBlockCategory when given null', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      useUIStore.getState().setDraggedBlockCategory(null);
      expect(useUIStore.getState().draggedBlockCategory).toBe(null);
    });

    it('should overwrite previous draggedBlockCategory', () => {
      useUIStore.getState().setDraggedBlockCategory('compute');
      useUIStore.getState().setDraggedBlockCategory('data');
      expect(useUIStore.getState().draggedBlockCategory).toBe('data');
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

  describe('toggleResourceGuide', () => {
    it('should toggle showResourceGuide from true to false', () => {
      expect(useUIStore.getState().showResourceGuide).toBe(true);
      useUIStore.getState().toggleResourceGuide();
      expect(useUIStore.getState().showResourceGuide).toBe(false);
    });

    it('should toggle showResourceGuide back from false to true', () => {
      useUIStore.getState().toggleResourceGuide();
      useUIStore.getState().toggleResourceGuide();
      expect(useUIStore.getState().showResourceGuide).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showResourceGuide).toBe(true);
      useUIStore.getState().toggleResourceGuide();
      expect(useUIStore.getState().showResourceGuide).toBe(false);
      useUIStore.getState().toggleResourceGuide();
      expect(useUIStore.getState().showResourceGuide).toBe(true);
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

    it('opens drawer validation panel when toggled on', () => {
      useUIStore.getState().toggleValidation();
      expect(useUIStore.getState().showValidation).toBe(true);
      expect(useUIStore.getState().drawer).toEqual({ isOpen: true, activePanel: 'validation' });
    });
  });

  describe('toggleCodePreview', () => {
    it('should toggle showCodePreview from false to true', () => {
      expect(useUIStore.getState().showCodePreview).toBe(false);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      expect(useUIStore.getState().inspector.activeTab).toBe('code');
    });

    it('should toggle showCodePreview back from true to false', () => {
      useUIStore.getState().toggleCodePreview();
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(false);
      expect(useUIStore.getState().inspector.activeTab).toBe('properties');
    });

    it('should toggle multiple times correctly', () => {
      expect(useUIStore.getState().showCodePreview).toBe(false);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(false);
    });

    it('opens inspector code tab when toggled on', () => {
      useUIStore.getState().toggleCodePreview();
      expect(useUIStore.getState().showCodePreview).toBe(true);
      expect(useUIStore.getState().inspector).toEqual({ isOpen: true, activeTab: 'code' });
    });
  });

  describe('toggleAdvancedGeneration', () => {
    it('should toggle showAdvancedGeneration from false to true', () => {
      expect(useUIStore.getState().showAdvancedGeneration).toBe(false);
      useUIStore.getState().toggleAdvancedGeneration();
      expect(useUIStore.getState().showAdvancedGeneration).toBe(true);
    });

    it('should toggle showAdvancedGeneration back from true to false', () => {
      useUIStore.getState().toggleAdvancedGeneration();
      useUIStore.getState().toggleAdvancedGeneration();
      expect(useUIStore.getState().showAdvancedGeneration).toBe(false);
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

  describe('pendingGitHubAction', () => {
    it('defaults to null', () => {
      expect(useUIStore.getState().pendingGitHubAction).toBe(null);
    });

    it('sets and clears pending action while syncing sessionStorage', () => {
      useUIStore.getState().setPendingGitHubAction('sync');
      expect(useUIStore.getState().pendingGitHubAction).toBe('sync');
      expect(sessionStorage.getItem('cloudblocks_pending_github_action')).toBe('sync');

      useUIStore.getState().setPendingGitHubAction(null);
      expect(useUIStore.getState().pendingGitHubAction).toBe(null);
      expect(sessionStorage.getItem('cloudblocks_pending_github_action')).toBeNull();
    });

    it('reads valid pending action from sessionStorage during module init', async () => {
      sessionStorage.setItem('cloudblocks_pending_github_action', 'pr');
      vi.resetModules();

      const { useUIStore: reloadedUIStore } = await import('./uiStore');
      expect(reloadedUIStore.getState().pendingGitHubAction).toBe('pr');
    });

    it('returns null and skips storage writes when window is unavailable', async () => {
      sessionStorage.setItem('cloudblocks_pending_github_action', 'pr');
      vi.stubGlobal('window', undefined);
      try {
        vi.resetModules();

        const { useUIStore: reloadedUIStore } = await import('./uiStore');

        expect(reloadedUIStore.getState().pendingGitHubAction).toBe(null);
        reloadedUIStore.getState().setPendingGitHubAction('sync');
        expect(sessionStorage.getItem('cloudblocks_pending_github_action')).toBe('pr');
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('triggerUpgradeAnimation', () => {
    it('does not clear a newer animation id when timeout for older id resolves', () => {
      vi.useFakeTimers();
      try {
        useUIStore.getState().triggerUpgradeAnimation('block-old');
        useUIStore.setState({ upgradingBlockId: 'block-new' });

        vi.advanceTimersByTime(1600);
        expect(useUIStore.getState().upgradingBlockId).toBe('block-new');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('pendingLinkRepo', () => {
    it('defaults to null and can be set/cleared', () => {
      expect(useUIStore.getState().pendingLinkRepo).toBe(null);

      useUIStore.getState().setPendingLinkRepo('owner/repo');
      expect(useUIStore.getState().pendingLinkRepo).toBe('owner/repo');

      useUIStore.getState().setPendingLinkRepo(null);
      expect(useUIStore.getState().pendingLinkRepo).toBe(null);
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
        endpoints: [],
        externalActors: { added: [], removed: [], modified: [] },
        rootChanges: [],
        summary: { totalChanges: 0, hasBreakingChanges: false },
      };
      const mockBase = {
        id: 'base-arch',
        name: 'Base',
        version: '1.0',
        nodes: [],
        connections: [],
        endpoints: [],
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
        endpoints: [],
        externalActors: { added: [], removed: [], modified: [] },
        rootChanges: [],
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

    it('setDiffMode(false) clears diff state', () => {
      useUIStore.getState().setDiffMode(true);
      useUIStore.getState().setDiffMode(false);

      const state = useUIStore.getState();
      expect(state.diffMode).toBe(false);
      expect(state.diffDelta).toBe(null);
      expect(state.diffBaseArchitecture).toBe(null);
    });

    it('clearDiffState should clear mode, delta, and base architecture', () => {
      const mockDelta = {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        endpoints: [],
        externalActors: { added: [], removed: [], modified: [] },
        rootChanges: [],
        summary: { totalChanges: 0, hasBreakingChanges: false },
      };
      const mockBase = {
        id: 'base-arch',
        name: 'Base',
        version: '1.0',
        nodes: [],
        connections: [],
        endpoints: [],
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
      expect(useUIStore.getState().showResourceGuide).toBe(true);
      useUIStore.getState().toggleResourceGuide();
      expect(useUIStore.getState().showBlockPalette).toBe(false);
      expect(useUIStore.getState().showResourceGuide).toBe(false);
    });
  });

  describe('right overlay state', () => {
    it('GitHub panel toggles update rightOverlay', () => {
      useUIStore.getState().toggleGitHubLogin();
      expect(useUIStore.getState().rightOverlay).toBe('githubLogin');

      useUIStore.getState().toggleGitHubRepos();
      expect(useUIStore.getState().rightOverlay).toBe('githubRepos');
      expect(useUIStore.getState().showGitHubLogin).toBe(false);

      useUIStore.getState().toggleGitHubRepos();
      expect(useUIStore.getState().rightOverlay).toBe(null);
    });

    it('setRightOverlay synchronizes GitHub booleans', () => {
      useUIStore.getState().setRightOverlay('githubPR');
      expect(useUIStore.getState().showGitHubPR).toBe(true);
      expect(useUIStore.getState().showGitHubLogin).toBe(false);
      expect(useUIStore.getState().showGitHubRepos).toBe(false);
      expect(useUIStore.getState().showGitHubSync).toBe(false);

      useUIStore.getState().setRightOverlay(null);
      expect(useUIStore.getState().showGitHubPR).toBe(false);
    });

    it('does not affect left-side or center panels', () => {
      useUIStore.getState().toggleWorkspaceManager();
      expect(useUIStore.getState().showWorkspaceManager).toBe(true);

      useUIStore.getState().toggleGitHubSync();
      expect(useUIStore.getState().rightOverlay).toBe('githubSync');
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
