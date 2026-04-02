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
  const addExternalBlockMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      activeProvider: 'azure',
      isSoundMuted: true,
      sidebar: { isOpen: true },
    });

    useArchitectureStore.setState({
      addNode: addNodeMock,
      addExternalBlock: addExternalBlockMock,
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders category groups and external section', () => {
    render(<SidebarPalette />);

    // External group uses unified layout
    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.getByTitle('Add Internet')).toBeInTheDocument();
    expect(screen.getByTitle('Add Client')).toBeInTheDocument();

    // Groups with starter-tier resources appear by default
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Compute')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Messaging')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('shows Messaging group when Show Advanced is checked', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByText('Messaging')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('filters resources by search query using resolved labels', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
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

    expect(
      screen.getByText((_content, el) =>
        Boolean(
          el?.classList.contains('sidebar-palette-resource-name') &&
          el?.textContent === 'Key Vault',
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('VM')).not.toBeInTheDocument();
  });

  it('collapses and expands category sections', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // blockPresentation resolves 'network' → displayLabel 'Virtual Network'
    const toggle = screen.getByRole('button', { name: 'Collapse Network' });
    expect(screen.getByTitle('Create Virtual Network')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByTitle('Create Virtual Network')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand Network' }));
    expect(screen.getByTitle('Create Virtual Network')).toBeInTheDocument();
  });

  it('collapses and expands external section', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    expect(screen.getByTitle('Add Internet')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Collapse External' });
    await user.click(toggle);
    expect(screen.queryByTitle('Add Internet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand External' }));
    expect(screen.getByTitle('Add Internet')).toBeInTheDocument();
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
        provider: 'azure' as const,
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
    await user.click(screen.getByTitle('Add Client'));

    expect(addExternalBlockMock).toHaveBeenNthCalledWith(1, 'internet');
    expect(addExternalBlockMock).toHaveBeenNthCalledWith(2, 'browser');
  });

  describe('starter/advanced tier toggle', () => {
    it('renders Show Advanced checkbox', () => {
      render(<SidebarPalette />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('Show Advanced')).toBeInTheDocument();
    });

    it('shows only starter tier resources plus externals by default', () => {
      render(<SidebarPalette />);
      // 13 starter resources + 2 external = 15 visible, total = 28 + 2 = 30
      expect(screen.getByText(/Showing 15 of 30/)).toBeInTheDocument();
    });

    it('shows all resources when Show Advanced checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<SidebarPalette />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // 28 resources + 2 external = 30 visible of 30 total
      expect(screen.getByText(/Showing 30 of 30/)).toBeInTheDocument();
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
            provider: 'azure' as const,
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
            provider: 'azure' as const,
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
      provider: 'azure' as const,
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

describe('SidebarPalette — blockPresentation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      activeProvider: 'azure',
      isSoundMuted: true,
      sidebar: { isOpen: true },
    });

    useArchitectureStore.setState({
      addNode: vi.fn(),
      addExternalBlock: vi.fn(),
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders SVG icons for all resource items (no emoji fallback)', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // All resource icons should be <img> elements, not emoji text
    const resourceIcons = document.querySelectorAll('.sidebar-palette-resource-icon');
    resourceIcons.forEach((icon) => {
      const img = icon.querySelector('img');
      const placeholder = icon.querySelector('.sidebar-palette-icon-placeholder');
      // Each icon should be either an SVG img or a placeholder — never emoji text
      expect(img || placeholder).toBeTruthy();
    });
  });

  it('renders external items with SVG icons using blockPresentation', () => {
    render(<SidebarPalette />);

    const internetBtn = screen.getByTitle('Add Internet');
    const browserBtn = screen.getByTitle('Add Client');

    // External items use blockPresentation's iconUrl
    const internetImg = internetBtn.querySelector('img');
    expect(internetImg).toBeTruthy();
    expect(internetImg?.getAttribute('src')).toBe('/actor-sprites/internet.svg');

    const browserImg = browserBtn.querySelector('img');
    expect(browserImg).toBeTruthy();
    expect(browserImg?.getAttribute('src')).toBe('/actor-sprites/browser.svg');
  });

  it('filters external items by search query', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    await user.type(screen.getByPlaceholderText('Search resources'), 'internet');
    expect(screen.getByTitle('Add Internet')).toBeInTheDocument();
    expect(screen.queryByTitle('Add Client')).not.toBeInTheDocument();
  });

  it('uses resolved labels from blockPresentation for provider switching', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ activeProvider: 'aws' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: {
          ...baseArchitecture,
          nodes: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);
    await user.click(screen.getByRole('checkbox'));

    // AWS-specific labels from blockPresentation should appear (multiple resources may resolve to EC2)
    expect(screen.getAllByTitle('Create EC2').length).toBeGreaterThanOrEqual(1);
  });
});
