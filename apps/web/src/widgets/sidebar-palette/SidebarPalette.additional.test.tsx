import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerNode } from '@cloudblocks/schema';
import { SidebarPalette } from './SidebarPalette';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

const interactState = vi.hoisted(() => ({
  listenersByElement: new Map<
    Element,
    { move?: (event: { target: Element }) => void; end?: (event: { target: Element }) => void }
  >(),
}));

const playSoundMock = vi.fn();

vi.mock('./SidebarPalette.css', () => ({}));
vi.mock('../../shared/utils/audioService', () => ({
  audioService: {
    playSound: (...args: unknown[]) => playSoundMock(...args),
  },
}));
vi.mock('interactjs', () => {
  const draggable = vi.fn(
    (opts: {
      listeners: {
        move?: (event: { target: Element }) => void;
        end?: (event: { target: Element }) => void;
      };
    }) => {
      return {
        unset: vi.fn(),
        __listeners: opts.listeners,
      };
    },
  );

  const interactFn = vi.fn((element: Element) => ({
    draggable: (opts: {
      listeners: {
        move?: (event: { target: Element }) => void;
        end?: (event: { target: Element }) => void;
      };
    }) => {
      interactState.listenersByElement.set(element, opts.listeners);
      return draggable(opts);
    },
  }));

  return { default: interactFn };
});

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const networkPlate: ContainerNode = {
  id: 'net-1',
  name: 'VNet',
  kind: 'container',
  layer: 'region',
  resourceType: 'virtual_network',
  category: 'network',
  provider: 'azure',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const subnetPlate: ContainerNode = {
  id: 'subnet-1',
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  size: { width: 8, height: 0.3, depth: 10 },
  metadata: {},
};

describe('SidebarPalette additional coverage', () => {
  const addNode = vi.fn();
  const startPlacing = vi.fn();
  const cancelInteraction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    interactState.listenersByElement.clear();

    useUIStore.setState({
      activeProvider: 'azure',
      isSoundMuted: false,
      startPlacing,
      cancelInteraction,
      sidebar: { isOpen: true },
    });

    useArchitectureStore.setState({
      addNode,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('creates a network foundation container and plays sound', async () => {
    const user = userEvent.setup();

    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Create Azure Virtual Network'));

    expect(addNode).toHaveBeenCalledWith({
      kind: 'container',
      resourceType: 'virtual_network',
      name: 'VNet',
      parentId: null,
      layer: 'region',
    });
    expect(playSoundMock).toHaveBeenCalledWith('block-snap');
  });

  it('creates a subnet under existing network and skips sound when muted', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ isSoundMuted: true });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Create Subnet'));

    expect(addNode).toHaveBeenCalledWith({
      kind: 'container',
      resourceType: 'subnet',
      name: 'Subnet',
      parentId: 'net-1',
      layer: 'subnet',
    });
    expect(playSoundMock).not.toHaveBeenCalled();
  });

  it('prevents click-create while drag is active and cancels interaction on drag end', async () => {
    const user = userEvent.setup();

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { unmount } = render(<SidebarPalette />);
    const vmButton = screen.getByTitle('Create Virtual Machine');

    interactState.listenersByElement.get(vmButton)?.move?.({ target: vmButton });
    await user.click(vmButton);

    expect(startPlacing).toHaveBeenCalled();
    expect(addNode).not.toHaveBeenCalled();

    interactState.listenersByElement.get(vmButton)?.end?.({ target: vmButton });
    expect(cancelInteraction).toHaveBeenCalled();

    unmount();
    expect(cancelInteraction).toHaveBeenCalled();
  });

  it('uses provider-specific labels and increments resource names', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ activeProvider: 'aws' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Create EC2'));
    expect(addNode).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resource',
        name: 'EC2 1',
        provider: 'aws',
      }),
    );
  });
});
