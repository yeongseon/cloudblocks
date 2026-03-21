import { describe, expect, it } from 'vitest';

import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import type { ProviderName } from '../types';
import { generateCode } from '../pipeline';
import { getProvider } from '../provider';

const providerNames: ProviderName[] = ['azure', 'aws', 'gcp'];

interface AdapterShape {
  name?: unknown;
  displayName?: unknown;
  providerBlock?: unknown;
  requiredProviders?: unknown;
  blockMappings?: unknown;
  plateMappings?: unknown;
}

function assertProviderAdapterShape(adapter: AdapterShape): void {
  expect(adapter.name).toBeTruthy();
  expect(adapter.displayName).toBeTruthy();
  expect(typeof adapter.providerBlock).toBe('function');
  expect(typeof adapter.requiredProviders).toBe('function');
  expect(adapter.blockMappings).toBeDefined();
  expect(adapter.plateMappings).toBeDefined();
}

function getRequiredAdapter(name: ProviderName) {
  const adapter = getProvider(name);
  expect(adapter).toBeDefined();

  if (!adapter) {
    throw new Error(`Missing provider adapter for ${name}`);
  }

  return adapter;
}

function createContainer(overrides: Partial<ContainerNode>): ContainerNode {
  return {
    id: 'plate-1',
    name: 'Container',
    kind: 'container',
    layer: 'subnet',
    resourceType: 'subnet',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    size: { width: 8, height: 1, depth: 6 },
    metadata: {},
    ...overrides,
  };
}

function createResource(overrides: Partial<LeafNode>): LeafNode {
  return {
    id: 'block-1',
    name: 'Resource',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'sub-1',
    position: { x: 1, y: 1.2, z: 1 },
    metadata: {},
    ...overrides,
  };
}

describe('provider adapters', () => {
  it('registry includes azure, aws, and gcp adapters', () => {
    const resolved = providerNames
      .map((name) => getProvider(name)?.name)
      .filter((name): name is ProviderName => Boolean(name));

    expect(resolved.sort()).toEqual([...providerNames].sort());
  });

  it('returns a valid adapter for azure', () => {
    const adapter = getRequiredAdapter('azure');

    assertProviderAdapterShape(adapter);
    expect(adapter.name).toBe('azure');
  });

  it('returns a valid adapter for aws', () => {
    const adapter = getRequiredAdapter('aws');

    assertProviderAdapterShape(adapter);
    expect(adapter.name).toBe('aws');
  });

  it('returns a valid adapter for gcp', () => {
    const adapter = getRequiredAdapter('gcp');

    assertProviderAdapterShape(adapter);
    expect(adapter.name).toBe('gcp');
  });

  it('returns undefined for unknown providers', () => {
    expect(getProvider('oracle-cloud' as ProviderName)).toBeUndefined();
  });

  it('azure adapter generates non-empty terraform output', () => {
    const architecture: ArchitectureModel = {
      id: 'arch-adapter-1',
      name: 'Provider Adapter Terraform Test',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'Network',
          layer: 'region',
          resourceType: 'virtual_network',
          provider: 'azure',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.7, depth: 16 },
        }),
        createContainer({
          id: 'sub-1',
          name: 'Public Subnet',
          layer: 'subnet',
          resourceType: 'subnet',
          provider: 'azure',
          subnetAccess: 'public',
          parentId: 'net-1',
          position: { x: 0, y: 0.7, z: 0 },
          size: { width: 6, height: 0.5, depth: 8 },
        }),
        createResource({
          id: 'app-1',
          name: 'App Service',
          category: 'compute',
          resourceType: 'web_compute',
          provider: 'azure',
          parentId: 'sub-1',
          position: { x: 1, y: 1.2, z: 1 },
        }),
      ],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const output = generateCode(architecture, {
      provider: 'azure',
      mode: 'draft',
      projectName: 'adapter-test',
      region: 'eastus',
      generator: 'terraform',
    });

    const mainTf = output.files.find((file) => file.path === 'main.tf');

    expect(mainTf).toBeDefined();
    expect(mainTf?.content.trim().length).toBeGreaterThan(0);
    expect(mainTf?.content).toContain('provider "azurerm"');
  });

  it('aws adapter maps compute block to ecs service in terraform output', () => {
    const architecture: ArchitectureModel = {
      id: 'arch-adapter-aws-1',
      name: 'Provider Adapter AWS Terraform Test',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'Network',
          layer: 'region',
          resourceType: 'virtual_network',
          provider: 'aws',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.7, depth: 16 },
        }),
        createContainer({
          id: 'sub-1',
          name: 'Public Subnet',
          layer: 'subnet',
          resourceType: 'subnet',
          provider: 'aws',
          subnetAccess: 'public',
          parentId: 'net-1',
          position: { x: 0, y: 0.7, z: 0 },
          size: { width: 6, height: 0.5, depth: 8 },
        }),
        createResource({
          id: 'app-1',
          name: 'Compute',
          category: 'compute',
          resourceType: 'web_compute',
          provider: 'aws',
          parentId: 'sub-1',
          position: { x: 1, y: 1.2, z: 1 },
        }),
      ],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const output = generateCode(architecture, {
      provider: 'aws',
      mode: 'draft',
      projectName: 'adapter-test',
      region: 'eastus',
      generator: 'terraform',
    });

    const mainTf = output.files.find((file) => file.path === 'main.tf');

    expect(mainTf).toBeDefined();
    expect(mainTf?.content).toContain('provider "aws"');
    expect(mainTf?.content).toContain('resource "aws_ecs_service" "ecs_compute"');
  });

  it('gcp adapter maps compute and gateway blocks to documented terraform resources', () => {
    const architecture: ArchitectureModel = {
      id: 'arch-adapter-gcp-1',
      name: 'Provider Adapter GCP Terraform Test',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'Network',
          layer: 'region',
          resourceType: 'virtual_network',
          provider: 'gcp',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.7, depth: 16 },
        }),
        createContainer({
          id: 'sub-1',
          name: 'Public Subnet',
          layer: 'subnet',
          resourceType: 'subnet',
          provider: 'gcp',
          subnetAccess: 'public',
          parentId: 'net-1',
          position: { x: 0, y: 0.7, z: 0 },
          size: { width: 6, height: 0.5, depth: 8 },
        }),
        createResource({
          id: 'app-1',
          name: 'Compute',
          category: 'compute',
          resourceType: 'web_compute',
          provider: 'gcp',
          parentId: 'sub-1',
          position: { x: 1, y: 1.2, z: 1 },
        }),
        createResource({
          id: 'gw-1',
          name: 'Gateway',
          category: 'edge',
          resourceType: 'load_balancer',
          provider: 'gcp',
          parentId: 'sub-1',
          position: { x: 2, y: 1.2, z: 1 },
        }),
      ],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const output = generateCode(architecture, {
      provider: 'gcp',
      mode: 'draft',
      projectName: 'adapter-test',
      region: 'eastus',
      generator: 'terraform',
    });

    const mainTf = output.files.find((file) => file.path === 'main.tf');

    expect(mainTf).toBeDefined();
    expect(mainTf?.content).toContain('provider "google"');
    expect(mainTf?.content).toContain('resource "google_cloud_run_v2_service" "run_compute"');
    expect(mainTf?.content).toContain('resource "google_compute_backend_service" "backend_gateway"');
  });
});
