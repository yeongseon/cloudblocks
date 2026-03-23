import type { ResourceCategory } from '@cloudblocks/schema';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<ResourceCategory, Record<string, SubtypeEntry>>>;

export const gcpSubtypeRegistry: SubtypeRegistry = {
  compute: {
    'compute-engine': {
      displayName: 'Compute Engine',
      description: 'Virtual machine instance',
      defaultConfig: { machineType: 'e2-medium' },
    },
    'cloud-run': {
      displayName: 'Cloud Run',
      description: 'Serverless container platform',
      defaultConfig: { maxInstances: 10 },
    },
    'cloud-functions': {
      displayName: 'Cloud Functions',
      description: 'Event-driven serverless functions',
      defaultConfig: { runtime: 'nodejs20', availableMemoryMb: 256 },
    },
  },
  data: {
    'cloud-sql-postgres': {
      displayName: 'Cloud SQL PostgreSQL',
      description: 'Managed PostgreSQL database',
      defaultConfig: { tier: 'db-f1-micro', databaseVersion: 'POSTGRES_15' },
    },
    firestore: {
      displayName: 'Firestore',
      description: 'Serverless NoSQL document database',
      defaultConfig: { locationId: 'us-central1' },
    },
  },
  delivery: {
    'cloud-load-balancing': {
      displayName: 'Cloud Load Balancing',
      description: 'Global and regional load balancing',
    },
    'api-gateway': {
      displayName: 'API Gateway',
      description: 'Managed API gateway',
    },
    'nat-gateway': {
      displayName: 'Cloud NAT',
      description: 'Managed outbound internet access for private subnets',
    },
  },
  messaging: {
    pubsub: {
      displayName: 'Pub/Sub Topic',
      description: 'Managed asynchronous messaging topic',
    },
    eventarc: {
      displayName: 'Eventarc Trigger',
      description: 'Event routing and trigger service',
    },
  },
  security: {
    iam: {
      displayName: 'Service Account',
      description: 'Identity for workloads and services',
    },
    nsg: {
      displayName: 'Firewall Rules',
      description: 'VPC firewall rules for network traffic filtering',
    },
  },
  identity: {
    'managed-identity': {
      displayName: 'Managed Identity',
      description: 'Service account identity for workload runtime',
    },
    'service-account': {
      displayName: 'Service Account',
      description: 'Workload and automation account identity',
    },
  },
  operations: {
    bigquery: {
      displayName: 'BigQuery Dataset',
      description: 'Analytical data warehouse dataset',
    },
    monitoring: {
      displayName: 'Monitoring Dashboard',
      description: 'Operational metrics dashboard',
    },
  },
};
