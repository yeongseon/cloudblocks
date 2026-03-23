import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { InspectorPanel } from './InspectorPanel';
import { endpointId } from '@cloudblocks/schema';

const promptDialogMock = vi.fn();
const playSoundMock = vi.fn();

vi.mock('./InspectorPanel.css', () => ({}));
vi.mock('../code-preview/CodePreview', () => ({
  CodePreview: () => <div data-testid="inspector-code-preview" />,
}));
vi.mock('../../shared/ui/PromptDialog', () => ({
  promptDialog: (...args: unknown[]) => promptDialogMock(...args),
}));
vi.mock('../../shared/utils/audioService', () => ({
  audioService: {
    playSound: (...args: unknown[]) => playSoundMock(...args),
  },
}));

const networkPlate: ContainerNode = {
  id: 'plate-1',
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
  id: 'plate-2',
  name: 'Subnet A',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'plate-1',
  position: { x: 1, y: 0, z: 1 },
  size: { width: 8, height: 0.3, depth: 10 },
  metadata: {},
};

const isolatedPlate: ContainerNode = {
  id: 'plate-3',
  name: 'Isolated',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'plate-1',
  position: { x: 2, y: 0, z: 1 },
  size: { width: 4, height: 0.3, depth: 6 },
  metadata: {},
};

const blockA: LeafNode = {
  id: 'block-a',
  name: 'App VM',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'plate-2',
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
};

const blockB: LeafNode = {
  id: 'block-b',
  name: 'DB',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'sql_database',
  category: 'data',
  provider: 'azure',
  parentId: 'plate-2',
  position: { x: 4, y: 0, z: 2 },
  metadata: {},
};

const architecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Inspector Test Architecture',
  version: '1.0.0',
  nodes: [networkPlate, subnetPlate, isolatedPlate, blockA, blockB],
  connections: [
    {
      id: 'conn-1',
      from: endpointId('block-a', 'output', 'data'),
      to: endpointId('block-b', 'input', 'data'),
      metadata: {},
    },
  ],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('InspectorPanel actions', () => {
  beforeEach(() => {
    promptDialogMock.mockReset();
    playSoundMock.mockReset();

    useUIStore.setState({
      selectedId: null,
      showResourceGuide: false,
      isSoundMuted: false,
      inspector: { isOpen: true, activeTab: 'properties' },
      setSelectedId: vi.fn(),
      setToolMode: vi.fn(),
      toggleResourceGuide: vi.fn(),
    });

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace A',
        architecture,
        createdAt: '',
        updatedAt: '',
      },
      renameNode: vi.fn(),
      removeNode: vi.fn(),
      duplicateBlock: vi.fn(),
      removeConnection: vi.fn(),
      updateConnectionType: vi.fn(),
    });
  });

  it('updates and deletes selected connection from properties tab', async () => {
    const user = userEvent.setup();
    const updateConnectionType = vi.fn();
    const removeConnection = vi.fn();
    const setSelectedId = vi.fn();

    useUIStore.setState({ selectedId: 'conn-1', setSelectedId });
    useArchitectureStore.setState({ updateConnectionType, removeConnection });

    render(<InspectorPanel />);

    await user.selectOptions(screen.getByRole('combobox'), 'http');
    expect(updateConnectionType).toHaveBeenCalledWith('conn-1', 'http');

    await user.click(screen.getByRole('button', { name: /Delete/ }));
    expect(removeConnection).toHaveBeenCalledWith('conn-1');
    expect(setSelectedId).toHaveBeenCalledWith(null);
    expect(playSoundMock).toHaveBeenCalledWith('delete');
  });

  it('renames block on Enter and skips rename for blank value', async () => {
    const user = userEvent.setup();
    const renameNode = vi.fn();

    useUIStore.setState({ selectedId: 'block-a' });
    useArchitectureStore.setState({ renameNode });

    render(<InspectorPanel />);

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input = screen.getByDisplayValue('App VM');
    await user.clear(input);
    await user.type(input, 'Renamed VM{enter}');
    expect(renameNode).toHaveBeenCalledWith('block-a', 'Renamed VM');

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input2 = screen.getByDisplayValue('App VM');
    await user.clear(input2);
    await user.tab();
    expect(renameNode).toHaveBeenCalledTimes(1);
  });

  it('handles block action buttons including guide branch and delete', async () => {
    const user = userEvent.setup();
    const setToolMode = vi.fn();
    const duplicateBlock = vi.fn();
    const toggleResourceGuide = vi.fn();
    const removeNode = vi.fn();
    const setSelectedId = vi.fn();

    useUIStore.setState({
      selectedId: 'block-a',
      setToolMode,
      toggleResourceGuide,
      setSelectedId,
      showResourceGuide: false,
      isSoundMuted: true,
    });
    useArchitectureStore.setState({ duplicateBlock, removeNode });

    const { rerender } = render(<InspectorPanel />);

    await user.click(screen.getByRole('button', { name: /Link/ }));
    expect(setToolMode).toHaveBeenCalledWith('connect');

    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(duplicateBlock).toHaveBeenCalledWith('block-a');
    expect(playSoundMock).not.toHaveBeenCalledWith('block-snap');

    await user.click(screen.getByRole('button', { name: /Guide/ }));
    expect(toggleResourceGuide).toHaveBeenCalledOnce();

    useUIStore.setState({ showResourceGuide: true });
    rerender(<InspectorPanel />);
    await user.click(screen.getByRole('button', { name: /Guide/ }));
    expect(toggleResourceGuide).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTitle('Delete (Del)'));
    expect(removeNode).toHaveBeenCalledWith('block-a');
    expect(setSelectedId).toHaveBeenCalledWith(null);
  });

  it('handles plate deploy, rename variants, and delete actions', async () => {
    const user = userEvent.setup();
    const setSelectedId = vi.fn();
    const renameNode = vi.fn();
    const removeNode = vi.fn();

    promptDialogMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('   ')
      .mockResolvedValueOnce(' Renamed Plate ');

    useUIStore.setState({ selectedId: 'plate-2', setSelectedId });
    useArchitectureStore.setState({ renameNode, removeNode });

    render(<InspectorPanel />);

    expect(screen.getByText('Subnet Actions')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Deploy/ }));
    expect(setSelectedId).toHaveBeenCalledWith('plate-2');

    await user.click(screen.getByRole('button', { name: /Rename/ }));
    await user.click(screen.getByRole('button', { name: /Rename/ }));
    await user.click(screen.getByRole('button', { name: /Rename/ }));
    expect(renameNode).toHaveBeenCalledTimes(1);
    expect(renameNode).toHaveBeenCalledWith('plate-2', 'Renamed Plate');

    await user.click(screen.getByTitle('Delete (E)'));
    expect(removeNode).toHaveBeenCalledWith('plate-2');
    expect(setSelectedId).toHaveBeenCalledWith(null);
    expect(playSoundMock).toHaveBeenCalledWith('delete');
  });

  it('cancels inline rename on Escape and plays copy sound when unmuted', async () => {
    const user = userEvent.setup();
    const duplicateBlock = vi.fn();

    useUIStore.setState({ selectedId: 'block-a', isSoundMuted: false });
    useArchitectureStore.setState({ duplicateBlock });

    render(<InspectorPanel />);

    await user.click(screen.getByRole('button', { name: 'App VM' }));
    const input = screen.getByDisplayValue('App VM');
    await user.type(input, '{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(duplicateBlock).toHaveBeenCalledWith('block-a');
    expect(playSoundMock).toHaveBeenCalledWith('block-snap');
  });

  it('shows connections tab empty states and plate-related list', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<InspectorPanel />);
    await user.click(screen.getByRole('tab', { name: 'Connections' }));
    expect(screen.getByText('Select a node to view connections.')).toBeInTheDocument();

    useUIStore.setState({ selectedId: 'plate-3' });
    rerender(<InspectorPanel />);
    await user.click(screen.getByRole('tab', { name: 'Connections' }));
    expect(screen.getByText('No connections found for the selected node.')).toBeInTheDocument();

    useUIStore.setState({ selectedId: 'plate-2' });
    rerender(<InspectorPanel />);
    await user.click(screen.getByRole('tab', { name: 'Connections' }));
    expect(screen.getByText('Related Connections')).toBeInTheDocument();
    expect(screen.getByText(/App VM/)).toBeInTheDocument();
    expect(screen.getByText(/DB/)).toBeInTheDocument();
  });

  it('falls back to raw IDs in connection details when endpoint nodes are missing', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ selectedId: 'conn-missing' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace A',
        architecture: {
          ...architecture,
          connections: [
            {
              id: 'conn-missing',
              from: endpointId('ghost-src', 'output', 'http'),
              to: endpointId('ghost-tgt', 'input', 'http'),
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<InspectorPanel />);
    await user.click(screen.getByRole('tab', { name: 'Connections' }));

    expect(screen.getByText('Connection Details')).toBeInTheDocument();
    expect(screen.getByText('ghost-src')).toBeInTheDocument();
    expect(screen.getByText('ghost-tgt')).toBeInTheDocument();
  });
});
