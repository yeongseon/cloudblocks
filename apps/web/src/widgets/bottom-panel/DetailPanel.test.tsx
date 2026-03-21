import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailPanel } from './DetailPanel';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Block, Connection, ExternalActor, Plate } from '@cloudblocks/schema';

vi.mock('./DetailPanel.css', () => ({}));

const networkPlate: Plate = { id: 'net-1', name: 'Main VNet', type: 'region', parentId: null, children: [], position: { x: 0, y: 0, z: 0 }, size: { width: 16, height: 0.3, depth: 20 }, metadata: {} };
const publicSubnet: Plate = { id: 'subnet-1', name: 'Public Subnet', type: 'subnet', subnetAccess: 'public', parentId: 'net-1', children: [], position: { x: 1, y: 0, z: 1 }, size: { width: 6, height: 0.3, depth: 8 }, metadata: {} };
const sourceBlock: Block = { id: 'block-1', name: 'App VM', category: 'compute', placementId: 'subnet-1', position: { x: 1.2, y: 2.4, z: 0 }, metadata: {} };
const targetBlock: Block = { id: 'block-2', name: 'SQL DB', category: 'database', placementId: 'subnet-1', position: { x: 3.5, y: 4.1, z: 0 }, metadata: {} };
const connection: Connection = { id: 'conn-1', sourceId: 'block-1', targetId: 'block-2', type: 'dataflow', metadata: {} };

const architectureWithResources: ArchitectureModel = {
  id: 'arch-1', name: 'Test Architecture', version: '1.0.0',
  plates: [networkPlate, publicSubnet], blocks: [sourceBlock, targetBlock],
  connections: [connection], externalActors: [], createdAt: '', updatedAt: '',
};

describe('DetailPanel', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedId: null });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: architectureWithResources, createdAt: '', updatedAt: '' } });
  });

  it('renders welcome state when nothing is selected', () => {
    render(<DetailPanel />);
    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
    expect(screen.getByText('Tip: Start with Network')).toBeInTheDocument();
  });

  it('renders block detail read-only with Description field', () => {
    useUIStore.setState({ selectedId: 'block-1' });
    render(<DetailPanel />);
    expect(screen.getByText('App VM')).toBeInTheDocument();
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
    expect(screen.getByText('compute')).toBeInTheDocument();
    expect(screen.getByText('(1.2, 2.4, 0.0)')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  it('shows provider and subtype identity for provider-specific blocks', () => {
    const providerBlock: Block = { ...sourceBlock, id: 'bp', provider: 'aws', subtype: 'ec2' };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, blocks: [providerBlock] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'bp' });
    render(<DetailPanel />);
    expect(screen.getByText('AWS / ec2')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Subtype')).toBeInTheDocument();
  });

  it('renders plate detail as read-only', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });
    render(<DetailPanel />);
    expect(screen.getByText('Public Subnet')).toBeInTheDocument();
    expect(screen.getByText('Subnet (public)')).toBeInTheDocument();
    expect(screen.getByText('Main VNet')).toBeInTheDocument();
    expect(screen.getByText('6 × 8')).toBeInTheDocument();
    expect(screen.getByText('2 blocks')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rename/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders connection detail read-only', () => {
    useUIStore.setState({ selectedId: 'conn-1' });
    render(<DetailPanel />);
    expect(screen.getByText('Data Flow Connection')).toBeInTheDocument();
    expect(screen.getByText('Data Flow')).toBeInTheDocument();
    expect(screen.getByText(/App VM/)).toBeInTheDocument();
    expect(screen.getByText(/SQL DB/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  it('renders http connection type', () => {
    const httpConn: Connection = { ...connection, id: 'conn-http', type: 'http' };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, connections: [httpConn] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'conn-http' });
    render(<DetailPanel />);
    expect(screen.getByText('HTTP Connection')).toBeInTheDocument();
  });

  it('falls back to welcome state when selected id does not exist', () => {
    useUIStore.setState({ selectedId: 'missing-id' });
    render(<DetailPanel />);
    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
  });

  it('renders region plate with no parent row', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    render(<DetailPanel />);
    expect(screen.getByRole('img', { name: 'Region' })).toBeInTheDocument();
    expect(screen.queryByText('Parent')).not.toBeInTheDocument();
    expect(screen.getByText(/1 subnet/)).toBeInTheDocument();
  });

  it('renders private subnet plate', () => {
    const priv: Plate = { id: 'priv-1', name: 'Private Subnet', type: 'subnet', subnetAccess: 'private', parentId: 'net-1', children: [], position: { x: 0, y: 0, z: 0 }, size: { width: 6, height: 0.3, depth: 8 }, metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, plates: [...architectureWithResources.plates, priv] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'priv-1' });
    render(<DetailPanel />);
    expect(screen.getByRole('img', { name: 'Private Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet (private)')).toBeInTheDocument();
  });

  it('renders singular block count', () => {
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, blocks: [sourceBlock] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'subnet-1' });
    render(<DetailPanel />);
    expect(screen.getByText(/1 block$/)).toBeInTheDocument();
  });

  it('renders child subnet count', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    render(<DetailPanel />);
    expect(screen.getByText(/1 subnet$/)).toBeInTheDocument();
  });

  it('renders external actor in connection', () => {
    const actor: ExternalActor = { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } };
    const extConn: Connection = { id: 'ext-conn', sourceId: 'ext-internet', targetId: 'block-1', type: 'dataflow', metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, externalActors: [actor], connections: [extConn] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'ext-conn' });
    render(<DetailPanel />);
    expect(screen.getByText(/Internet/)).toBeInTheDocument();
  });

  it('renders Unknown for missing source', () => {
    const extConn: Connection = { id: 'ext-conn', sourceId: 'nonexistent', targetId: 'block-1', type: 'dataflow', metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, connections: [extConn] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'ext-conn' });
    render(<DetailPanel />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders Unknown for missing target', () => {
    const badConn: Connection = { id: 'bad', sourceId: 'block-1', targetId: 'missing', type: 'dataflow', metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, connections: [badConn] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'bad' });
    render(<DetailPanel />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders block network as None when parent plate is missing', () => {
    const orphan: Block = { ...sourceBlock, id: 'orphan', placementId: 'missing' };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, blocks: [orphan] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'orphan' });
    render(<DetailPanel />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders idle state when architecture is empty', () => {
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { id: 'a', name: 'Empty', version: '1.0.0', plates: [], blocks: [], connections: [], externalActors: [], createdAt: '', updatedAt: '' }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: null, showTemplateGallery: false });
    render(<DetailPanel />);
    expect(screen.getByText('No selection')).toBeInTheDocument();
  });

  it('renders welcome state when template gallery is open on empty canvas', () => {
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { id: 'a', name: 'Empty', version: '1.0.0', plates: [], blocks: [], connections: [], externalActors: [], createdAt: '', updatedAt: '' }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: null, showTemplateGallery: true });
    render(<DetailPanel />);
    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
  });

  it('renders worker detail', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    useWorkerStore.setState({ workerState: 'building', workerPosition: [2, 0, 3], activeBuild: { blockId: 'block-1', targetPosition: [1, 0, 1], progress: 0.5, startedAt: Date.now() }, buildQueue: [] });
    render(<DetailPanel />);
    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('building')).toBeInTheDocument();
    expect(screen.getByText('(2.0, 0.0, 3.0)')).toBeInTheDocument();
    expect(screen.getByText(/block-1.*50%/)).toBeInTheDocument();
  });

  it('renders worker detail with no active build', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    useWorkerStore.setState({ workerState: 'idle', workerPosition: [0, 0, 0], activeBuild: null, buildQueue: [] });
    render(<DetailPanel />);
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders zone plate', () => {
    const zone: Plate = { id: 'zone-1', name: 'Zone A', type: 'zone', parentId: 'net-1', children: [], position: { x: 0, y: 0, z: 0 }, size: { width: 4, height: 0.3, depth: 4 }, metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, plates: [...architectureWithResources.plates, zone] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'zone-1' });
    render(<DetailPanel />);
    expect(screen.getByRole('img', { name: 'Zone' })).toBeInTheDocument();
    expect(screen.getByText('Zone A')).toBeInTheDocument();
  });

  it('renders public subnet with globe icon', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });
    render(<DetailPanel />);
    expect(screen.getByRole('img', { name: 'Public Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet (public)')).toBeInTheDocument();
  });

  it('renders user emoji for non-internet external actor type', () => {
    const actor = { id: 'ext-user', name: 'Admin', type: 'user', position: { x: 0, y: 0, z: 0 } } as unknown as ExternalActor;
    const conn: Connection = { id: 'ext-conn-user', sourceId: 'ext-user', targetId: 'block-1', type: 'dataflow', metadata: {} };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, externalActors: [actor], connections: [conn] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'ext-conn-user' });
    render(<DetailPanel />);
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it('shows block config when config data exists', () => {
    const b: Block = { ...sourceBlock, id: 'bc', config: { tier: 'premium', scale: 3 } };
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...architectureWithResources, blocks: [b] }, createdAt: '', updatedAt: '' } });
    useUIStore.setState({ selectedId: 'bc' });
    render(<DetailPanel />);
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getByText(/tier: premium/)).toBeInTheDocument();
  });
});
