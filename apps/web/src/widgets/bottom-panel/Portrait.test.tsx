import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Portrait } from './Portrait';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Connection, Plate } from '../../shared/types/index';

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

  it('renders block portrait icon and friendly name', () => {
    useUIStore.setState({ selectedId: 'block-1' });

    render(<Portrait />);

    const blockImage = screen.getByRole('img', { name: 'Virtual Machine' });
    expect(blockImage).toBeInTheDocument();
    expect(blockImage).toHaveAttribute('src', 'vm.svg');
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
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

  it('renders connection portrait with link icon', () => {
    useUIStore.setState({ selectedId: 'conn-1' });

    render(<Portrait />);

    expect(screen.getByText('🔗')).toBeInTheDocument();
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('dataflow')).toBeInTheDocument();
  });
});
