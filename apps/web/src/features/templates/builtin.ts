import type { ArchitectureTemplate } from '../../shared/types/template';
import { registerTemplate } from './registry';

/**
 * Built-in Templates (v0.4 + v1.0)
 * Based on docs/engine/templates.md
 *
 * v0.4 templates use compute, database, storage, gateway blocks.
 * v1.0 templates add serverless blocks: function, queue, event, timer.
 */

const threeTierTemplate: ArchitectureTemplate = {
  id: 'template-three-tier',
  name: 'Three-Tier Web Application',
  description:
    'Classic three-tier architecture with gateway, compute, database, and storage. ' +
    'Internet traffic enters through the Application Gateway in the public subnet, ' +
    'routes to a Compute instance, which connects to a Database and Storage in the private subnet.',
  category: 'web-application',
  difficulty: 'beginner',
  tags: ['three-tier', 'web', 'gateway', 'database', 'beginner'],
  architecture: {
    name: 'Three-Tier Web App',
    version: '1',
    plates: [
      {
        id: 'plate-tmpl-vnet',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-tmpl-public', 'plate-tmpl-private'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-public',
        name: 'Public Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-tmpl-vnet',
        children: ['block-tmpl-gw', 'block-tmpl-compute'],
        position: { x: -3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-private',
        name: 'Private Subnet',
        type: 'subnet',
        subnetAccess: 'private',
        parentId: 'plate-tmpl-vnet',
        children: ['block-tmpl-db', 'block-tmpl-storage'],
        position: { x: 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-tmpl-gw',
        name: 'App Gateway',
        category: 'gateway',
        placementId: 'plate-tmpl-public',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-compute',
        name: 'Web App',
        category: 'compute',
        placementId: 'plate-tmpl-public',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-db',
        name: 'PostgreSQL',
        category: 'database',
        placementId: 'plate-tmpl-private',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-storage',
        name: 'Blob Storage',
        category: 'storage',
        placementId: 'plate-tmpl-private',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-tmpl-inet-gw',
        sourceId: 'ext-internet',
        targetId: 'block-tmpl-gw',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-gw-compute',
        sourceId: 'block-tmpl-gw',
        targetId: 'block-tmpl-compute',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-compute-db',
        sourceId: 'block-tmpl-compute',
        targetId: 'block-tmpl-db',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-compute-storage',
        sourceId: 'block-tmpl-compute',
        targetId: 'block-tmpl-storage',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
  },
};

const simpleComputeTemplate: ArchitectureTemplate = {
  id: 'template-simple-compute',
  name: 'Simple Compute Setup',
  description:
    'Minimal architecture with a single compute instance in a public subnet. ' +
    'Good starting point for simple web services or APIs.',
  category: 'web-application',
  difficulty: 'beginner',
  tags: ['simple', 'compute', 'minimal', 'beginner'],
  architecture: {
    name: 'Simple Compute',
    version: '1',
    plates: [
      {
        id: 'plate-tmpl-vnet2',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-tmpl-pub2'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-pub2',
        name: 'Public Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-tmpl-vnet2',
        children: ['block-tmpl-gw2', 'block-tmpl-app2'],
        position: { x: 0, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-tmpl-gw2',
        name: 'Gateway',
        category: 'gateway',
        placementId: 'plate-tmpl-pub2',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-app2',
        name: 'App Service',
        category: 'compute',
        placementId: 'plate-tmpl-pub2',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-tmpl-inet-gw2',
        sourceId: 'ext-internet',
        targetId: 'block-tmpl-gw2',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-gw-app2',
        sourceId: 'block-tmpl-gw2',
        targetId: 'block-tmpl-app2',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
  },
};

const dataStorageTemplate: ArchitectureTemplate = {
  id: 'template-data-storage',
  name: 'Data Storage Backend',
  description:
    'Backend architecture focused on data storage. Compute connects to both a database ' +
    'and blob storage in a private subnet for secure data handling.',
  category: 'data-pipeline',
  difficulty: 'intermediate',
  tags: ['data', 'storage', 'database', 'private', 'intermediate'],
  architecture: {
    name: 'Data Storage Backend',
    version: '1',
    plates: [
      {
        id: 'plate-tmpl-vnet3',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-tmpl-pub3', 'plate-tmpl-priv3'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-pub3',
        name: 'App Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-tmpl-vnet3',
        children: ['block-tmpl-gw3', 'block-tmpl-api3'],
        position: { x: -3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-priv3',
        name: 'Data Subnet',
        type: 'subnet',
        subnetAccess: 'private',
        parentId: 'plate-tmpl-vnet3',
        children: ['block-tmpl-db3', 'block-tmpl-blob3'],
        position: { x: 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-tmpl-gw3',
        name: 'API Gateway',
        category: 'gateway',
        placementId: 'plate-tmpl-pub3',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-api3',
        name: 'API Server',
        category: 'compute',
        placementId: 'plate-tmpl-pub3',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-db3',
        name: 'Database',
        category: 'database',
        placementId: 'plate-tmpl-priv3',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-blob3',
        name: 'File Storage',
        category: 'storage',
        placementId: 'plate-tmpl-priv3',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-tmpl-inet-gw3',
        sourceId: 'ext-internet',
        targetId: 'block-tmpl-gw3',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-gw-api3',
        sourceId: 'block-tmpl-gw3',
        targetId: 'block-tmpl-api3',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-api-db3',
        sourceId: 'block-tmpl-api3',
        targetId: 'block-tmpl-db3',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-api-blob3',
        sourceId: 'block-tmpl-api3',
        targetId: 'block-tmpl-blob3',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
  },
};

// ─── v1.0 Serverless Templates ──────────────────────────────

const serverlessHttpApiTemplate: ArchitectureTemplate = {
  id: 'template-serverless-http-api',
  name: 'Serverless HTTP API',
  description:
    'Serverless architecture for HTTP APIs. Internet traffic enters via Gateway, ' +
    'triggers a Function, which reads/writes to Storage and Database. ' +
    'No VMs — fully managed serverless compute.',
  category: 'serverless',
  difficulty: 'intermediate',
  tags: ['serverless', 'function', 'http', 'api', 'gateway'],
  generatorCompat: ['terraform', 'bicep', 'pulumi'],
  architecture: {
    name: 'Serverless HTTP API',
    version: '1',
    plates: [
      {
        id: 'plate-tmpl-vnet4',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-tmpl-pub4', 'plate-tmpl-priv4'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-pub4',
        name: 'Public Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-tmpl-vnet4',
        children: ['block-tmpl-gw4'],
        position: { x: -3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-priv4',
        name: 'Private Subnet',
        type: 'subnet',
        subnetAccess: 'private',
        parentId: 'plate-tmpl-vnet4',
        children: ['block-tmpl-db4', 'block-tmpl-storage4'],
        position: { x: 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-tmpl-gw4',
        name: 'API Gateway',
        category: 'gateway',
        placementId: 'plate-tmpl-pub4',
        position: { x: 0, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-func4',
        name: 'HTTP Handler',
        category: 'function',
        placementId: 'plate-tmpl-vnet4',
        position: { x: 0, y: 0.5, z: 1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-storage4',
        name: 'Blob Storage',
        category: 'storage',
        placementId: 'plate-tmpl-priv4',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-tmpl-db4',
        name: 'CosmosDB',
        category: 'database',
        placementId: 'plate-tmpl-priv4',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-tmpl-inet-gw4',
        sourceId: 'ext-internet',
        targetId: 'block-tmpl-gw4',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-gw-func4',
        sourceId: 'block-tmpl-gw4',
        targetId: 'block-tmpl-func4',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-func-storage4',
        sourceId: 'block-tmpl-func4',
        targetId: 'block-tmpl-storage4',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-func-db4',
        sourceId: 'block-tmpl-func4',
        targetId: 'block-tmpl-db4',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
  },
};

const eventDrivenPipelineTemplate: ArchitectureTemplate = {
  id: 'template-event-driven-pipeline',
  name: 'Event-Driven Pipeline',
  description:
    'Event-driven data processing pipeline. Events trigger a processing function ' +
    'that reads from a queue and writes results to storage. Timer triggers periodic batch jobs.',
  category: 'data-pipeline',
  difficulty: 'advanced',
  tags: ['event-driven', 'queue', 'function', 'timer', 'pipeline'],
  generatorCompat: ['terraform', 'bicep', 'pulumi'],
  architecture: {
    name: 'Event-Driven Pipeline',
    version: '1',
    plates: [
      {
        id: 'plate-tmpl-vnet5',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-tmpl-priv5'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-tmpl-priv5',
        name: 'Private Subnet',
        type: 'subnet',
        subnetAccess: 'private',
        parentId: 'plate-tmpl-vnet5',
        children: ['block-tmpl-storage5'],
        position: { x: 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      {
        id: 'block-tmpl-event5',
        name: 'Event Source',
        category: 'event',
        placementId: 'plate-tmpl-vnet5',
        position: { x: -2, y: 0.5, z: -2 },
        metadata: {},
      },
      {
        id: 'block-tmpl-queue5',
        name: 'Message Queue',
        category: 'queue',
        placementId: 'plate-tmpl-vnet5',
        position: { x: -2, y: 0.5, z: 1 },
        metadata: {},
      },
      {
        id: 'block-tmpl-timer5',
        name: 'Batch Timer',
        category: 'timer',
        placementId: 'plate-tmpl-vnet5',
        position: { x: 0, y: 0.5, z: -2 },
        metadata: {},
      },
      {
        id: 'block-tmpl-func5a',
        name: 'Event Processor',
        category: 'function',
        placementId: 'plate-tmpl-vnet5',
        position: { x: 0, y: 0.5, z: 1 },
        metadata: {},
      },
      {
        id: 'block-tmpl-func5b',
        name: 'Batch Processor',
        category: 'function',
        placementId: 'plate-tmpl-vnet5',
        position: { x: 2, y: 0.5, z: -2 },
        metadata: {},
      },
      {
        id: 'block-tmpl-storage5',
        name: 'Data Lake',
        category: 'storage',
        placementId: 'plate-tmpl-priv5',
        position: { x: 0, y: 0.5, z: -1.5 },
        metadata: {},
      },
    ],
    connections: [
      {
        id: 'conn-tmpl-event-func5a',
        sourceId: 'block-tmpl-event5',
        targetId: 'block-tmpl-func5a',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-queue-func5a',
        sourceId: 'block-tmpl-queue5',
        targetId: 'block-tmpl-func5a',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-func5a-storage',
        sourceId: 'block-tmpl-func5a',
        targetId: 'block-tmpl-storage5',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-func5a-queue',
        sourceId: 'block-tmpl-func5a',
        targetId: 'block-tmpl-queue5',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-timer-func5b',
        sourceId: 'block-tmpl-timer5',
        targetId: 'block-tmpl-func5b',
        type: 'dataflow',
        metadata: {},
      },
      {
        id: 'conn-tmpl-func5b-storage',
        sourceId: 'block-tmpl-func5b',
        targetId: 'block-tmpl-storage5',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [],
  },
};

const fullStackServerlessTemplate: ArchitectureTemplate = {
  id: 'template-full-stack-serverless',
  name: 'Full-Stack Serverless with Event Processing',
  description:
    'Maximum-complexity architecture using all block types. Internet traffic enters via Gateway ' +
    'to a Compute frontend and serverless API Function. Events, Queues, and Timers drive ' +
    'background processing Functions. Data flows to Database and Storage in the private subnet. ' +
    'Tests all 8 block categories, both subnet types, and 11 connections.',
  category: 'serverless',
  difficulty: 'advanced',
  tags: [
    'full-stack', 'serverless', 'event-driven', 'queue', 'timer',
    'function', 'compute', 'gateway', 'database', 'storage', 'advanced',
  ],
  generatorCompat: ['terraform', 'bicep', 'pulumi'],
  architecture: {
    name: 'Full-Stack Serverless',
    version: '1',
    plates: [
      {
        id: 'plate-fs-vnet',
        name: 'VNet',
        type: 'network',
        parentId: null,
        children: ['plate-fs-public', 'plate-fs-private'],
        position: { x: 0, y: 0, z: 0 },
        size: { width: 12, height: 0.3, depth: 10 },
        metadata: {},
      },
      {
        id: 'plate-fs-public',
        name: 'Public Subnet',
        type: 'subnet',
        subnetAccess: 'public',
        parentId: 'plate-fs-vnet',
        children: ['block-fs-gw', 'block-fs-web'],
        position: { x: -3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
      {
        id: 'plate-fs-private',
        name: 'Private Subnet',
        type: 'subnet',
        subnetAccess: 'private',
        parentId: 'plate-fs-vnet',
        children: ['block-fs-db', 'block-fs-storage'],
        position: { x: 3, y: 0.3, z: 0 },
        size: { width: 5, height: 0.2, depth: 8 },
        metadata: {},
      },
    ],
    blocks: [
      // Public Subnet
      {
        id: 'block-fs-gw',
        name: 'API Gateway',
        category: 'gateway',
        placementId: 'plate-fs-public',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-fs-web',
        name: 'Web Frontend',
        category: 'compute',
        placementId: 'plate-fs-public',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      // Private Subnet
      {
        id: 'block-fs-db',
        name: 'PostgreSQL',
        category: 'database',
        placementId: 'plate-fs-private',
        position: { x: -0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      {
        id: 'block-fs-storage',
        name: 'Blob Storage',
        category: 'storage',
        placementId: 'plate-fs-private',
        position: { x: 0.75, y: 0.5, z: -1.5 },
        metadata: {},
      },
      // Serverless (Network Plate)
      {
        id: 'block-fs-api',
        name: 'API Handler',
        category: 'function',
        placementId: 'plate-fs-vnet',
        position: { x: -2, y: 0.5, z: 2 },
        metadata: {},
      },
      {
        id: 'block-fs-worker',
        name: 'Queue Worker',
        category: 'function',
        placementId: 'plate-fs-vnet',
        position: { x: 0, y: 0.5, z: 2 },
        metadata: {},
      },
      {
        id: 'block-fs-batch',
        name: 'Batch Processor',
        category: 'function',
        placementId: 'plate-fs-vnet',
        position: { x: 2, y: 0.5, z: 2 },
        metadata: {},
      },
      {
        id: 'block-fs-queue',
        name: 'Message Queue',
        category: 'queue',
        placementId: 'plate-fs-vnet',
        position: { x: -1, y: 0.5, z: -2 },
        metadata: {},
      },
      {
        id: 'block-fs-event',
        name: 'Event Source',
        category: 'event',
        placementId: 'plate-fs-vnet',
        position: { x: 1, y: 0.5, z: -2 },
        metadata: {},
      },
      {
        id: 'block-fs-timer',
        name: 'Cron Timer',
        category: 'timer',
        placementId: 'plate-fs-vnet',
        position: { x: 3, y: 0.5, z: -2 },
        metadata: {},
      },
    ],
    connections: [
      // Internet → Gateway
      {
        id: 'conn-fs-inet-gw',
        sourceId: 'ext-internet',
        targetId: 'block-fs-gw',
        type: 'dataflow',
        metadata: {},
      },
      // Gateway → Compute (web frontend)
      {
        id: 'conn-fs-gw-web',
        sourceId: 'block-fs-gw',
        targetId: 'block-fs-web',
        type: 'dataflow',
        metadata: {},
      },
      // Gateway → Function (API handler)
      {
        id: 'conn-fs-gw-api',
        sourceId: 'block-fs-gw',
        targetId: 'block-fs-api',
        type: 'dataflow',
        metadata: {},
      },
      // Compute → Database
      {
        id: 'conn-fs-web-db',
        sourceId: 'block-fs-web',
        targetId: 'block-fs-db',
        type: 'dataflow',
        metadata: {},
      },
      // Compute → Storage
      {
        id: 'conn-fs-web-storage',
        sourceId: 'block-fs-web',
        targetId: 'block-fs-storage',
        type: 'dataflow',
        metadata: {},
      },
      // Function (API) → Database
      {
        id: 'conn-fs-api-db',
        sourceId: 'block-fs-api',
        targetId: 'block-fs-db',
        type: 'dataflow',
        metadata: {},
      },
      // Function (API) → Queue
      {
        id: 'conn-fs-api-queue',
        sourceId: 'block-fs-api',
        targetId: 'block-fs-queue',
        type: 'dataflow',
        metadata: {},
      },
      // Queue → Function (worker)
      {
        id: 'conn-fs-queue-worker',
        sourceId: 'block-fs-queue',
        targetId: 'block-fs-worker',
        type: 'dataflow',
        metadata: {},
      },
      // Event → Function (batch processor)
      {
        id: 'conn-fs-event-batch',
        sourceId: 'block-fs-event',
        targetId: 'block-fs-batch',
        type: 'dataflow',
        metadata: {},
      },
      // Timer → Function (batch processor)
      {
        id: 'conn-fs-timer-batch',
        sourceId: 'block-fs-timer',
        targetId: 'block-fs-batch',
        type: 'dataflow',
        metadata: {},
      },
      // Function (worker) → Storage
      {
        id: 'conn-fs-worker-storage',
        sourceId: 'block-fs-worker',
        targetId: 'block-fs-storage',
        type: 'dataflow',
        metadata: {},
      },
    ],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
  },
};

/**
 * Initialize all built-in templates.
 * Call this once at app startup.
 */
export function registerBuiltinTemplates(): void {
  registerTemplate(threeTierTemplate);
  registerTemplate(simpleComputeTemplate);
  registerTemplate(dataStorageTemplate);
  registerTemplate(serverlessHttpApiTemplate);
  registerTemplate(eventDrivenPipelineTemplate);
  registerTemplate(fullStackServerlessTemplate);
}
