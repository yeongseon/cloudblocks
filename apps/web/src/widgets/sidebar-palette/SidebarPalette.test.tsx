import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerBlock } from '@cloudblocks/schema';
import { SidebarPalette } from './SidebarPalette';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('./SidebarPalette.css', () => ({}));

vi.mock('interactjs', () => {
  let capturedListeners: Record<string, (...args: unknown[]) => void> = {};
  const draggable = vi.fn().mockImplementation((opts) => {
    if (opts?.listeners) {
      capturedListeners = opts.listeners;
    }
    return { unset: vi.fn() };
  });
  const interactFn = Object.assign(vi.fn().mockReturnValue({ draggable }), {
    __getListeners: () => capturedListeners,
  });
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

const networkPlate: ContainerBlock = {
  id: 'net-1',
  name: 'VNet',
  kind: 'container',
  layer: 'region',
  resourceType: 'virtual_network',
  category: 'network',
  provider: 'azure',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  frame: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: ContainerBlock = {
  id: 'subnet-public-1',
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  frame: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

describe('SidebarPalette', () => {
  const addNodeMock = vi.fn();
  const addExternalActorMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      activeProvider: 'azure',
      isSoundMuted: true,
      sidebar: { isOpen: true },
    });

    useArchitectureStore.setState({
      addNode: addNodeMock,
      addExternalActor: addExternalActorMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders category groups', () => {
    render(<SidebarPalette />);

    expect(screen.getByText('External Actors')).toBeInTheDocument();
    expect(screen.getByTitle('Add Internet')).toBeInTheDocument();
    expect(screen.getByTitle('Add Browser')).toBeInTheDocument();

    // Groups with starter-tier resources appear by default
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Compute')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Identity')).toBeInTheDocument();

    // Messaging has only advanced-tier resources; Operations has none yet
    expect(screen.queryByText('Messaging')).not.toBeInTheDocument();
    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
  });

  it('shows Messaging group when Show Advanced is checked', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByText('Messaging')).toBeInTheDocument();
    // Operations still hidden — no resources defined yet
    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
  });

  it('filters resources by search query', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    await user.type(screen.getByPlaceholderText('Search resources'), 'vault');

    expect(screen.getByText((_content, el) => el?.textContent === 'Key Vault')).toBeInTheDocument();
    expect(screen.queryByText('VM')).not.toBeInTheDocument();
  });

  it('collapses and expands category sections', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    const toggle = screen.getByRole('button', { name: 'Collapse Network' });
    expect(screen.getByTitle('Create Azure Virtual Network')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByTitle('Create Azure Virtual Network')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand Network' }));
    expect(screen.getByTitle('Create Azure Virtual Network')).toBeInTheDocument();
  });

  it('shows disabled resources with lock when network is missing', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    // Enable advanced tier so VM is visible
    await user.click(screen.getByRole('checkbox'));

    const vmButton = screen.getByTitle(
      'Create a Network first. Virtual Machines need a network to connect to.',
    );
    expect(vmButton).toBeDisabled();
    // Lock icon is now a Lucide SVG inside an aria-hidden span
    expect(vmButton.querySelector('.sidebar-palette-resource-lock')).toBeInTheDocument();
  });

  it('creates a resource on click when target container exists', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // Enable advanced tier so VM is visible
    await user.click(screen.getByRole('checkbox'));

    await user.click(screen.getByTitle('Create Virtual Machine'));

    expect(addNodeMock).toHaveBeenCalledWith({
      kind: 'resource',
      resourceType: 'virtual_machine',
      name: 'Virtual Machine 1',
      parentId: 'subnet-public-1',
      provider: 'azure',
      subtype: 'vm',
    });
  });

  it('adds external actor from palette actions', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Add Internet'));
    await user.click(screen.getByTitle('Add Browser'));

    expect(addExternalActorMock).toHaveBeenNthCalledWith(1, 'internet');
    expect(addExternalActorMock).toHaveBeenNthCalledWith(2, 'browser');
  });

  describe('starter/advanced tier toggle', () => {
    it('renders Show Advanced checkbox', () => {
      render(<SidebarPalette />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('Show Advanced')).toBeInTheDocument();
    });

    it('shows only starter tier resources by default', () => {
      render(<SidebarPalette />);
      // Stats show "Showing 9 of 26" when no search, no advanced toggle
      expect(screen.getByText(/Showing 9 of 26/)).toBeInTheDocument();
    });

    it('shows all resources when Show Advanced checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<SidebarPalette />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Stats should update to show all 26 when advanced is enabled
      expect(screen.getByText(/Showing 26 of 26/)).toBeInTheDocument();
    });

    describe('drag-to-create interaction', () => {
      it('covers drag start, move, and end listeners', async () => {
        const user = userEvent.setup();
        const startPlacingSpy = vi.spyOn(useUIStore.getState(), 'startPlacing');
        const cancelInteractionSpy = vi.spyOn(useUIStore.getState(), 'cancelInteraction');

        useArchitectureStore.setState({
          workspace: {
            id: 'ws-1',
            name: 'Test Workspace',
            architecture: {
              ...baseArchitecture,
              nodes: [networkPlate, publicSubnet],
            },
            createdAt: '',
            updatedAt: '',
          },
        });

        render(<SidebarPalette />);

        // Enable advanced tier so VM is visible
        await user.click(screen.getByRole('checkbox'));

        // Get the interact mock to retrieve captured listeners
        const interactMock = vi.mocked(await import('interactjs').then((m) => m.default));
        const getListeners = (
          interactMock as unknown as {
            __getListeners: () => Record<string, (...args: unknown[]) => void>;
          }
        ).__getListeners;
        const listeners = getListeners();

        expect(listeners).toBeDefined();
        expect(listeners.start).toBeDefined();
        expect(listeners.move).toBeDefined();
        expect(listeners.end).toBeDefined();

        // Simulate drag start
        listeners.start();

        // Simulate drag move with fake event
        const vmButton = screen.getByTitle('Create Virtual Machine');
        const moveEvent = {
          target: vmButton,
        };
        listeners.move(moveEvent);

        // Verify startPlacing was called
        expect(startPlacingSpy).toHaveBeenCalled();

        // Simulate drag end
        const endEvent = {
          target: vmButton,
        };
        listeners.end(endEvent);

        expect(cancelInteractionSpy).toHaveBeenCalled();

        // Clean up spies
        startPlacingSpy.mockRestore();
        cancelInteractionSpy.mockRestore();
      });

      it('clears timeout on second end call', async () => {
        const user = userEvent.setup();
        const cancelInteractionSpy = vi.spyOn(useUIStore.getState(), 'cancelInteraction');

        useArchitectureStore.setState({
          workspace: {
            id: 'ws-1',
            name: 'Test Workspace',
            architecture: {
              ...baseArchitecture,
              nodes: [networkPlate, publicSubnet],
            },
            createdAt: '',
            updatedAt: '',
          },
        });

        render(<SidebarPalette />);

        // Enable advanced tier so VM is visible
        await user.click(screen.getByRole('checkbox'));

        // Get the interact mock to retrieve captured listeners
        const interactMock = vi.mocked(await import('interactjs').then((m) => m.default));
        const getListeners = (
          interactMock as unknown as {
            __getListeners: () => Record<string, (...args: unknown[]) => void>;
          }
        ).__getListeners;
        const listeners = getListeners();

        const vmButton = screen.getByTitle('Create Virtual Machine');
        const endEvent = {
          target: vmButton,
        };

        // First end call
        listeners.end(endEvent);
        expect(cancelInteractionSpy).toHaveBeenCalledTimes(1);

        // Second end call (should clear timeout)
        listeners.end(endEvent);
        expect(cancelInteractionSpy).toHaveBeenCalledTimes(2);

        cancelInteractionSpy.mockRestore();
      });
    });
  });
});

it('highlights matching text in search results', async () => {
  const user = userEvent.setup();
  useArchitectureStore.setState({
    workspace: {
      id: 'ws-1',
      name: 'Test Workspace',
      architecture: {
        ...baseArchitecture,
        nodes: [networkPlate, publicSubnet],
      },
      createdAt: '',
      updatedAt: '',
    },
  });

  const { container } = render(<SidebarPalette />);

  await user.type(screen.getByPlaceholderText('Search resources'), 'vault');

  const marks = container.querySelectorAll('mark.sidebar-palette-highlight');
  expect(marks.length).toBeGreaterThan(0);
  expect(marks[0].textContent?.toLowerCase()).toBe('vault');
});
