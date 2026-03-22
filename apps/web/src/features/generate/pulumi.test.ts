import { describe, expect, it } from 'vitest';

import { normalizePulumi, generateIndexTs, generatePulumiYaml, pulumiPlugin } from './pulumi';
import { azureProviderDefinition } from './provider';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import type { GenerationOptions } from './types';
import {
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
  type LegacyArchitectureOverrides,
  type LegacyBlockOverrides,
  type LegacyPlateOverrides,
} from '../../__tests__/legacyModelTestUtils';

const basePosition = { x: 0, y: 0, z: 0 };
const baseSize = { width: 1, height: 1, depth: 1 };

function createPlate(overrides: LegacyPlateOverrides): ContainerNode {
  return makeTestPlate({
    id: 'plate-default',
    name: 'Default',
    type: 'region',
    parentId: null,
    position: basePosition,
    size: baseSize,
    metadata: {},
    ...overrides,
  });
}

function createBlock(overrides: LegacyBlockOverrides): LeafNode {
  return makeTestBlock({
    id: 'block-default',
    name: 'Default',
    category: 'compute',
    placementId: 'plate-default',
    position: basePosition,
    metadata: {},
    ...overrides,
  });
}

function createTestModel(overrides?: LegacyArchitectureOverrides): ArchitectureModel {
  return makeTestArchitecture({
    id: 'arch-1',
    name: 'Test',
    version: '1',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  });
}

const defaultOptions: GenerationOptions = {
  provider: 'azure',
  mode: 'draft',
  projectName: 'testproject',
  region: 'eastus',
};

describe('pulumi generator', () => {
  it('pulumiPlugin.id is pulumi', () => {
    expect(pulumiPlugin.id).toBe('pulumi');
  });

  it('pulumiPlugin.displayName is Pulumi (TypeScript)', () => {
    expect(pulumiPlugin.displayName).toBe('Pulumi (TypeScript)');
  });

  it('pulumiPlugin.supportedProviders is azure', () => {
    expect(pulumiPlugin.supportedProviders).toEqual(['azure']);
  });

  it('filePlan returns index.ts and Pulumi.yaml with expected languages', () => {
    const plan = pulumiPlugin.filePlan?.(defaultOptions) ?? [];

    expect(plan).toEqual([
      { path: 'index.ts', language: 'typescript' },
      { path: 'Pulumi.yaml', language: 'yaml' },
    ]);
  });

  it('normalizePulumi generates unique resource names', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'plate-network', name: 'VNet', type: 'region' }),
        createPlate({
          id: 'plate-subnet',
          name: 'Subnet 1',
          type: 'subnet',
          parentId: 'plate-network',
        }),
      ],
      blocks: [createBlock({ id: 'block-webapp', name: 'Frontend', category: 'compute' })],
    });

    const normalized = normalizePulumi(model, azureProviderDefinition);

    expect(normalized.resourceNames.get('plate-network')).toBe('vnetVNet');
    expect(normalized.resourceNames.get('plate-subnet')).toBe('subnetSubnet1');
    expect(normalized.resourceNames.get('block-webapp')).toBe('webappFrontend');
  });

  it('normalizePulumi handles duplicate names with numeric suffixes', () => {
    const model = createTestModel({
      blocks: [
        createBlock({ id: 'block-1', name: 'App', category: 'compute' }),
        createBlock({ id: 'block-2', name: 'App', category: 'compute' }),
      ],
    });

    const normalized = normalizePulumi(model, azureProviderDefinition);

    expect(normalized.resourceNames.get('block-1')).toBe('webappApp');
    expect(normalized.resourceNames.get('block-2')).toBe('webappApp2');
  });

  it('generateIndexTs contains expected Pulumi imports', () => {
    const model = createTestModel();
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('import * as pulumi from "@pulumi/pulumi";');
    expect(indexTs).toContain('import * as azure from "@pulumi/azure-native";');
  });

  it('generateIndexTs includes config with projectName and location', () => {
    const model = createTestModel();
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const projectName = config.get("projectName") ?? "testproject";');
    expect(indexTs).toContain('const location = config.get("location") ?? "eastus";');
  });

  it('generateIndexTs includes resource group declaration', () => {
    const model = createTestModel();
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const resourceGroup = new azure.resources.ResourceGroup("resourceGroup", {');
    expect(indexTs).toContain('resourceGroupName: `${projectName}-rg`,');
  });

  it('generateIndexTs includes service plan when compute or function blocks exist', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'block-web', name: 'Frontend', category: 'compute' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const servicePlan = new azure.web.AppServicePlan("servicePlan", {');
  });

  it('generateIndexTs includes service plan when only function blocks exist', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'block-func', name: 'Fn', category: 'compute' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const servicePlan = new azure.web.AppServicePlan("servicePlan", {');
  });

  it('generateIndexTs generates all block categories', () => {
    const model = createTestModel({
      blocks: [
        createBlock({ id: 'block-compute', name: 'Compute', category: 'compute' }),
        createBlock({ id: 'block-database', name: 'Database', category: 'data' }),
        createBlock({ id: 'block-storage', name: 'Storage', category: 'data' }),
        createBlock({ id: 'block-gateway', name: 'Gateway', category: 'edge' }),
        createBlock({ id: 'block-function', name: 'Function', category: 'compute' }),
        createBlock({ id: 'block-queue', name: 'Queue', category: 'messaging' }),
        createBlock({ id: 'block-event', name: 'Event', category: 'messaging' }),
        createBlock({ id: 'block-analytics', name: 'Analytics', category: 'operations' }),
        createBlock({ id: 'block-identity', name: 'Identity', category: 'security' }),
        createBlock({ id: 'block-observability', name: 'Observability', category: 'operations' }),
      ],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const webappCompute = new azure.web.WebApp("webappCompute", {');
    expect(indexTs).toContain('const pgserverDatabase = new azure.dbforpostgresql.FlexibleServer("pgserverDatabase", {');
    expect(indexTs).toContain('const pgserverStorage = new azure.dbforpostgresql.FlexibleServer("pgserverStorage", {');
    expect(indexTs).toContain('const appgwGateway = new azure.network.ApplicationGateway("appgwGateway", {');
    expect(indexTs).toContain('const webappFunction = new azure.web.WebApp("webappFunction", {');
    expect(indexTs).toContain('const queueQueue = new azure.storage.Queue("queueQueue", {');
    expect(indexTs).toContain('const queueEvent = new azure.storage.Queue("queueEvent", {');
    expect(indexTs).toContain('const analyticsAnalytics = new azure.operationalinsights.Workspace("analyticsAnalytics", {');
    expect(indexTs).toContain('const identityIdentity = new azure.managedidentity.UserAssignedIdentity("identityIdentity", {');
    expect(indexTs).toContain('const analyticsObservability = new azure.operationalinsights.Workspace("analyticsObservability", {');
  });

  it('generates subnet as top-level resource when parent network is missing', () => {
    const model = createTestModel({
      plates: [
        createPlate({
          id: 'sub-orphan',
          name: 'Orphan Subnet',
          type: 'subnet',
          parentId: 'missing-network',
        }),
      ],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const subnetOrphanSubnet = new azure.network.Subnet("subnetOrphanSubnet", {');
    expect(indexTs).toContain('virtualNetworkName: `${projectName}-subnetOrphanSubnet`');
  });

  it('generatePulumiYaml contains project name and runtime nodejs', () => {
    const pulumiYaml = generatePulumiYaml(defaultOptions);

    expect(pulumiYaml).toContain('name: testproject');
    expect(pulumiYaml).toContain('runtime: nodejs');
  });

  it('pulumiPlugin.generate returns expected metadata', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'block-web', name: 'Frontend', category: 'compute' })],
    });
    const normalized = pulumiPlugin.normalize(model, {
      provider: azureProviderDefinition,
      mode: 'draft',
    });
    const output = pulumiPlugin.generate(normalized, {
      provider: azureProviderDefinition,
      mode: 'draft',
      options: defaultOptions,
    });

    expect(output.files).toEqual([
      expect.objectContaining({ path: 'index.ts', language: 'typescript' }),
      expect.objectContaining({ path: 'Pulumi.yaml', language: 'yaml' }),
    ]);
    expect(output.metadata.generator).toBe('pulumi');
    expect(output.metadata.version).toBe('1.0.0');
    expect(output.metadata.provider).toBe('azure');
    expect(output.metadata.generatedAt).toEqual(expect.any(String));
  });

  it('generates implicit PIP + NIC for VM blocks', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'vm1', name: 'WebServer', category: 'compute', subtype: 'vm' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const vmWebServerPip = new azure.network.PublicIPAddress("vmWebServerPip", {');
    expect(indexTs).toContain('publicIPAllocationMethod: "Static"');
    expect(indexTs).toContain('const vmWebServerNic = new azure.network.NetworkInterface("vmWebServerNic", {');
    expect(indexTs).toContain('id: vmWebServerPip.id,');

    const pipIndex = indexTs.indexOf('PublicIPAddress');
    const nicIndex = indexTs.indexOf('NetworkInterface');
    expect(pipIndex).toBeLessThan(nicIndex);
  });

  it('generates implicit PIP for firewall blocks but no NIC', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'fw1', name: 'MainFirewall', category: 'edge', subtype: 'firewall' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).toContain('const appgwMainFirewallPip = new azure.network.PublicIPAddress("appgwMainFirewallPip", {');
    expect(indexTs).not.toContain('NetworkInterface');
  });

  it('does not generate implicit resources for internal-lb blocks', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'lb1', name: 'InternalLB', category: 'edge', subtype: 'internal-lb' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).not.toContain('PublicIPAddress');
    expect(indexTs).not.toContain('NetworkInterface');
  });

  it('does not generate implicit resources for regular compute blocks without subtype', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'web1', name: 'App', category: 'compute' })],
    });
    const normalized = normalizePulumi(model, azureProviderDefinition);
    const indexTs = generateIndexTs(normalized, azureProviderDefinition, defaultOptions);

    expect(indexTs).not.toContain('PublicIPAddress');
    expect(indexTs).not.toContain('NetworkInterface');
  });
});
