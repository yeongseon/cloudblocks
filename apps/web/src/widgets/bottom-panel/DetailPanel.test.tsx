import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailPanel } from './DetailPanel';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Connection, ExternalActor, ContainerNode, LeafNode } from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';

vi.mock('./DetailPanel.css', () => ({}));

const networkPlate: ContainerNode = {
  id: 'net-1',
  name: 'Main VNet',
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

const publicSubnet: ContainerNode = {
  id: 'subnet-1',
  name: 'Subnet 1',
  kind: 'container',
  layer: 'subnet',
  resourceType: 'subnet',
  category: 'network',
  provider: 'azure',
  parentId: 'net-1',
  position: { x: 1, y: 0, z: 1 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const sourceBlock: LeafNode = {
  id: 'block-1',
  name: 'App VM',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'web_compute',
  category: 'compute',
  provider: 'azure',
  parentId: 'subnet-1',
  position: { x: 1.2, y: 2.4, z: 0 },
  metadata: {},
};

const targetBlock: LeafNode = {
  id: 'block-2',
  name: 'SQL DB',
  kind: 'resource',
  layer: 'resource',
  resourceType: 'relational_database',
  category: 'data',
  provider: 'azure',
  parentId: 'subnet-1',
  position: { x: 3.5, y: 4.1, z: 0 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  from: endpointId('block-1', 'output', 'data'),
  to: endpointId('block-2', 'input', 'data'),
  metadata: {},
};

const architectureWithResources: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1.0.0',
  nodes: [networkPlate, publicSubnet, sourceBlock, targetBlock],
  connections: [connection],
  endpoints: [],
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

  it('renders workspace dashboard when nothing is selected', () => {
    render(<DetailPanel />);

    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    expect(screen.getByText('AZURE')).toBeInTheDocument();
    expect(screen.getByText('Plates')).toBeInTheDocument();
    expect(screen.getByText('Blocks')).toBeInTheDocument();
    expect(screen.getByText('Connection')).toBeInTheDocument();
  });

  it('renders block detail with type, category, and encyclopedia', () => {
    useUIStore.setState({ selectedId: 'block-1' });

    render(<DetailPanel />);

    expect(screen.getByText('App VM')).toBeInTheDocument();
    expect(screen.getAllByText('AZURE').length).toBeGreaterThan(0);
    expect(screen.getByText('compute')).toBeInTheDocument();
    expect(screen.getByText('What is this?')).toBeInTheDocument();
    expect(screen.getByText('Placement Rules')).toBeInTheDocument();
    expect(screen.getByText('Connections')).toBeInTheDocument();
  });

  it('shows type identity for provider-specific blocks', () => {
    const providerSpecificBlock: LeafNode = {
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
          nodes: [networkPlate, publicSubnet, providerSpecificBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'block-provider-specific' });

    render(<DetailPanel />);

    expect(screen.getByText('AWS / ec2')).toBeInTheDocument();
  });

  it('renders plate detail including contents count and encyclopedia', () => {
    useUIStore.setState({ selectedId: 'subnet-1' });

    render(<DetailPanel />);

    expect(screen.getByText('Subnet 1')).toBeInTheDocument();
    expect(screen.getByText('Subnet')).toBeInTheDocument();
    expect(screen.getByText('Main VNet')).toBeInTheDocument();
    expect(screen.getByText('2 blocks')).toBeInTheDocument();
    expect(screen.getByText('What is this?')).toBeInTheDocument();
    expect(screen.getByText('Nesting Rules')).toBeInTheDocument();
  });

  it('renders connection detail with type header, source/target, and encyclopedia', () => {
    useUIStore.setState({ selectedId: 'conn-1' });

    render(<DetailPanel />);

    expect(screen.getByText('Data Flow Connection')).toBeInTheDocument();
    expect(screen.getByText(/App VM/)).toBeInTheDocument();
    expect(screen.getByText(/SQL DB/)).toBeInTheDocument();
    expect(screen.getByText('What is this?')).toBeInTheDocument();
    expect(screen.getByText('When to use')).toBeInTheDocument();
  });

  it('renders http connection type in detail panel', () => {
    const httpConnection: Connection = {
      ...connection,
      id: 'conn-http',
      from: endpointId('block-1', 'output', 'http'),
      to: endpointId('block-2', 'input', 'http'),
    };
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
  });

  it('falls back to dashboard when selected id does not exist', () => {
    useUIStore.setState({ selectedId: 'missing-id' });

    render(<DetailPanel />);

    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
  });

  it('renders region plate detail with network icon and no parent row', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Region' })).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.queryByText('Parent')).not.toBeInTheDocument();
    expect(screen.getByText(/1 subnet/)).toBeInTheDocument();
  });

  it('renders private subnet plate with lock icon', () => {
    const privateSubnet: ContainerNode = {
      id: 'priv-1',
      name: 'Subnet 2',
      kind: 'container',
      layer: 'subnet',
      resourceType: 'subnet',
      category: 'network',
      provider: 'azure',
      parentId: 'net-1',
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
          nodes: [...architectureWithResources.nodes, privateSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'priv-1' });

    render(<DetailPanel />);

    expect(screen.getByRole('img', { name: 'Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet')).toBeInTheDocument();
  });

  it('renders singular block count when plate has one block', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          nodes: [networkPlate, publicSubnet, sourceBlock],
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
      from: endpointId('ext-internet', 'output', 'data'),
      to: endpointId('block-1', 'input', 'data'),
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
      from: endpointId('ext-partner', 'output', 'data'),
      to: endpointId('block-1', 'input', 'data'),
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
      from: endpointId('ext-user', 'output', 'data'),
      to: endpointId('block-1', 'input', 'data'),
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
      from: endpointId('nonexistent-id', 'output', 'data'),
      to: endpointId('block-1', 'input', 'data'),
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          connections: [externalConnection],
          endpoints: [],
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
      from: endpointId('nonexistent-id', 'output', 'data'),
      to: endpointId('block-1', 'input', 'data'),
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
    expect(screen.queryByText('☁️ Internet')).not.toBeInTheDocument();
  });

  it('renders unknown target when connection target block is missing', () => {
    const unknownTargetConnection: Connection = {
      id: 'bad-conn',
      from: endpointId('block-1', 'output', 'data'),
      to: endpointId('missing-block', 'input', 'data'),
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
    const unplacedBlock: LeafNode = {
      ...sourceBlock,
      id: 'block-orphan',
      parentId: 'missing-plate',
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...architectureWithResources,
          nodes: [networkPlate, publicSubnet, unplacedBlock],
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
          nodes: [],
          connections: [],
          endpoints: [],
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
    expect(screen.queryByText("Test Workspace")).not.toBeInTheDocument();
  });

  it("renders dashboard when template gallery is open even on empty canvas", () => {
    useArchitectureStore.setState({
      workspace: {
        id: "ws-1",
        name: "Test Workspace",
        architecture: {
          id: "arch-1",
          name: "Empty Architecture",
          version: "1.0.0",
          nodes: [],
          connections: [],
          endpoints: [],
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

    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
    expect(screen.queryByText("No selection")).not.toBeInTheDocument();
  });

  it('renders zone plate with capitalized type name', () => {
    const zonePlate: ContainerNode = {
      id: 'zone-1',
      name: 'Zone A',
      kind: 'container',
      layer: 'zone',
      resourceType: 'virtual_network',
      category: 'network',
      provider: 'azure',
      parentId: 'net-1',
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
          nodes: [...architectureWithResources.nodes, zonePlate],
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

    expect(screen.getByRole('img', { name: 'Subnet' })).toBeInTheDocument();
    expect(screen.getByText('Subnet')).toBeInTheDocument();
  });

  it('renders student persona idle state with learning CTA', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          id: 'arch-1',
          name: 'Empty Architecture',
          version: '1.0.0',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: null, showTemplateGallery: false, persona: 'student' as const });

    render(<DetailPanel />);

    expect(screen.getByText('Ready to learn cloud architecture?')).toBeInTheDocument();
    expect(screen.getByText('Start Learning')).toBeInTheDocument();
    expect(screen.queryByText('No selection')).not.toBeInTheDocument();
  });

  it('clicking Start Learning opens scenario gallery and sets learn mode', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          id: 'arch-1',
          name: 'Empty Architecture',
          version: '1.0.0',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: null, showTemplateGallery: false, persona: 'student' as const });

    render(<DetailPanel />);

    fireEvent.click(screen.getByText('Start Learning'));

    expect(useUIStore.getState().showScenarioGallery).toBe(true);
    expect(useUIStore.getState().editorMode).toBe('learn');
  });
});
