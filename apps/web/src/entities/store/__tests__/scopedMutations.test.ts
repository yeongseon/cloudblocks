import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';
import { useArchitectureStore } from '../architectureStore';

let elkLayout: () => Promise<unknown> = async () => ({ id: 'root', children: [] });

vi.mock('elkjs/lib/elk.bundled', () => ({
  default: class {
    layout = (): Promise<unknown> => elkLayout();
  },
}));

const { runAutoLayout } = await import('../../../features/layout/autoLayout');

/**
 * #1969 — destructive and async edits must only reach what they own.
 *
 * Every case below passes against the current behaviour only because of the
 * specific fix under test; each one fails on the previous implementation.
 */

function baseArchitecture(overrides: Partial<ArchitectureModel> = {}): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes: [],
    endpoints: [],
    connections: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function resourceNode(id: string, name: string) {
  return {
    id,
    name,
    kind: 'resource' as const,
    layer: 'resource' as const,
    resourceType: 'app_service',
    category: 'compute' as const,
    provider: 'azure' as const,
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  };
}

describe('#1969 removeBlock deletes by endpoint ownership', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
  });

  it('keeps the connections of a node whose id extends the deleted id', () => {
    const service = resourceNode('service', 'Service');
    const worker = resourceNode('service-worker', 'Service Worker');
    const sink = resourceNode('sink', 'Sink');

    const workerConnection = {
      id: 'conn-worker',
      from: endpointId('service-worker', 'output', 'data'),
      to: endpointId('sink', 'input', 'data'),
      metadata: {},
    };
    const serviceConnection = {
      id: 'conn-service',
      from: endpointId('service', 'output', 'http'),
      to: endpointId('sink', 'input', 'http'),
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: baseArchitecture({
          nodes: [service, worker, sink],
          endpoints: [service, worker, sink].flatMap((node) => generateEndpointsForBlock(node.id)),
          connections: [workerConnection, serviceConnection],
        }),
      },
    });

    useArchitectureStore.getState().removeBlock('service');

    const { connections, nodes } = useArchitectureStore.getState().workspace.architecture;

    expect(nodes.map((node) => node.id)).toEqual(['service-worker', 'sink']);
    expect(connections.map((connection) => connection.id)).toEqual(['conn-worker']);
  });

  it('still removes the deleted block own connections', () => {
    const source = resourceNode('source', 'Source');
    const target = resourceNode('target', 'Target');

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: baseArchitecture({
          nodes: [source, target],
          endpoints: [source, target].flatMap((node) => generateEndpointsForBlock(node.id)),
          connections: [
            {
              id: 'conn-1',
              from: endpointId('source', 'output', 'data'),
              to: endpointId('target', 'input', 'data'),
              metadata: {},
            },
          ],
        }),
      },
    });

    useArchitectureStore.getState().removeBlock('source');

    const { connections, endpoints } = useArchitectureStore.getState().workspace.architecture;
    expect(connections).toEqual([]);
    expect(endpoints.some((endpoint) => endpoint.blockId === 'source')).toBe(false);
  });

  it('drops the deprecated externalActors entry so a deleted actor cannot return', () => {
    const browser = {
      ...resourceNode('ext-browser', 'Client'),
      resourceType: 'browser',
      category: 'delivery' as const,
      roles: ['external' as const],
    };

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: baseArchitecture({
          nodes: [browser],
          endpoints: generateEndpointsForBlock('ext-browser'),
          externalActors: [
            { id: 'ext-browser', name: 'Client', type: 'browser', position: { x: 0, y: 0, z: 0 } },
            {
              id: 'ext-internet',
              name: 'Internet',
              type: 'internet',
              position: { x: 4, y: 0, z: 0 },
            },
          ],
        }),
      },
    });

    useArchitectureStore.getState().removeBlock('ext-browser');

    const { externalActors, nodes } = useArchitectureStore.getState().workspace.architecture;
    expect(nodes).toEqual([]);
    expect(externalActors?.map((actor) => actor.id)).toEqual(['ext-internet']);
  });
});

describe('#1969 auto layout is scoped to the workspace it was started from', () => {
  beforeEach(() => {
    elkLayout = async () => ({ id: 'root', children: [] });
    useArchitectureStore.getState().resetWorkspace();
  });

  function seed(workspaceId: string, architecture: ArchitectureModel) {
    useArchitectureStore.setState({
      workspace: { ...useArchitectureStore.getState().workspace, id: workspaceId, architecture },
    });
  }

  it('discards a layout whose originating workspace is no longer active', async () => {
    const node = resourceNode('block-shared', 'Shared');
    seed(
      'ws-a',
      baseArchitecture({
        nodes: [node],
        endpoints: generateEndpointsForBlock('block-shared'),
      }),
    );

    // A clone keeps node ids, so the patch would otherwise apply cleanly here.
    const clonedArchitecture = baseArchitecture({
      nodes: [{ ...node, position: { x: 9, y: 0, z: 9 } }],
      endpoints: generateEndpointsForBlock('block-shared'),
    });

    elkLayout = async () => {
      seed('ws-b', clonedArchitecture);
      return { id: 'root', children: [{ id: 'block-shared', x: 40, y: 40, width: 2, height: 2 }] };
    };

    expect(await runAutoLayout()).toBe(false);

    const current = useArchitectureStore.getState().workspace;
    expect(current.id).toBe('ws-b');
    expect(current.architecture.nodes[0].position).toEqual({ x: 9, y: 0, z: 9 });
  });

  it('discards a layout when the architecture changed while ELK was running', async () => {
    const architecture = baseArchitecture({
      nodes: [resourceNode('block-1', 'One')],
      endpoints: generateEndpointsForBlock('block-1'),
    });
    seed('ws-a', architecture);

    elkLayout = async () => {
      seed('ws-a', { ...architecture, updatedAt: '2026-02-02T00:00:00.000Z' });
      return { id: 'root', children: [{ id: 'block-1', x: 40, y: 40, width: 2, height: 2 }] };
    };

    expect(await runAutoLayout()).toBe(false);
    expect(useArchitectureStore.getState().workspace.architecture.nodes[0].position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });

  it('applies a layout that finished on the workspace it started from', async () => {
    seed(
      'ws-a',
      baseArchitecture({
        nodes: [resourceNode('block-1', 'One')],
        endpoints: generateEndpointsForBlock('block-1'),
      }),
    );

    elkLayout = async () => ({
      id: 'root',
      children: [{ id: 'block-1', x: 40, y: 40, width: 2, height: 2 }],
    });

    expect(await runAutoLayout()).toBe(true);
    expect(useArchitectureStore.getState().workspace.architecture.nodes[0].position).not.toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });
});
