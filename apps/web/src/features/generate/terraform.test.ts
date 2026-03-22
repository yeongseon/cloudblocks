import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureModel, Connection, ContainerNode, LeafNode } from '@cloudblocks/schema';
import { azureProviderDefinition } from './provider';
import {
  generateMainTf,
  generateOutputsTf,
  generateVariablesTf,
  normalize,
} from './terraform';
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
    name: 'Default Plate',
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
    name: 'Default Block',
    category: 'compute',
    placementId: 'plate-default',
    position: basePosition,
    metadata: {},
    ...overrides,
  });
}

function createConnection(overrides: Partial<Connection>): Connection {
  return {
    id: 'conn-default',
    sourceId: 'block-source',
    targetId: 'block-target',
    type: 'dataflow',
    metadata: {},
    ...overrides,
  };
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

const defaultOptions = {
  provider: 'azure' as const,
  mode: 'draft' as const,
  projectName: 'My Test Project',
  region: 'eastus',
};

describe('normalize', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps plates and blocks to unique resource names with suffixes for duplicates', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'net-1', name: 'Main Net', type: 'region', parentId: null }),
        createPlate({ id: 'net-2', name: 'Main Net', type: 'region', parentId: null }),
      ],
      blocks: [
        createBlock({ id: 'web-1', name: 'App', category: 'compute' }),
        createBlock({ id: 'web-2', name: 'App', category: 'compute' }),
        createBlock({ id: 'web-3', name: 'App', category: 'compute' }),
      ],
    });

    const normalized = normalize(model, azureProviderDefinition);

    expect(normalized.resourceNames.get('net-1')).toBe('vnet_main_net');
    expect(normalized.resourceNames.get('net-2')).toBe('vnet_main_net_2');
    expect(normalized.resourceNames.get('web-1')).toBe('webapp_app');
    expect(normalized.resourceNames.get('web-2')).toBe('webapp_app_2');
    expect(normalized.resourceNames.get('web-3')).toBe('webapp_app_3');
  });

  it('sanitizes names by replacing special characters with underscores', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net-1', name: '*** Core Network ###', type: 'region' })],
      blocks: [createBlock({ id: 'web-1', name: 'My App ! 01', category: 'compute' })],
    });

    const normalized = normalize(model, azureProviderDefinition);

    expect(normalized.resourceNames.get('net-1')).toBe('vnet_core_network');
    expect(normalized.resourceNames.get('web-1')).toBe('webapp_my_app_01');
  });
});

describe('generateMainTf', () => {
  it('contains required providers, provider block, resource group, plates, blocks, and connection comments', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'net1', name: 'Core VNet', type: 'region', parentId: null, children: ['sub1'] }),
        createPlate({
          id: 'sub1',
          name: 'Public Subnet',
          type: 'subnet',
          subnetAccess: 'public',
          parentId: 'net1',
          children: ['web1'],
        }),
      ],
      blocks: [createBlock({ id: 'web1', name: 'Frontend', category: 'compute', placementId: 'sub1' })],
      connections: [
        createConnection({
          id: 'conn-1',
          sourceId: 'web1',
          targetId: 'web1',
        }),
      ],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('terraform {');
    expect(hcl).toContain('required_providers {');
    expect(hcl).toContain('provider "azurerm" {');
    expect(hcl).toContain('resource "azurerm_resource_group" "main"');
    expect(hcl).toContain('resource "azurerm_virtual_network" "vnet_core_vnet"');
    expect(hcl).toContain('resource "azurerm_subnet" "subnet_public_subnet"');
    expect(hcl).toContain('resource "azurerm_linux_web_app" "webapp_frontend"');
    expect(hcl).toContain('# ─── Data Flow Connections ─────────────────────');
    expect(hcl).toContain('# DataFlow: webapp_frontend → webapp_frontend');
  });

  it('includes service plan when compute blocks exist and excludes it otherwise', () => {
    const withCompute = createTestModel({
      blocks: [createBlock({ id: 'web1', name: 'Frontend', category: 'compute', placementId: 'sub1' })],
    });
    const withoutCompute = createTestModel({
      blocks: [createBlock({ id: 'db1', name: 'MainDb', category: 'data', placementId: 'sub1' })],
    });

    const withComputeHcl = generateMainTf(
      normalize(withCompute, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions
    );
    const withoutComputeHcl = generateMainTf(
      normalize(withoutCompute, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions
    );

    expect(withComputeHcl).toContain('resource "azurerm_service_plan" "main"');
    expect(withoutComputeHcl).not.toContain('resource "azurerm_service_plan" "main"');
  });

  it('generates network plates before subnet plates', () => {
    const model = createTestModel({
      plates: [
        createPlate({
          id: 'sub1',
          name: 'App Subnet',
          type: 'subnet',
          subnetAccess: 'private',
          parentId: 'net1',
        }),
        createPlate({ id: 'net1', name: 'App Network', type: 'region', parentId: null }),
      ],
    });

    const hcl = generateMainTf(normalize(model, azureProviderDefinition), azureProviderDefinition, defaultOptions);
    const networkIndex = hcl.indexOf('resource "azurerm_virtual_network" "vnet_app_network"');
    const subnetIndex = hcl.indexOf('resource "azurerm_subnet" "subnet_app_subnet"');

    expect(networkIndex).toBeGreaterThan(-1);
    expect(subnetIndex).toBeGreaterThan(-1);
    expect(networkIndex).toBeLessThan(subnetIndex);
  });

  it('makes subnet resources reference the parent vnet resource name', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'net1', name: 'Network-A', type: 'region', parentId: null }),
        createPlate({
          id: 'sub1',
          name: 'Public-A',
          type: 'subnet',
          subnetAccess: 'public',
          parentId: 'net1',
        }),
      ],
    });

    const hcl = generateMainTf(normalize(model, azureProviderDefinition), azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('virtual_network_name = azurerm_virtual_network.vnet_network-a.name');
    expect(hcl).toContain('address_prefixes     = ["10.0.1.0/24"]');
  });

  it('generates category-specific hcl for compute, data, and edge blocks', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'sub1', name: 'Subnet One', type: 'subnet', subnetAccess: 'public' })],
      blocks: [
        createBlock({ id: 'cmp', name: 'Compute', category: 'compute', placementId: 'sub1' }),
        createBlock({ id: 'db', name: 'Database', category: 'data', placementId: 'sub1' }),
        createBlock({ id: 'st', name: 'Storage', category: 'data', placementId: 'sub1' }),
        createBlock({ id: 'gw', name: 'Gateway', category: 'edge', placementId: 'sub1' }),
      ],
    });

    const hcl = generateMainTf(normalize(model, azureProviderDefinition), azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('service_plan_id     = azurerm_service_plan.main.id');
    expect(hcl).toContain('administrator_login    = var.db_admin_username');
    expect(hcl).toContain('sku {');
    expect(hcl).toContain('name     = "Standard_v2"');
  });

  it('includes connection comments only when connections exist', () => {
    const withConnections = createTestModel({
      blocks: [createBlock({ id: 'b1', name: 'Web', category: 'compute', placementId: 'sub1' })],
      connections: [
        createConnection({ id: 'c1', sourceId: 'b1', targetId: 'missing-target' }),
      ],
    });
    const withoutConnections = createTestModel({
      blocks: [createBlock({ id: 'b1', name: 'Web', category: 'compute', placementId: 'sub1' })],
      connections: [],
    });

    const hclWithConnections = generateMainTf(
      normalize(withConnections, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions
    );
    const hclWithoutConnections = generateMainTf(
      normalize(withoutConnections, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions
    );

    expect(hclWithConnections).toContain('# ─── Data Flow Connections ─────────────────────');
    expect(hclWithConnections).toContain('# DataFlow: webapp_web → missing-target');
    expect(hclWithoutConnections).not.toContain('# ─── Data Flow Connections ─────────────────────');
  });

  it('generates serverless and new category resources', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net1', name: 'VNet', type: 'region' })],
      blocks: [
        createBlock({ id: 'fn1', name: 'Handler', category: 'compute', placementId: 'net1' }),
        createBlock({ id: 'q1', name: 'TaskQueue', category: 'messaging', placementId: 'net1' }),
        createBlock({ id: 'ev1', name: 'EventSrc', category: 'messaging', placementId: 'net1' }),
        createBlock({ id: 'an1', name: 'Analytics', category: 'operations', placementId: 'net1' }),
        createBlock({ id: 'id1', name: 'Identity', category: 'security', placementId: 'net1' }),
        createBlock({ id: 'ob1', name: 'Monitor', category: 'operations', placementId: 'net1' }),
      ],
    });

    const hcl = generateMainTf(normalize(model, azureProviderDefinition), azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('resource "azurerm_linux_web_app"');
    expect(hcl).toContain('resource "azurerm_storage_queue"');
    expect(hcl).toContain('resource "azurerm_log_analytics_workspace"');
    expect(hcl).toContain('resource "azurerm_user_assigned_identity"');
  });

  it('includes service plan when only function blocks exist', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net1', name: 'VNet', type: 'region' })],
      blocks: [createBlock({ id: 'fn1', name: 'Handler', category: 'compute', placementId: 'net1' })],
    });

    const hcl = generateMainTf(normalize(model, azureProviderDefinition), azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('resource "azurerm_service_plan" "main"');
    expect(hcl).toContain('resource "azurerm_linux_web_app"');
  });

  it('generates implicit PIP + NIC for VM blocks', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'vm1', name: 'WebServer', category: 'compute', subtype: 'vm' })],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('resource "azurerm_public_ip" "vm_webserver_pip"');
    expect(hcl).toContain('allocation_method   = "Static"');
    expect(hcl).toContain('resource "azurerm_network_interface" "vm_webserver_nic"');
    expect(hcl).toContain('public_ip_address_id          = azurerm_public_ip.vm_webserver_pip.id');
    expect(hcl).toContain('resource "azurerm_linux_virtual_machine" "vm_webserver"');

    const pipIndex = hcl.indexOf('azurerm_public_ip');
    const nicIndex = hcl.indexOf('azurerm_network_interface');
    const vmIndex = hcl.indexOf('azurerm_linux_virtual_machine');
    expect(pipIndex).toBeLessThan(nicIndex);
    expect(nicIndex).toBeLessThan(vmIndex);
  });

  it('generates implicit PIP for firewall blocks but no NIC', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'fw1', name: 'MainFirewall', category: 'edge', subtype: 'firewall' })],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('resource "azurerm_public_ip" "appgw_mainfirewall_pip"');
    expect(hcl).not.toContain('azurerm_network_interface');
  });

  it('does not generate implicit resources for internal-lb blocks', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'lb1', name: 'InternalLB', category: 'edge', subtype: 'internal-lb' })],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).not.toContain('azurerm_public_ip');
    expect(hcl).not.toContain('azurerm_network_interface');
  });

  it('does not generate implicit resources for regular compute blocks without subtype', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'web1', name: 'App', category: 'compute' })],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).not.toContain('azurerm_public_ip');
    expect(hcl).not.toContain('azurerm_network_interface');
  });
});

describe('generateVariablesTf', () => {
  it('includes project_name, location, db_admin_username, and db_admin_password variables', () => {
    const hcl = generateVariablesTf(defaultOptions);

    expect(hcl).toContain('variable "project_name" {');
    expect(hcl).toContain('variable "location" {');
    expect(hcl).toContain('variable "db_admin_username" {');
    expect(hcl).toContain('variable "db_admin_password" {');
  });

  it('sanitizes project name in project_name default value', () => {
    const hcl = generateVariablesTf({
      ...defaultOptions,
      projectName: ' Project!!! Name @@@ ',
    });

    expect(hcl).toContain('default     = "project_name"');
  });
});

describe('generateOutputsTf', () => {
  it('includes resource_group_name output and one output per block', () => {
    const model = createTestModel({
      blocks: [
        createBlock({ id: 'cmp', name: 'Compute', category: 'compute', placementId: 'sub1' }),
        createBlock({ id: 'db', name: 'Database', category: 'data', placementId: 'sub1' }),
      ],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateOutputsTf(normalized, azureProviderDefinition);

    expect(hcl).toContain('output "resource_group_name" {');
    expect(hcl).toContain('output "webapp_compute_id" {');
    expect(hcl).toContain('value = azurerm_linux_web_app.webapp_compute.id');
    expect(hcl).toContain('output "pgserver_database_id" {');
    expect(hcl).toContain('value = azurerm_postgresql_flexible_server.pgserver_database.id');
  });
});
