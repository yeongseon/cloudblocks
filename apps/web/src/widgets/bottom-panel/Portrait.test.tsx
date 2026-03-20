import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Portrait } from './Portrait';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Block, Connection, Plate } from '@cloudblocks/schema';

vi.mock('./Portrait.css', () => ({}));
vi.mock('../../shared/assets/azure-icons/virtual-machine.svg', () => ({ default: 'vm.svg' }));
vi.mock('../../shared/assets/azure-icons/sql-database.svg', () => ({ default: 'sql.svg' }));
vi.mock('../../shared/assets/azure-icons/storage-account.svg', () => ({ default: 'storage.svg' }));
vi.mock('../../shared/assets/azure-icons/application-gateway.svg', () => ({ default: 'gateway.svg' }));
vi.mock('../../shared/assets/azure-icons/logic-apps.svg', () => ({ default: 'function.svg' }));
vi.mock('../../shared/assets/azure-icons/service-bus.svg', () => ({ default: 'queue.svg' }));
vi.mock('../../shared/assets/azure-icons/event-hub.svg', () => ({ default: 'event.svg' }));
vi.mock('../../shared/assets/azure-icons/virtual-network.svg', () => ({ default: 'vnet.svg' }));
vi.mock('../../shared/assets/azure-icons/subnet.svg', () => ({ default: 'subnet.svg' }));

const networkPlate: Plate = {
  id: 'net-1',
  name: 'Main VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: Plate = {
  id: 'subnet-1',
  name: 'Public Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: [],
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const computeBlock: Block = {
  id: 'block-1',
  name: 'App VM',
  category: 'compute',
  placementId: 'subnet-1',
  position: { x: 1, y: 0, z: 1 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'block-1',
  targetId: 'missing',
  type: 'dataflow',
  metadata: {},
};

const architectureFixture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  plates: [networkPlate, publicSubnet],
  blocks: [computeBlock],
  connections: [connection],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('Portrait', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedId: null });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: architectureFixture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders empty state with CloudBlocks label', () => {
    render(<Portrait />);

    expect(screen.getByText('☁️')).toBeInTheDocument();
    expect(screen.getByText('CloudBlocks')).toBeInTheDocument();
  });

  it('renders block portrait with actual block name and category icon', () => {
    useUIStore.setState({ selectedId: 'block-1' });

    render(<Portrait />);

    const blockImage = screen.getByRole('img', { name: 'Virtual Machine' });
    expect(blockImage).toBeInTheDocument();
    expect(blockImage).toHaveAttribute('src', 'vm.svg');
    expect(screen.getByText('App VM')).toBeInTheDocument();
    expect(screen.getByText('compute')).toBeInTheDocument();
  });

  it('renders renamed block name in portrait', () => {
    const renamedBlock: Block = { ...computeBlock, id: 'block-2', name: 'My Custom Server' };
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...architectureFixture, blocks: [...architectureFixture.blocks, renamedBlock] },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'block-2' });

    render(<Portrait />);

    expect(screen.getByText('My Custom Server')).toBeInTheDocument();
    expect(screen.getByText('compute')).toBeInTheDocument();
  });
  it('renders region plate portrait with VNet icon', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    render(<Portrait />);

    const plateImage = screen.getByRole('img', { name: 'Region' });
    expect(plateImage).toBeInTheDocument();
    expect(plateImage).toHaveAttribute('src', 'vnet.svg');
  });

  it('renders subnet plate portrait with subnet icon', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });

    render(<Portrait />);

    const subnetImage = screen.getByRole('img', { name: 'Public Subnet' });
    expect(subnetImage).toBeInTheDocument();
    expect(subnetImage).toHaveAttribute('src', 'subnet.svg');
  });
  it('renders region plate portrait with correct plate-type background color', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    const { container } = render(<Portrait />);

    const panel = container.querySelector('.portrait-panel--plate');
    expect(panel).toBeInTheDocument();
    // Region plate uses leftSideColor=#64B5F6, rightSideColor=#42A5F5 from getPlateFaceColors
    expect(panel).toHaveStyle({ backgroundColor: '#64B5F6', borderColor: '#42A5F5' });
  });

  it('renders subnet plate portrait with correct subnet-type background color', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });

    const { container } = render(<Portrait />);

    const panel = container.querySelector('.portrait-panel--plate');
    expect(panel).toBeInTheDocument();
    // Public subnet uses leftSideColor=#16A34A, rightSideColor=#15803D from getPlateFaceColors
    expect(panel).toHaveStyle({ backgroundColor: '#16A34A', borderColor: '#15803D' });
  });

  it('renders connection portrait with actual type label', () => {
    useUIStore.setState({ selectedId: 'conn-1' });

    render(<Portrait />);

    expect(screen.getByText('🔗')).toBeInTheDocument();
    expect(screen.getByText('Data Flow')).toBeInTheDocument();
    expect(screen.getByText('dataflow')).toBeInTheDocument();
  });

  it('renders http connection type in portrait', () => {
    const httpConnection: Connection = { ...connection, id: 'conn-http', type: 'http' };
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...architectureFixture, connections: [httpConnection] },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'conn-http' });

    render(<Portrait />);

    expect(screen.getByText('HTTP')).toBeInTheDocument();
    expect(screen.getByText('http')).toBeInTheDocument();
  });

  it('renders async connection type in portrait', () => {
    const asyncConnection: Connection = { ...connection, id: 'conn-async', type: 'async' };
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...architectureFixture, connections: [asyncConnection] },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'conn-async' });

    render(<Portrait />);

    expect(screen.getByText('Async')).toBeInTheDocument();
    expect(screen.getByText('async')).toBeInTheDocument();
  });

  it('renders worker portrait when selectedId is worker-default', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    useWorkerStore.setState({ workerState: 'idle' });

    render(<Portrait />);

    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });
});
