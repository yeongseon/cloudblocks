import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailPanel } from './DetailPanel';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Block, Connection, ExternalActor, Plate } from '@cloudblocks/schema';

vi.mock('./DetailPanel.css', () => ({}));

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

const sourceBlock: Block = {
  id: 'block-1',
  name: 'App VM',
  category: 'compute',
  placementId: 'subnet-1',
  position: { x: 1.2, y: 2.4, z: 0 },
  metadata: {},
};

const targetBlock: Block = {
  id: 'block-2',
  name: 'SQL DB',
  category: 'database',
  placementId: 'subnet-1',
  position: { x: 3.5, y: 4.1, z: 0 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'block-1',
  targetId: 'block-2',
  type: 'dataflow',
  metadata: {},
};

const architectureWithResources: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  plates: [networkPlate, publicSubnet],
  blocks: [sourceBlock, targetBlock],
  connections: [connection],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('DetailPanel', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedId: null });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: architectureWithResources,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders welcome state when nothing is selected', () => {
    render(<DetailPanel />);

    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
    expect(screen.getByText('Tip: Start with Network')).toBeInTheDocument();
  });

  it('renders block detail as read-only with name, type, description, category, and position', () => {
    useUIStore.setState({ selectedId: 'block-1' });

    render(<DetailPanel />);

    expect(screen.getByText('App VM')).toBeInTheDocument();
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
    expect(screen.getByText('Runs your application code')).toBeInTheDocument();
    expect(screen.getByText('compute')).toBeInTheDocument();
    expect(screen.getByText('(1.2, 2.4, 0.0)')).toBeInTheDocument();

    // No rename button or edit controls
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows provider and subtype identity for provider-specific blocks', () => {
    const providerSpecificBlock: Block = {
      ...sourceBlock,
      id: 'block-provider-specific',
      provider: 'aws',
      subtype: 'ec2',
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          blocks: [providerSpecificBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'block-provider-specific' });

    render(<DetailPanel />);

    expect(screen.getByText('AWS / ec2')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Subtype')).toBeInTheDocument();
  });

  it('renders plate detail as read-only including size and contents count', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });

    render(<DetailPanel />);

    expect(screen.getByText('Public Subnet')).toBeInTheDocument();
    expect(screen.getByText('Subnet (public)')).toBeInTheDocument();
    expect(screen.getByText('Main VNet')).toBeInTheDocument();
    expect(screen.getByText(/6\s*.\s*8/)).toBeInTheDocument();
    expect(screen.getByText('2 blocks')).toBeInTheDocument();

    // No profile select or rename button
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders connection detail with type and source/target resources', () => {
    useUIStore.setState({ selectedId: 'conn-1' });

    render(<DetailPanel />);

    expect(screen.getByText('Data Flow Connection')).toBeInTheDocument();
    expect(screen.getByText('Data Flow')).toBeInTheDocument();
    expect(screen.getByText(/App VM/)).toBeInTheDocument();
    expect(screen.getByText(/SQL DB/)).toBeInTheDocument();
  });

  it('renders http connection type in detail panel', () => {
    const httpConnection: Connection = { ...connection, id: 'conn-http', type: 'http' };
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: { ...architectureWithResources, connections: [httpConnection] },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'conn-http' });

    render(<DetailPanel />);

    expect(screen.getByText('HTTP Connection')).toBeInTheDocument();
    expect(screen.getByText('HTTP')).toBeInTheDocument();
  });

  it('falls back to welcome state when selected id does not exist', () => {
    useUIStore.setState({ selectedId: 'missing-id' });

    render(<DetailPanel />);

    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
  });

  it('renders region plate detail with network icon and no parent row', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.queryByText('Parent')).not.toBeInTheDocument();
    expect(screen.getByText(/1 subnet/)).toBeInTheDocument();
  });

  it('renders private subnet plate with correct type label', () => {
    const privateSubnet: Plate = {
      id: 'priv-1',
      name: 'Private Subnet',
      type: 'subnet',
      subnetAccess: 'private',
      parentId: 'net-1',
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 6, height: 0.3, depth: 8 },
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          plates: [...architectureWithResources.plates, privateSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'priv-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Private Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet (private)')).toBeInTheDocument();
  });

  it('renders singular block count when plate has one block', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          blocks: [sourceBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'subnet-1' });

    render(<DetailPanel />);

    expect(screen.getByText(/1 block$/)).toBeInTheDocument();
  });

  it('renders child subnet count on network plate contents', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    render(<DetailPanel />);

    expect(screen.getByText(/1 subnet$/)).toBeInTheDocument();
  });

  it('renders external actor name when connection source is an external actor', () => {
    const actor: ExternalActor = {
      id: 'ext-internet',
      name: 'Internet',
      type: 'internet',
      position: { x: -3, y: 0, z: 5 },
    };
    const externalConnection: Connection = {
      id: 'ext-conn',
      sourceId: 'ext-internet',
      targetId: 'block-1',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          externalActors: [actor],
          connections: [externalConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'ext-conn' });

    render(<DetailPanel />);

    expect(screen.getByText(/Internet/)).toBeInTheDocument();
  });

  it('renders non-default external actor name in connection source', () => {
    const actor: ExternalActor = {
      id: 'ext-partner',
      name: 'Partner API',
      type: 'internet',
      position: { x: -3, y: 0, z: 5 },
    };
    const externalConnection: Connection = {
      id: 'ext-conn',
      sourceId: 'ext-partner',
      targetId: 'block-1',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          externalActors: [actor],
          connections: [externalConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'ext-conn' });

    render(<DetailPanel />);

    expect(screen.getByText(/Partner API/)).toBeInTheDocument();
  });

  it('renders user emoji for non-internet external actor type', () => {
    const actor = {
      id: 'ext-user',
      name: 'Admin',
      type: 'user',
      position: { x: 0, y: 0, z: 0 },
    } as unknown as ExternalActor;
    const conn: Connection = {
      id: 'ext-conn-user',
      sourceId: 'ext-user',
      targetId: 'block-1',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          externalActors: [actor],
          connections: [conn],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'ext-conn-user' });

    render(<DetailPanel />);

    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it('renders Unknown when connection source is neither block nor external actor', () => {
    const externalConnection: Connection = {
      id: 'ext-conn',
      sourceId: 'nonexistent-id',
      targetId: 'block-1',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          connections: [externalConnection],
          externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: 0, y: 0, z: 0 } }],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'ext-conn' });

    render(<DetailPanel />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders unknown source when connection source id is invalid', () => {
    const badSourceConnection: Connection = {
      id: 'bad-source-conn',
      sourceId: 'nonexistent-id',
      targetId: 'block-1',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          connections: [badSourceConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'bad-source-conn' });

    render(<DetailPanel />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders unknown target when connection target block is missing', () => {
    const unknownTargetConnection: Connection = {
      id: 'bad-conn',
      sourceId: 'block-1',
      targetId: 'missing-block',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          connections: [unknownTargetConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'bad-conn' });

    render(<DetailPanel />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders block network as None when parent plate is missing', () => {
    const unplacedBlock: Block = {
      ...sourceBlock,
      id: 'block-orphan',
      placementId: 'missing-plate',
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          blocks: [unplacedBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'block-orphan' });

    render(<DetailPanel />);

    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it("renders idle state when architecture is empty (overlay is visible)", () => {
    useArchitectureStore.setState({
      workspace: {
        id: "ws-1",
        name: "Test Workspace",
        architecture: {
          id: "arch-1",
          name: "Empty Architecture",
          version: "1.0.0",
          plates: [],
          blocks: [],
          connections: [],
          externalActors: [],
          createdAt: "",
          updatedAt: "",
        },
        createdAt: "",
        updatedAt: "",
      },
    });
    useUIStore.setState({ selectedId: null, showTemplateGallery: false });

    render(<DetailPanel />);

    expect(screen.getByText("No selection")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to CloudBlocks!")).not.toBeInTheDocument();
  });

  it("renders welcome state when template gallery is open even on empty canvas", () => {
    useArchitectureStore.setState({
      workspace: {
        id: "ws-1",
        name: "Test Workspace",
        architecture: {
          id: "arch-1",
          name: "Empty Architecture",
          version: "1.0.0",
          plates: [],
          blocks: [],
          connections: [],
          externalActors: [],
          createdAt: "",
          updatedAt: "",
        },
        createdAt: "",
        updatedAt: "",
      },
    });
    useUIStore.setState({ selectedId: null, showTemplateGallery: true });

    render(<DetailPanel />);

    expect(screen.getByText("Welcome to CloudBlocks!")).toBeInTheDocument();
    expect(screen.queryByText("No selection")).not.toBeInTheDocument();
  });

  it('renders worker detail when selectedId is worker-default', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    useWorkerStore.setState({
      workerState: 'building',
      workerPosition: [2, 0, 3],
      activeBuild: { blockId: 'block-1', targetPosition: [1, 0, 1], progress: 0.5, startedAt: Date.now() },
      buildQueue: [],
    });

    render(<DetailPanel />);

    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('building')).toBeInTheDocument();
    expect(screen.getByText('(2.0, 0.0, 3.0)')).toBeInTheDocument();
    expect(screen.getByText(/block-1.*50%/)).toBeInTheDocument();
    expect(screen.getByText('0 task(s)')).toBeInTheDocument();
  });

  it('renders worker detail with no active build', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    useWorkerStore.setState({
      workerState: 'idle',
      workerPosition: [0, 0, 0],
      activeBuild: null,
      buildQueue: [],
    });

    render(<DetailPanel />);

    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders zone plate with capitalized type name', () => {
    const zonePlate: Plate = {
      id: 'zone-1',
      name: 'Zone A',
      type: 'zone',
      parentId: 'net-1',
      children: [],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 4, height: 0.3, depth: 4 },
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          plates: [...architectureWithResources.plates, zonePlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'zone-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Zone' })).toBeInTheDocument();
    expect(screen.getByText('Zone A')).toBeInTheDocument();
  });

  it('renders public subnet plate with globe icon', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Public Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet (public)')).toBeInTheDocument();
  });
});
