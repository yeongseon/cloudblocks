import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowDiagram } from './FlowDiagram';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureModel, Block, Connection, ExternalActor } from '../../shared/types/index';

vi.mock('./FlowDiagram.css', () => ({}));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Flow Test',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const makeBlock = (id: string, category: Block['category']): Block => ({
  id,
  name: `${id}-name`,
  category,
  placementId: 'plate-1',
  position: { x: 0, y: 0, z: 0 },
  metadata: {},
});

const makeConnection = (id: string, sourceId: string, targetId: string): Connection => ({
  id,
  sourceId,
  targetId,
  type: 'dataflow',
  metadata: {},
});

const makeExternalActor = (id: string): ExternalActor => ({
  id,
  type: 'internet',
  name: 'Internet',
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
    const blocks: Block[] = [
      makeBlock('gateway-1', 'gateway'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'database'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'gateway-1', 'compute-1'),
      makeConnection('c2', 'compute-1', 'database-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);

    const nodes = Array.from(container.querySelectorAll('.flow-node')).map((node) => node.textContent?.trim());
    expect(nodes).toEqual(['🛡️App Gateway', '🖥️Virtual Machine', '🗄️SQL Database']);
  });

  it('renders external actor node (Internet)', () => {
    const blocks: Block[] = [makeBlock('gateway-1', 'gateway')];
    const externalActors: ExternalActor[] = [makeExternalActor('internet-1')];
    const connections: Connection[] = [makeConnection('c1', 'internet-1', 'gateway-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, blocks, externalActors, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<FlowDiagram />);
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText('☁')).toBeInTheDocument();
  });

  it('renders arrows between nodes', () => {
    const blocks: Block[] = [
      makeBlock('gateway-1', 'gateway'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'database'),
    ];
    const connections: Connection[] = [
      makeConnection('c1', 'gateway-1', 'compute-1'),
      makeConnection('c2', 'compute-1', 'database-1'),
    ];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    expect(container.querySelectorAll('.flow-arrow')).toHaveLength(2);
  });

  it('skips unknown node ids referenced by connections', () => {
    const blocks: Block[] = [makeBlock('compute-1', 'compute')];
    const connections: Connection[] = [makeConnection('c1', 'ghost-1', 'compute-1')];

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Flow WS',
        architecture: { ...baseArchitecture, blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    const nodes = container.querySelectorAll('.flow-node');

    expect(nodes).toHaveLength(1);
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
    expect(screen.queryByText('ghost-1')).not.toBeInTheDocument();
  });

  it('uses fallback color, icon, and label for unknown block category values', () => {
    const weirdBlock: Block = {
      id: 'weird-1',
      name: 'weird-name',
      category: 'unknown' as Block['category'],
      placementId: 'plate-1',
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
          blocks: [weirdBlock, knownBlock],
          connections: [makeConnection('c-fallback', 'weird-1', 'compute-1')],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);

    expect(screen.getByText('■')).toBeInTheDocument();
    const node = container.querySelector('.flow-node') as HTMLElement;
    expect(node).toHaveTextContent('unknown');
    expect(node).toHaveStyle({ backgroundColor: 'rgb(96, 125, 139)' });
  });

  it('handles converging dependencies in Kahn sorting order', () => {
    const blocks: Block[] = [
      makeBlock('gateway-1', 'gateway'),
      makeBlock('storage-1', 'storage'),
      makeBlock('compute-1', 'compute'),
      makeBlock('database-1', 'database'),
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
        architecture: { ...baseArchitecture, blocks, connections },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<FlowDiagram />);
    const nodes = Array.from(container.querySelectorAll('.flow-node')).map((node) => node.textContent?.trim());

    expect(nodes).toContain('🖥️Virtual Machine');
    expect(nodes.indexOf('🖥️Virtual Machine')).toBeGreaterThan(nodes.indexOf('🛡️App Gateway'));
    expect(nodes.indexOf('🖥️Virtual Machine')).toBeGreaterThan(nodes.indexOf('📦Blob Storage'));
    expect(nodes.indexOf('🗄️SQL Database')).toBeGreaterThan(nodes.indexOf('🖥️Virtual Machine'));
  });
});
