import type { ArchitectureModel, ResourceBlock } from '@cloudblocks/schema';
import { endpointId, generateEndpointsForBlock } from '@cloudblocks/schema';
import { spikeFixture } from './fixture';

const additionalNodes: ResourceBlock[] = [
  {
    id: 'app-b',
    name: 'Worker App',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'app_service',
    category: 'compute',
    provider: 'azure',
    parentId: null,
    position: { x: -21, y: 0, z: 10 },
    metadata: {},
  },
  {
    id: 'function-b',
    name: 'Job Functions',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'function_compute',
    category: 'compute',
    provider: 'azure',
    parentId: null,
    position: { x: -28, y: 0, z: 10 },
    metadata: {},
  },
  {
    id: 'cache',
    name: 'Cache Store',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'cache_store',
    category: 'data',
    provider: 'azure',
    parentId: null,
    position: { x: 29, y: 0, z: -5 },
    metadata: {},
  },
  {
    id: 'sql-b',
    name: 'Read Replica',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'sql_database',
    category: 'data',
    provider: 'azure',
    parentId: null,
    position: { x: 29, y: 0, z: 3 },
    metadata: {},
  },
];

const extraLinks: { id: string; from: string; to: string; semantic: 'http' | 'data' }[] = [
  { id: 'gateway-app-b', from: 'gateway', to: 'app-b', semantic: 'http' },
  { id: 'gateway-function-b', from: 'gateway', to: 'function-b', semantic: 'http' },
  { id: 'app-cache', from: 'app', to: 'cache', semantic: 'data' },
  { id: 'app-sql-b', from: 'app', to: 'sql-b', semantic: 'data' },
  { id: 'app-b-sql', from: 'app-b', to: 'sql', semantic: 'data' },
  { id: 'app-b-vault', from: 'app-b', to: 'vault', semantic: 'data' },
  { id: 'function-b-cache', from: 'function-b', to: 'cache', semantic: 'data' },
  { id: 'function-b-sql-b', from: 'function-b', to: 'sql-b', semantic: 'data' },
];

export const denseFixture: ArchitectureModel = {
  ...spikeFixture,
  id: 'renderer-spike-dense-web-api',
  name: 'Dense Web API / Layer Study',
  nodes: [...spikeFixture.nodes, ...additionalNodes],
  endpoints: [
    ...spikeFixture.endpoints,
    ...additionalNodes.flatMap((node) => generateEndpointsForBlock(node.id)),
  ],
  connections: [
    ...spikeFixture.connections,
    ...extraLinks.map(({ id, from, to, semantic }) => ({
      id,
      from: endpointId(from, 'output', semantic),
      to: endpointId(to, 'input', semantic),
      metadata: {},
    })),
  ],
};
