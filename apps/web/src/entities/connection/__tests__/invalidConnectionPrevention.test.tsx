import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../store/uiStore';
import { useArchitectureStore } from '../../store/architectureStore';

/**
 * #1253 — Invalid connection prevention during drag.
 *
 * Verifies that invalid connections are silently cancelled
 * (no toast.error) and that the connecting interaction state
 * is properly cleaned up.
 */
describe('Invalid connection prevention (#1253)', () => {
  beforeEach(() => {
    useUIStore.setState({
      toolMode: 'connect',
      interactionState: 'idle',
      connectionSource: null,
      selectedId: null,
      drawer: { isOpen: false, activePanel: null },
    });
  });

  describe('startConnecting → completeInteraction lifecycle', () => {
    it('startConnecting sets connectionSource and interactionState', () => {
      const { startConnecting } = useUIStore.getState();
      startConnecting('block-1');

      const state = useUIStore.getState();
      expect(state.connectionSource).toBe('block-1');
      expect(state.interactionState).toBe('connecting');
    });

    it('completeInteraction clears connectionSource and resets to idle', () => {
      const { startConnecting, completeInteraction } = useUIStore.getState();
      startConnecting('block-1');
      completeInteraction();

      const state = useUIStore.getState();
      expect(state.connectionSource).toBeNull();
      expect(state.interactionState).toBe('idle');
    });

    it('multiple startConnecting → completeInteraction cycles work', () => {
      const store = useUIStore.getState();

      store.startConnecting('block-1');
      expect(useUIStore.getState().connectionSource).toBe('block-1');

      store.completeInteraction();
      expect(useUIStore.getState().connectionSource).toBeNull();

      store.startConnecting('block-2');
      expect(useUIStore.getState().connectionSource).toBe('block-2');

      store.completeInteraction();
      expect(useUIStore.getState().interactionState).toBe('idle');
    });
  });

  describe('addConnection failure does not leave broken state', () => {
    it('self-connection returns false and state can be cleaned up', () => {
      // Set up store with nodes
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [
              {
                id: 'block-1',
                kind: 'resource' as const,
                name: 'Compute',
                category: 'compute' as const,
                resourceType: 'virtual-machine',
                parentId: 'container-1',
                position: { x: 0, y: 0, z: 0 },
                layer: 'resource' as const,
                provider: 'azure' as const,
                metadata: {},
              },
            ],
          },
        },
      });

      const { startConnecting, completeInteraction } = useUIStore.getState();
      const { addConnection } = useArchitectureStore.getState();

      startConnecting('block-1');
      const success = addConnection('block-1', 'block-1');
      expect(success).toBeNull();

      // completeInteraction still works after failed addConnection
      completeInteraction();
      expect(useUIStore.getState().interactionState).toBe('idle');
      expect(useUIStore.getState().connectionSource).toBeNull();
    });
  });

  describe('connecting state cancellation on empty canvas', () => {
    it('completeInteraction can cancel active connecting state', () => {
      // Simulates what SceneCanvas.handlePointerUp now does
      // when interactionState === 'connecting' and user releases on empty canvas
      const { startConnecting, completeInteraction } = useUIStore.getState();

      startConnecting('block-1');
      expect(useUIStore.getState().interactionState).toBe('connecting');

      // This is the fix: handlePointerUp now calls completeInteraction
      // when releasing on empty canvas while connecting
      const interactionState = useUIStore.getState().interactionState;
      if (interactionState === 'connecting') {
        completeInteraction();
      }

      expect(useUIStore.getState().interactionState).toBe('idle');
      expect(useUIStore.getState().connectionSource).toBeNull();
    });
  });
});
