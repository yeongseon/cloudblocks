import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerBlock } from '@cloudblocks/schema';
import { SidebarPalette } from './SidebarPalette';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import * as techTreeModule from '../../shared/hooks/useTechTree';

const interactState = vi.hoisted(() => ({
  listenersByElement: new Map<
    Element,
    { move?: (event: { target: Element }) => void; end?: (event: { target: Element }) => void }
  >(),
}));

const playSoundMock = vi.fn();
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('./SidebarPalette.css', () => ({}));
vi.mock('../../shared/utils/audioService', () => ({
  audioService: {
    playSound: (...args: unknown[]) => playSoundMock(...args),
  },
}));
vi.mock('react-hot-toast', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
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

const subnetPlate: ContainerBlock = {
  id: 'subnet-1',
  name: 'Subnet',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  frame: { width: 8, height: 0.3, depth: 10 },
  metadata: {},
};

describe('SidebarPalette additional coverage', () => {
  const addNode = vi.fn();
  const addExternalBlock = vi.fn();
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
      addExternalBlock,
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

  it('creates a network foundation container and plays sound', async () => {
    const user = userEvent.setup();

    render(<SidebarPalette />);

    // blockPresentation resolves 'network' → displayLabel 'Virtual Network'
    await user.click(screen.getByTitle('Create Virtual Network'));

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
        provider: 'azure' as const,
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
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { unmount } = render(<SidebarPalette />);

    // Use a starter-tier resource so drag listeners are registered on first render
    // blockPresentation resolves 'app-service' → displayLabel 'App Service'
    const appServiceButton = screen.getByTitle('Create App Service');

    interactState.listenersByElement.get(appServiceButton)?.move?.({ target: appServiceButton });
    await user.click(appServiceButton);

    expect(startPlacing).toHaveBeenCalled();
    expect(addNode).not.toHaveBeenCalled();

    interactState.listenersByElement.get(appServiceButton)?.end?.({ target: appServiceButton });
    expect(cancelInteraction).toHaveBeenCalled();

    unmount();
    expect(cancelInteraction).toHaveBeenCalled();
  });

  it('reveals advanced resources during search even when Show Advanced is off', async () => {
    const user = userEvent.setup();

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.type(screen.getByPlaceholderText('Search resources'), 'vm');

    expect(screen.getByTitle('Create Virtual Machine')).toBeInTheDocument();
  });

  it('shows toast error when a resource has no target network', async () => {
    const user = userEvent.setup();

    const useTechTreeSpy = vi.spyOn(techTreeModule, 'useTechTree').mockReturnValue({
      hasVNet: false,
      hasSubnet: false,
      blockCount: 0,
      plateCount: 0,
      isEnabled: () => true,
      getDisabledReason: () => null,
      getCreationResources: () => [],
      getTargetPlateId: () => null,
    });

    render(<SidebarPalette />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByTitle('Create Virtual Machine'));

    expect(toastErrorMock).toHaveBeenCalledWith('Please create a Network first.');
    useTechTreeSpy.mockRestore();
  });

  it('passes schemaResourceType and azureSubtype in drag startPlacing payload', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // blockPresentation resolves 'app-service' → displayLabel 'App Service'
    const appServiceButton = screen.getByTitle('Create App Service');

    interactState.listenersByElement.get(appServiceButton)?.move?.({ target: appServiceButton });

    expect(startPlacing).toHaveBeenCalledWith(
      'compute',
      'App Service',
      'app_service',
      'app-service',
    );
  });

  it('returns early in drag move when resource type is missing', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // blockPresentation resolves 'app-service' → displayLabel 'App Service'
    const appServiceButton = screen.getByTitle('Create App Service');
    appServiceButton.removeAttribute('data-resource-type');
    interactState.listenersByElement.get(appServiceButton)?.move?.({ target: appServiceButton });

    expect(startPlacing).not.toHaveBeenCalled();
  });

  it('returns early in drag move when resource definition is unavailable', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // blockPresentation resolves 'app-service' → displayLabel 'App Service'
    const appServiceButton = screen.getByTitle('Create App Service');
    appServiceButton.dataset.resourceType = 'non-existent-resource';
    interactState.listenersByElement.get(appServiceButton)?.move?.({ target: appServiceButton });

    expect(startPlacing).not.toHaveBeenCalled();
  });

  it('uses provider-specific labels and increments resource names', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ activeProvider: 'aws' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        provider: 'azure' as const,
        architecture: { ...baseArchitecture, nodes: [networkPlate, subnetPlate] },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<SidebarPalette />);

    // Enable advanced tier so VM/EC2 is visible
    await user.click(screen.getByRole('checkbox'));

    // Both vm and app-service resolve to 'EC2' in AWS; select by data-resource-type
    const vmButton = document.querySelector('button[data-resource-type="vm"]') as HTMLElement;
    await user.click(vmButton);
    expect(addNode).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resource',
        name: 'EC2 1',
        provider: 'aws',
      }),
    );
  });

  it('plays sound when adding external block', async () => {
    const user = userEvent.setup();
    render(<SidebarPalette />);

    await user.click(screen.getByTitle('Add Internet'));

    expect(addExternalBlock).toHaveBeenCalledWith('internet');
    expect(playSoundMock).toHaveBeenCalledWith('block-snap');
  });

  it('does not attach drag listeners to external buttons', () => {
    render(<SidebarPalette />);

    const internetBtn = screen.getByTitle('Add Internet');
    const browserBtn = screen.getByTitle('Add Browser');

    // External buttons should NOT be in the interact listeners map
    // because the selector scopes to [data-resource-type] only
    expect(interactState.listenersByElement.has(internetBtn)).toBe(false);
    expect(interactState.listenersByElement.has(browserBtn)).toBe(false);
  });
});
