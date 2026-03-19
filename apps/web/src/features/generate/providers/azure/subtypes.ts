import type { BlockCategory } from '../../../../shared/types/index';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<BlockCategory, Record<string, SubtypeEntry>>>;

export const azureSubtypeRegistry: SubtypeRegistry = {
  compute: {
    vm: {
      displayName: 'Virtual Machine',
      description: 'IaaS virtual machine',
      defaultConfig: { vmSize: 'Standard_B2s' },
    },
    'container-instances': {
      displayName: 'Container Instances',
      description: 'Serverless container service',
      defaultConfig: { osType: 'Linux', cpu: 1, memoryInGb: 1.5 },
    },
    functions: {
      displayName: 'Azure Functions',
      description: 'Event-driven serverless compute',
      defaultConfig: { runtime: 'node', runtimeVersion: '~20' },
    },
  },
  database: {
    'sql-database': {
      displayName: 'SQL Database',
      description: 'Managed SQL database',
      defaultConfig: { sku: 'Basic' },
    },
    'cosmos-db': {
      displayName: 'Cosmos DB',
      description: 'Globally distributed NoSQL database',
      defaultConfig: { kind: 'GlobalDocumentDB', consistencyLevel: 'Session' },
    },
  },
  storage: {
    'blob-storage': {
      displayName: 'Blob Storage',
      description: 'Object storage for unstructured data',
    },
  },
  gateway: {
    'application-gateway': {
      displayName: 'Application Gateway',
      description: 'Web traffic load balancer',
    },
    'api-management': {
      displayName: 'API Management',
      description: 'Managed API gateway',
    },
  },
};
