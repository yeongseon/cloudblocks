import type { BlockCategory } from '@cloudblocks/schema';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<BlockCategory, Record<string, SubtypeEntry>>>;

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
  database: {
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
  storage: {
    'cloud-storage': {
      displayName: 'Cloud Storage',
      description: 'Object storage service',
    },
  },
  gateway: {
    'cloud-load-balancing': {
      displayName: 'Cloud Load Balancing',
      description: 'Global and regional load balancing',
    },
    'api-gateway': {
      displayName: 'API Gateway',
      description: 'Managed API gateway',
    },
  },
};
