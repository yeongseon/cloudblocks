import type { ArchitectureTemplate } from '../../shared/types/template';
import { registerTemplate } from './registry';

/**
 * Built-in Templates (v0.4)
 * Based on docs/engine/templates.md
 *
 * Uses only v0.1 block types: compute, database, storage, gateway.
 * Serverless (FunctionBlock) and event-driven (QueueBlock) templates
 * require v1.0 types and are deferred.
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

/**
 * Initialize all built-in templates.
 * Call this once at app startup.
 */
export function registerBuiltinTemplates(): void {
  registerTemplate(threeTierTemplate);
  registerTemplate(simpleComputeTemplate);
  registerTemplate(dataStorageTemplate);
}
