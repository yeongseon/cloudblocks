import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useUIStore } from '../entities/store/uiStore';
import type { ArchitectureModel, ExternalActor, Plate } from '@cloudblocks/schema';

type DragListeners = {
  start?: (event: { target: HTMLElement }) => void;
  move?: (event: { target: HTMLElement; dx: number; dy: number }) => void;
  end?: (event: { target: HTMLElement }) => void;
};

const draggableListeners = new WeakMap<HTMLElement, DragListeners>();
const unsetInteractableMock = vi.fn();

vi.mock('interactjs', () => ({
  default: (element: HTMLElement) => ({
    draggable: (options: { listeners: DragListeners }) => {
      draggableListeners.set(element, options.listeners);
      return { unset: unsetInteractableMock };
    },
  }),
}));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-m10',
  name: 'Milestone 10 Integration',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const networkPlate: Plate = {
  id: 'net-1',
  name: 'VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: Plate = {
  id: 'subnet-public-1',
  name: 'Public Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: [],
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const internetActor: ExternalActor = {
  id: 'actor-internet',
  type: 'internet',
  name: 'Internet',
  position: { x: -3, y: 0, z: 5 },
};

function IntegrationHarness() {
  return <SceneCanvas />;
}

describe('Milestone 10 integration', () => {
  const initialArchitectureState = useArchitectureStore.getState();
  const initialUIState = useUIStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState(initialUIState, true);

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...baseArchitecture,
          plates: [networkPlate, publicSubnet],
          externalActors: [internetActor],
        },
      },
    });

    useUIStore.setState({
      selectedId: null,
      toolMode: 'select',
      activeProvider: 'azure',
      interactionState: 'idle',
      connectionSource: null,
      draggedBlockCategory: null,
      draggedResourceName: null,
      isSoundMuted: true,
    });

    if (!HTMLElement.prototype.hasPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
        configurable: true,
        value: () => false,
      });
    }

    if (!HTMLElement.prototype.setPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
        configurable: true,
        value: () => {},
      });
    }

    if (!HTMLElement.prototype.releasePointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
        configurable: true,
        value: () => {},
      });
    }
  });

  it('allows dragging and repositioning external actors on the canvas', () => {
    const { container } = render(<IntegrationHarness />);

    const actorSprite = container.querySelector('.external-actor-sprite') as HTMLElement;
    expect(actorSprite).toBeInTheDocument();

    const initialActorPosition = useArchitectureStore
      .getState()
      .workspace
      .architecture
      .externalActors
      .find((actor) => actor.id === internetActor.id)?.position;
    const initialSnapshot = initialActorPosition
      ? { x: initialActorPosition.x, y: initialActorPosition.y, z: initialActorPosition.z }
      : null;

    const listeners = draggableListeners.get(actorSprite);
    expect(listeners).toBeDefined();

    act(() => {
      listeners?.start?.({ target: actorSprite });
      listeners?.move?.({ target: actorSprite, dx: 24, dy: 12 });
      listeners?.end?.({ target: actorSprite });
    });

    const movedActorPosition = useArchitectureStore
      .getState()
      .workspace
      .architecture
      .externalActors
      .find((actor) => actor.id === internetActor.id)?.position;

    expect(movedActorPosition).toBeDefined();
    expect(movedActorPosition).not.toEqual(initialSnapshot);
  });
});
