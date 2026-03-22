import type { ResourceCategory } from '@cloudblocks/schema';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<ResourceCategory, Record<string, SubtypeEntry>>>;

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
  data: {
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
  edge: {
    'application-gateway': {
      displayName: 'Application Gateway',
      description: 'Web traffic load balancer',
    },
    'api-management': {
      displayName: 'API Management',
      description: 'Managed API gateway',
    },
    'nat-gateway': {
      displayName: 'NAT Gateway',
      description: 'Managed outbound internet access for private subnets',
    },
  },
  messaging: {
    'service-bus': {
      displayName: 'Service Bus',
      description: 'Managed message queue service',
    },
    'event-grid': {
      displayName: 'Event Grid',
      description: 'Managed event routing service',
    },
  },
  security: {
    'managed-identity': {
      displayName: 'Managed Identity',
      description: 'Managed service identity for authentication',
    },
    nsg: {
      displayName: 'Network Security Group',
      description: 'Subnet-level L4 network traffic filtering',
    },
  },
  operations: {
    'log-analytics': {
      displayName: 'Log Analytics',
      description: 'Centralized log and query workspace',
    },
    monitor: {
      displayName: 'Azure Monitor',
      description: 'Metrics and monitoring workspace',
    },
  },
  network: {
    'public-ip': {
      displayName: 'Public IP',
      description: 'Static or dynamic public IP address',
    },
    'route-table': {
      displayName: 'Route Table',
      description: 'User-defined routes for subnet traffic',
    },
    'private-endpoint': {
      displayName: 'Private Endpoint',
      description: 'Private connectivity to Azure PaaS services',
    },
    'nat-gateway': {
      displayName: 'NAT Gateway',
      description: 'Managed outbound internet access for private subnets',
    },
  },
};
