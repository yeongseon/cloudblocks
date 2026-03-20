import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneCanvas } from '../widgets/scene-canvas/SceneCanvas';
import { CommandCard } from '../widgets/bottom-panel/CommandCard';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { useUIStore } from '../entities/store/uiStore';
import { useWorkerStore } from '../entities/store/workerStore';
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
  return (
    <>
      <SceneCanvas />
      <CommandCard />
    </>
  );
}

describe('Milestone 10 integration', () => {
  const initialArchitectureState = useArchitectureStore.getState();
  const initialUIState = useUIStore.getState();
  const initialWorkerState = useWorkerStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useArchitectureStore.setState(initialArchitectureState, true);
    useUIStore.setState(initialUIState, true);
    useWorkerStore.setState(initialWorkerState, true);

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

    useWorkerStore.setState({
      workerId: 'worker-default',
      workerState: 'idle',
      workerPosition: [2, 0, 3],
      buildQueue: [],
      activeBuild: null,
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

  it('covers full worker build flow from selection to idle return', async () => {
    const user = userEvent.setup();
    const { container } = render(<IntegrationHarness />);

    const minifigure = container.querySelector('.minifigure-sprite') as HTMLElement;
    expect(minifigure).toBeInTheDocument();

    await user.click(minifigure);

    expect(useUIStore.getState().selectedId).toBe('worker-default');
    expect(screen.getByText('Build Order')).toBeInTheDocument();

    await user.click(screen.getByTitle('Build Virtual Machine'));

    await waitFor(() => {
      expect(useArchitectureStore.getState().workspace.architecture.blocks).toHaveLength(1);
      expect(useWorkerStore.getState().workerState).toBe('moving');
      expect(useWorkerStore.getState().activeBuild).not.toBeNull();
    });

    const createdBlock = useArchitectureStore.getState().workspace.architecture.blocks[0];
    const activeBuild = useWorkerStore.getState().activeBuild;

    expect(activeBuild?.blockId).toBe(createdBlock.id);
    expect(minifigure).toHaveClass('is-moving');

    const blockButton = screen.getByRole('button', { name: `Block: ${createdBlock.name}` });
    const blockSprite = blockButton.closest('.block-sprite') as HTMLElement;
    expect(blockSprite).toHaveClass('is-building');
    expect(blockSprite.style.getPropertyValue('--build-progress')).toBe('0');

    act(() => {
      useWorkerStore.getState().setWorkerState('building');
      useWorkerStore.getState().tickBuildProgress(0.5);
    });

    await waitFor(() => {
      expect(blockSprite.style.getPropertyValue('--build-progress')).toBe('0.5');
    });

    act(() => {
      useWorkerStore.getState().tickBuildProgress(0.5);
    });

    await waitFor(() => {
      expect(useWorkerStore.getState().workerState).toBe('idle');
      expect(useWorkerStore.getState().activeBuild).toBeNull();
      expect(minifigure).toHaveClass('is-idle');
      expect(blockSprite).not.toHaveClass('is-building');
    });
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
