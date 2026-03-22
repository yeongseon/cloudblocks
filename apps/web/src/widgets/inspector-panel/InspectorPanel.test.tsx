import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { InspectorPanel } from './InspectorPanel';

vi.mock('./InspectorPanel.css', () => ({}));
vi.mock('../code-preview/CodePreview', () => ({
  CodePreview: ({ embedded = false }: { embedded?: boolean }) => (
    <div data-testid="inspector-code-preview">{embedded ? 'embedded' : 'overlay'}</div>
  ),
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

const blockA: LeafNode = {
  id: 'block-a',
  name: 'App VM',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'plate-1',
  position: { x: 1, y: 0, z: 2 },
  metadata: {},
};

const blockB: LeafNode = {
  id: 'block-b',
  name: 'SQL DB',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'sql_database',
  category: 'data',
  provider: 'azure',
  parentId: 'plate-1',
  position: { x: 4, y: 0, z: 2 },
  metadata: {},
};

const architecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Inspector Test Architecture',
  version: '1.0.0',
  nodes: [networkPlate, blockA, blockB],
  connections: [
    {
      id: 'conn-1',
      sourceId: 'block-a',
      targetId: 'block-b',
      type: 'dataflow',
      metadata: {},
    },
  ],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('InspectorPanel', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedId: null,
      inspector: { isOpen: true, activeTab: 'properties' },
      showCodePreview: false,
    });

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Inspector Workspace',
        architecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders workspace summary when nothing is selected', () => {
    render(<InspectorPanel />);

    expect(screen.getByText('Workspace Summary')).toBeInTheDocument();
    expect(screen.getByText('Inspector Test Architecture')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows block properties when a block is selected', () => {
    useUIStore.setState({ selectedId: 'block-a' });

    render(<InspectorPanel />);

    expect(screen.getByText('Block Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'App VM' })).toBeInTheDocument();
    expect(screen.getByText('web_compute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Link/ })).toBeInTheDocument();
  });

  it('shows plate properties when a plate is selected', () => {
    useUIStore.setState({ selectedId: 'plate-1' });

    render(<InspectorPanel />);

    expect(screen.getByText('VNet Actions')).toBeInTheDocument();
    expect(screen.getByText('16 × 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy/ })).toBeInTheDocument();
  });

  it('shows connection properties when a connection is selected', () => {
    useUIStore.setState({ selectedId: 'conn-1' });

    render(<InspectorPanel />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getAllByText('Data Flow').length).toBeGreaterThan(0);
    expect(screen.getByText('App VM')).toBeInTheDocument();
    expect(screen.getByText('SQL DB')).toBeInTheDocument();
  });

  it('switches tabs between properties, code, and connections', async () => {
    const user = userEvent.setup();
    render(<InspectorPanel />);

    await user.click(screen.getByRole('tab', { name: 'Code' }));
    expect(useUIStore.getState().inspector.activeTab).toBe('code');

    await user.click(screen.getByRole('tab', { name: 'Connections' }));
    expect(useUIStore.getState().inspector.activeTab).toBe('connections');

    await user.click(screen.getByRole('tab', { name: 'Properties' }));
    expect(useUIStore.getState().inspector.activeTab).toBe('properties');
  });

  it('renders CodePreview in embedded mode on code tab', async () => {
    const user = userEvent.setup();
    render(<InspectorPanel />);

    await user.click(screen.getByRole('tab', { name: 'Code' }));

    expect(await screen.findByTestId('inspector-code-preview')).toHaveTextContent('embedded');
  });

  it('shows related connections for selected node in connections tab', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'block-a' });
    render(<InspectorPanel />);

    await user.click(screen.getByRole('tab', { name: 'Connections' }));

    expect(screen.getByText('Related Connections')).toBeInTheDocument();
    expect(screen.getByText(/App VM/)).toBeInTheDocument();
    expect(screen.getByText('Data Flow')).toBeInTheDocument();
  });
});
