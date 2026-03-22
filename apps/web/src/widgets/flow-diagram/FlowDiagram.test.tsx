import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowDiagram } from './FlowDiagram';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureModel, Connection, ExternalActor, LeafNode, ResourceCategory } from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';

vi.mock('./FlowDiagram.css', () => ({}));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Flow Test',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const resourceTypeByCategory: Record<ResourceCategory, string> = {
  network: 'virtual_network',
  security: 'firewall_security',
  edge: 'load_balancer',
  compute: 'web_compute',
  data: 'relational_database',
  messaging: 'message_queue',
  operations: 'monitoring',
};

const makeBlock = (id: string, category: ResourceCategory): LeafNode => ({
  id,
  name: `${id}-name`,
  kind: 'resource',
  layer: 'resource',
  resourceType: resourceTypeByCategory[category],
  category,
  provider: 'azure',
  parentId: 'plate-1',
  position: { x: 0, y: 0, z: 0 },
  metadata: {},
});

const makeConnection = (id: string, sourceId: string, targetId: string): Connection => ({
  id,
  from: endpointId(sourceId, 'output', 'data'),
  to: endpointId(targetId, 'input', 'data'),
  metadata: {},
});

const makeExternalActor = (id: string, name = 'Internet'): ExternalActor => ({
  id,
  type: 'internet',
  name,
  position: { x: -3, y: 0, z: 5 },
});

describe('FlowDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders null when there are no connections', () => {
    const { container } = render(<FlowDiagram />);
    expect(container.innerHTML).toBe('');
  });

  it('renders topologically sorted flow chain blocks', () => {
    const blocks: LeafNode[] = [
      makeBlock('gateway-1', 'edge'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'data'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'gateway-1', 'compute-1'),
      makeConnection('c2', 'compute-1', 'database-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);

    const nodes = Array.from(container.querySelectorAll('.flow-node')).map((node) => node.textContent?.trim());
    expect(nodes).toEqual(['⚖️gateway-1-name', '🖥️compute-1-name', '🗄️database-1-name']);
  });

  it('renders external actor node (Internet)', () => {
    const blocks: LeafNode[] = [makeBlock('gateway-1', 'edge')];
    const externalActors: ExternalActor[] = [makeExternalActor('internet-1')];
    const connections: Connection[] = [makeConnection('c1', 'internet-1', 'gateway-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, externalActors, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<FlowDiagram />);
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText('☁')).toBeInTheDocument();
  });

  it('renders external actor node with custom actor name', () => {
    const blocks: LeafNode[] = [makeBlock('gateway-1', 'edge')];
    const externalActors: ExternalActor[] = [makeExternalActor('external-1', 'Partner API')];
    const connections: Connection[] = [makeConnection('c1', 'external-1', 'gateway-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, externalActors, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<FlowDiagram />);
    expect(screen.getByText('Partner API')).toBeInTheDocument();
  });

  it('falls back to default external actor label when actor name is empty', () => {
    const blocks: LeafNode[] = [makeBlock('gateway-1', 'edge')];
    const externalActors: ExternalActor[] = [makeExternalActor('external-2', '')];
    const connections: Connection[] = [makeConnection('c1', 'external-2', 'gateway-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, externalActors, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<FlowDiagram />);
    expect(screen.getByText('External Actor')).toBeInTheDocument();
  });

  it('renders arrows between nodes', () => {
    const blocks: LeafNode[] = [
      makeBlock('gateway-1', 'edge'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'data'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'gateway-1', 'compute-1'),
      makeConnection('c2', 'compute-1', 'database-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    expect(container.querySelectorAll('.flow-arrow')).toHaveLength(2);
  });

  it('skips unknown node ids referenced by connections', () => {
    const blocks: LeafNode[] = [makeBlock('compute-1', 'compute')];
    const connections: Connection[] = [makeConnection('c1', 'ghost-1', 'compute-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    const nodes = container.querySelectorAll('.flow-node');

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveTextContent('compute-1-name');
    expect(screen.queryByText('ghost-1')).not.toBeInTheDocument();
  });

  it('uses fallback color, icon, and label for unknown block category values', () => {
    const weirdBlock: LeafNode = {
      id: 'weird-1',
      name: 'weird-name',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'unknown' as unknown as ResourceCategory,
      provider: 'azure',
      parentId: 'plate-1',
      position: { x: 0, y: 0, z: 0 },
      metadata: {},
    };
    const knownBlock = makeBlock('compute-1', 'compute');

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: {
          ...baseArchitecture,
          nodes: [weirdBlock, knownBlock],
          connections: [makeConnection('c-fallback', 'weird-1', 'compute-1')],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);

    expect(screen.getByText('■')).toBeInTheDocument();
    const node = container.querySelector('.flow-node') as HTMLElement;
    expect(node).toHaveTextContent('weird-name');
    expect(node).toHaveStyle({ backgroundColor: 'rgb(0, 120, 212)' });
  });

  it('falls back to raw category label when block name and friendly name are unavailable', () => {
    const unnamedUnknownBlock: LeafNode = {
      ...makeBlock('unknown-1', 'compute'),
      name: '',
      provider: undefined,
      category: 'mystery' as unknown as ResourceCategory,
    };
    const knownBlock = makeBlock('compute-1', 'compute');

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: {
          ...baseArchitecture,
          externalActors: undefined as unknown as ExternalActor[],
          nodes: [unnamedUnknownBlock, knownBlock],
          connections: [makeConnection('c-fallback-name', 'unknown-1', 'compute-1')],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<FlowDiagram />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  it('handles converging dependencies in Kahn sorting order', () => {
    const blocks: LeafNode[] = [
      makeBlock('gateway-1', 'edge'),
      makeBlock('storage-1', 'data'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'data'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'gateway-1', 'compute-1'),
      makeConnection('c2', 'storage-1', 'compute-1'),
      makeConnection('c3', 'compute-1', 'database-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    const nodes = Array.from(container.querySelectorAll('.flow-node')).map((node) => node.textContent?.trim());

    expect(nodes).toContain('🖥️compute-1-name');
    expect(nodes.indexOf('🖥️compute-1-name')).toBeGreaterThan(nodes.indexOf('⚖️gateway-1-name'));
    expect(nodes.indexOf('🖥️compute-1-name')).toBeGreaterThan(nodes.indexOf('📦storage-1-name'));
    expect(nodes.indexOf('🗄️database-1-name')).toBeGreaterThan(nodes.indexOf('🖥️compute-1-name'));
  });

  it('renders flow diagram with cyclic connections (function <-> queue)', () => {
    const blocks: LeafNode[] = [
      makeBlock('function-1', 'compute'),
      makeBlock('queue-1', 'messaging'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'function-1', 'queue-1'),
      makeConnection('c2', 'queue-1', 'function-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, nodes: blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);

    // Both nodes should be present despite forming a cycle
    const nodes = Array.from(container.querySelectorAll('.flow-node')).map((node) => node.textContent?.trim());
    expect(nodes).toHaveLength(2);
    expect(nodes).toContain('🖥️function-1-name');
    expect(nodes).toContain('📨queue-1-name');
  });
});
