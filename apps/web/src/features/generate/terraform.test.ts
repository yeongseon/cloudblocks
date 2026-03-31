import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endpointId } from '@cloudblocks/schema';

import type {
  ArchitectureModel,
  Connection,
  ContainerBlock,
  ResourceBlock,
} from '@cloudblocks/schema';
import { awsProviderDefinition, azureProviderDefinition, gcpProviderDefinition } from './provider';
import type { ProviderDefinition } from './types';
import { generateMainTf, generateOutputsTf, generateVariablesTf, normalize } from './terraform';
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

function createPlate(overrides: LegacyPlateOverrides): ContainerBlock {
  return makeTestPlate({
    id: 'container-default',
    name: 'Default ContainerBlock',
    type: 'region',
    parentId: null,
    position: basePosition,
    frame: baseSize,
    metadata: {},
    ...overrides,
  });
}

function createBlock(overrides: LegacyBlockOverrides): ResourceBlock {
  return makeTestBlock({
    id: 'block-default',
    name: 'Default Block',
    category: 'compute',
    placementId: 'container-default',
    position: basePosition,
    metadata: {},
    ...overrides,
  });
}

function createConnection(overrides: Partial<Connection>): Connection {
  return {
    id: 'conn-default',
    from: endpointId('block-source', 'output', 'data'),
    to: endpointId('block-target', 'input', 'data'),
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
    endpoints: [],
    externalActors: [
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
    ],
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

const awsOptions = {
  provider: 'aws' as const,
  mode: 'draft' as const,
  projectName: 'My Test Project',
  region: 'us-east-1',
};

const gcpOptions = {
  provider: 'gcp' as const,
  mode: 'draft' as const,
  projectName: 'My Test Project',
  region: 'us-central1',
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

  it('uses AWS-specific name prefixes for containers and blocks', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Core VPC', type: 'region', parentId: null }),
        createPlate({ id: 'sub-1', name: 'Public Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [
        createBlock({
          id: 'ecs-1',
          name: 'Compute Service',
          category: 'compute',
          placementId: 'sub-1',
        }),
      ],
    });

    const normalized = normalize(model, awsProviderDefinition);

    expect(normalized.resourceNames.get('vpc-1')).toBe('vpc_core_vpc');
    expect(normalized.resourceNames.get('sub-1')).toBe('subnet_public_subnet');
    expect(normalized.resourceNames.get('ecs-1')).toBe('ec2_compute_service');
  });

  it('excludes external blocks (internet/browser) from resourceNames map', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net-1', name: 'VNet', type: 'region' })],
      blocks: [createBlock({ id: 'web-1', name: 'App', category: 'compute' })],
    });
    model.nodes.push(
      {
        id: 'ext-browser',
        name: 'Browser',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'browser',
        category: 'delivery' as const,
        provider: 'azure' as const,
        parentId: null,
        position: { x: -6, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
      {
        id: 'ext-internet',
        name: 'Internet',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'internet',
        category: 'delivery' as const,
        provider: 'azure' as const,
        parentId: null,
        position: { x: -3, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
    );

    const normalized = normalize(model, azureProviderDefinition);

    expect(normalized.resourceNames.has('ext-browser')).toBe(false);
    expect(normalized.resourceNames.has('ext-internet')).toBe(false);
    expect(normalized.resourceNames.has('net-1')).toBe(true);
    expect(normalized.resourceNames.has('web-1')).toBe(true);
  });

  it('maps legacy resource-layer containers as region containers', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'resource-layer-1', name: 'Resource Layer', type: 'resource' })],
    });

    const normalized = normalize(model, azureProviderDefinition);

    expect(normalized.resourceNames.get('resource-layer-1')).toBe('vnet_resource_layer');
  });
});

describe('generateMainTf', () => {
  it('contains required providers, provider block, resource group, plates, blocks, and connection comments', () => {
    const model = createTestModel({
      plates: [
        createPlate({
          id: 'net1',
          name: 'Core VNet',
          type: 'region',
          parentId: null,
          children: ['sub1'],
        }),
        createPlate({
          id: 'sub1',
          name: 'Subnet 1',
          type: 'subnet',
          parentId: 'net1',
          children: ['web1'],
        }),
      ],
      blocks: [
        createBlock({ id: 'web1', name: 'Frontend', category: 'compute', placementId: 'sub1' }),
      ],
      connections: [
        createConnection({
          id: 'conn-1',
          from: endpointId('web1', 'output', 'data'),
          to: endpointId('web1', 'input', 'data'),
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
    expect(hcl).toContain('resource "azurerm_subnet" "subnet_subnet_1"');
    expect(hcl).toContain('resource "azurerm_linux_web_app" "webapp_frontend"');
    expect(hcl).toContain('# ─── Data Flow Connections ─────────────────────');
    expect(hcl).toContain('# DataFlow: webapp_frontend → webapp_frontend');
  });

  it('includes service plan when compute blocks exist and excludes it otherwise', () => {
    const withCompute = createTestModel({
      blocks: [
        createBlock({ id: 'web1', name: 'Frontend', category: 'compute', placementId: 'sub1' }),
      ],
    });
    const withoutCompute = createTestModel({
      blocks: [createBlock({ id: 'db1', name: 'MainDb', category: 'data', placementId: 'sub1' })],
    });

    const withComputeHcl = generateMainTf(
      normalize(withCompute, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );
    const withoutComputeHcl = generateMainTf(
      normalize(withoutCompute, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
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
          parentId: 'net1',
        }),
        createPlate({ id: 'net1', name: 'App Network', type: 'region', parentId: null }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );
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
          parentId: 'net1',
        }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hcl).toContain('virtual_network_name = azurerm_virtual_network.vnet_network-a.name');
    expect(hcl).toContain('address_prefixes     = ["10.0.1.0/24"]');
  });

  it('generates category-specific hcl for compute, data, and edge blocks', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'sub1', name: 'Subnet One', type: 'subnet' })],
      blocks: [
        createBlock({ id: 'cmp', name: 'Compute', category: 'compute', placementId: 'sub1' }),
        createBlock({ id: 'db', name: 'Database', category: 'data', placementId: 'sub1' }),
        createBlock({ id: 'st', name: 'Storage', category: 'data', placementId: 'sub1' }),
        createBlock({ id: 'gw', name: 'Gateway', category: 'delivery', placementId: 'sub1' }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hcl).toContain('service_plan_id     = azurerm_service_plan.main.id');
    expect(hcl).toContain('administrator_login    = var.db_admin_username');
    expect(hcl).toContain('sku {');
    expect(hcl).toContain('name     = "Standard_v2"');
  });

  it('generates category-specific comments for network and identity blocks', () => {
    const model = createTestModel({
      blocks: [
        createBlock({ id: 'net', name: 'NetworkCore', category: 'network' }),
        createBlock({ id: 'idn', name: 'IdentityCore', category: 'identity' }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hcl).toContain('# Network resource configuration');
    expect(hcl).toContain('# Managed identity configuration');
  });

  it('includes connection comments only when connections exist', () => {
    const withConnections = createTestModel({
      blocks: [createBlock({ id: 'b1', name: 'Web', category: 'compute', placementId: 'sub1' })],
      connections: [
        createConnection({
          id: 'c1',
          from: endpointId('b1', 'output', 'data'),
          to: endpointId('missing-target', 'input', 'data'),
        }),
      ],
    });
    const withoutConnections = createTestModel({
      blocks: [createBlock({ id: 'b1', name: 'Web', category: 'compute', placementId: 'sub1' })],
      connections: [],
    });

    const hclWithConnections = generateMainTf(
      normalize(withConnections, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );
    const hclWithoutConnections = generateMainTf(
      normalize(withoutConnections, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hclWithConnections).toContain('# ─── Data Flow Connections ─────────────────────');
    expect(hclWithConnections).toContain('# DataFlow: webapp_web → missing-target');
    expect(hclWithoutConnections).not.toContain(
      '# ─── Data Flow Connections ─────────────────────',
    );
  });

  it('falls back to raw endpoint ids in connection comments when endpoint ids are malformed', () => {
    const malformedFrom = 'source-without-endpoint-pattern';
    const malformedTo = 'target-without-endpoint-pattern';
    const model = createTestModel({
      connections: [
        createConnection({
          id: 'conn-malformed',
          from: malformedFrom,
          to: malformedTo,
        }),
      ],
      endpoints: [],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hcl).toContain(`# DataFlow: ${malformedFrom} → ${malformedTo}`);
  });

  it('appends non-empty container companion lines for both region and subnet containers', () => {
    const providerWithContainerCompanions: ProviderDefinition = {
      ...azureProviderDefinition,
      generators: {
        ...azureProviderDefinition.generators,
        terraform: {
          ...azureProviderDefinition.generators.terraform,
          renderContainerCompanions: (ctx) =>
            ctx.parentResourceName
              ? [`# companion-subnet:${ctx.resourceName}:${ctx.parentResourceName}`]
              : [`# companion-region:${ctx.resourceName}`],
        },
      },
    };

    const model = createTestModel({
      plates: [
        createPlate({ id: 'net1', name: 'Main Network', type: 'region', parentId: null }),
        createPlate({ id: 'sub1', name: 'Main Subnet', type: 'subnet', parentId: 'net1' }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, providerWithContainerCompanions),
      providerWithContainerCompanions,
      {
        ...defaultOptions,
        provider: 'azure',
      },
    );

    expect(hcl).toContain('# companion-region:vnet_main_network');
    expect(hcl).toContain('# companion-subnet:subnet_main_subnet:vnet_main_network');
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

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

    expect(hcl).toContain('resource "azurerm_linux_web_app"');
    expect(hcl).toContain('resource "azurerm_storage_queue"');
    expect(hcl).toContain('resource "azurerm_log_analytics_workspace"');
    expect(hcl).toContain('resource "azurerm_user_assigned_identity"');
  });

  it('includes service plan when only function blocks exist', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net1', name: 'VNet', type: 'region' })],
      blocks: [
        createBlock({ id: 'fn1', name: 'Handler', category: 'compute', placementId: 'net1' }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, azureProviderDefinition),
      azureProviderDefinition,
      defaultOptions,
    );

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
      blocks: [
        createBlock({ id: 'fw1', name: 'MainFirewall', category: 'delivery', subtype: 'firewall' }),
      ],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('resource "azurerm_public_ip" "appgw_mainfirewall_pip"');
    expect(hcl).not.toContain('azurerm_network_interface');
  });

  it('does not generate implicit resources for internal-lb blocks', () => {
    const model = createTestModel({
      blocks: [
        createBlock({
          id: 'lb1',
          name: 'InternalLB',
          category: 'delivery',
          subtype: 'internal-lb',
        }),
      ],
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

  it('generates AWS VPC, subnet, and EC2 resources without Azure shared resources', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc1', name: 'Core VPC', type: 'region', parentId: null }),
        createPlate({ id: 'sub1', name: 'Public Subnet', type: 'subnet', parentId: 'vpc1' }),
      ],
      blocks: [
        createBlock({
          id: 'ec2-1',
          name: 'App Server',
          category: 'compute',
          subtype: 'ec2',
          placementId: 'sub1',
        }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, awsProviderDefinition),
      awsProviderDefinition,
      awsOptions,
    );

    expect(hcl).toContain('provider "aws" {');
    expect(hcl).toContain('resource "aws_vpc" "vpc_core_vpc"');
    expect(hcl).toContain('resource "aws_subnet" "subnet_public_subnet"');
    expect(hcl).toContain('vpc_id            = aws_vpc.vpc_core_vpc.id');
    expect(hcl).toContain('cidr_block        = "10.0.1.0/24"');
    expect(hcl).toContain('availability_zone = data.aws_availability_zones.available.names[0]');
    expect(hcl).toContain('resource "aws_instance" "ec2_app_server"');
    expect(hcl).toContain('instance_type = "t3.micro"');
    expect(hcl).toContain('ami           = data.aws_ssm_parameter.amazon_linux_ami.value');
    expect(hcl).toContain('subnet_id     = aws_subnet.subnet_public_subnet.id');
    expect(hcl).not.toContain('azurerm_resource_group');
    expect(hcl).not.toContain('azurerm_service_plan');
  });

  it('generates AWS S3 bucket with bucket_prefix attribute', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 's3-1', name: 'Asset Store', category: 'data', subtype: 's3' })],
    });

    const hcl = generateMainTf(
      normalize(model, awsProviderDefinition),
      awsProviderDefinition,
      awsOptions,
    );

    expect(hcl).toContain('resource "aws_s3_bucket" "s3_asset_store"');
    expect(hcl).toContain(
      'bucket_prefix = "${replace(var.project_name, "_", "-")}-s3-asset-store"',
    );
  });

  it('generates AWS DynamoDB table with billing mode and hash key', () => {
    const model = createTestModel({
      blocks: [
        createBlock({ id: 'ddb-1', name: 'Session Table', category: 'data', subtype: 'dynamodb' }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, awsProviderDefinition),
      awsProviderDefinition,
      awsOptions,
    );

    expect(hcl).toContain('resource "aws_dynamodb_table" "ddb_session_table"');
    expect(hcl).toContain('billing_mode = "PAY_PER_REQUEST"');
    expect(hcl).toContain('hash_key     = "id"');
  });

  it('generates AWS RDS configuration with engine and credentials', () => {
    const model = createTestModel({
      blocks: [
        createBlock({
          id: 'rds-1',
          name: 'Main Postgres',
          category: 'data',
          subtype: 'rds-postgres',
        }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, awsProviderDefinition),
      awsProviderDefinition,
      awsOptions,
    );

    expect(hcl).toContain('resource "aws_db_instance" "rds_main_postgres"');
    expect(hcl).toContain('engine               = "postgres"');
    expect(hcl).toContain('instance_class       = "db.t3.micro"');
    expect(hcl).toContain('username             = var.db_admin_username');
    expect(hcl).toContain('password             = var.db_admin_password');
  });

  it('excludes external blocks from generated main.tf HCL', () => {
    const model = createTestModel({
      plates: [createPlate({ id: 'net1', name: 'VNet', type: 'region' })],
      blocks: [createBlock({ id: 'web1', name: 'App', category: 'compute', placementId: 'net1' })],
    });
    model.nodes.push(
      {
        id: 'ext-browser',
        name: 'Browser',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'browser',
        category: 'delivery' as const,
        provider: 'azure' as const,
        parentId: null,
        position: { x: -6, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
      {
        id: 'ext-internet',
        name: 'Internet',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'internet',
        category: 'delivery' as const,
        provider: 'azure' as const,
        parentId: null,
        position: { x: -3, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
    );

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateMainTf(normalized, azureProviderDefinition, defaultOptions);

    // External blocks should NOT appear in HCL output
    expect(hcl).not.toContain('browser');
    expect(hcl).not.toContain('ext-internet');
    // Real resources should still be present
    expect(hcl).toContain('resource "azurerm_linux_web_app" "webapp_app"');
  });
});

describe('generateVariablesTf', () => {
  it('includes project_name, location, db_admin_username, and db_admin_password variables', () => {
    const hcl = generateVariablesTf(defaultOptions, azureProviderDefinition);

    expect(hcl).toContain('variable "project_name" {');
    expect(hcl).toContain('variable "location" {');
    expect(hcl).toContain('variable "db_admin_username" {');
    expect(hcl).toContain('variable "db_admin_password" {');
  });

  it('sanitizes project name in project_name default value', () => {
    const hcl = generateVariablesTf(
      {
        ...defaultOptions,
        projectName: ' Project!!! Name @@@ ',
      },
      azureProviderDefinition,
    );

    expect(hcl).toContain('default     = "project_name"');
  });

  it('uses default region description when provider hook is absent', () => {
    const hcl = generateVariablesTf(defaultOptions, awsProviderDefinition);

    expect(hcl).toContain('description = "AWS region for resource deployment"');
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
    const hcl = generateOutputsTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).toContain('output "resource_group_name" {');
    expect(hcl).toContain('output "webapp_compute_id" {');
    expect(hcl).toContain('value = azurerm_linux_web_app.webapp_compute.id');
    expect(hcl).toContain('output "pgserver_database_id" {');
    expect(hcl).toContain('value = azurerm_postgresql_flexible_server.pgserver_database.id');
  });

  it('skips provider-specific outputs when extraOutputs hook is absent', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'cmp', name: 'Compute', category: 'compute' })],
    });

    const normalized = normalize(model, awsProviderDefinition);
    const hcl = generateOutputsTf(normalized, awsProviderDefinition, awsOptions);

    expect(hcl).not.toContain('output "resource_group_name" {');
    expect(hcl).toContain('output "ec2_compute_id" {');
    expect(hcl).toContain('value = aws_instance.ec2_compute.id');
  });

  it('excludes external blocks from outputs', () => {
    const model = createTestModel({
      blocks: [createBlock({ id: 'cmp', name: 'Compute', category: 'compute' })],
    });
    model.nodes.push({
      id: 'ext-internet',
      name: 'Internet',
      kind: 'resource' as const,
      layer: 'resource' as const,
      resourceType: 'internet',
      category: 'delivery' as const,
      provider: 'azure' as const,
      parentId: null,
      position: { x: -3, y: 0, z: 5 },
      metadata: {},
      roles: ['external'],
    });

    const normalized = normalize(model, azureProviderDefinition);
    const hcl = generateOutputsTf(normalized, azureProviderDefinition, defaultOptions);

    expect(hcl).not.toContain('internet');
    expect(hcl).toContain('output "webapp_compute_id"');
  });
});

describe('AWS full-output HCL smoke test', () => {
  it('generates valid main.tf with VPC, subnet, EC2, and RDS', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Production VPC', type: 'region' }),
        createPlate({ id: 'sub-1', name: 'Public Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [
        createBlock({ id: 'ec2-1', name: 'Web Server', category: 'compute', placementId: 'sub-1' }),
        createBlock({ id: 'rds-1', name: 'App Database', category: 'data', placementId: 'sub-1' }),
      ],
    });

    const normalized = normalize(model, awsProviderDefinition);
    const hcl = generateMainTf(normalized, awsProviderDefinition, awsOptions);

    // Provider block
    expect(hcl).toContain('provider "aws"');
    expect(hcl).toContain('hashicorp/aws');

    // Shared data sources
    expect(hcl).toContain('data "aws_ssm_parameter" "amazon_linux_ami"');
    expect(hcl).toContain('data "aws_availability_zones" "available"');

    // VPC container
    expect(hcl).toContain('resource "aws_vpc"');
    expect(hcl).toContain('cidr_block');
    expect(hcl).toContain('enable_dns_support');

    // Subnet container
    expect(hcl).toContain('resource "aws_subnet"');
    expect(hcl).toContain('vpc_id');
    expect(hcl).toContain('availability_zone');

    // EC2 instance
    expect(hcl).toContain('resource "aws_instance"');
    expect(hcl).toContain('instance_type = "t3.micro"');
    expect(hcl).toContain('data.aws_ssm_parameter.amazon_linux_ami.value');

    // RDS instance
    expect(hcl).toContain('resource "aws_db_instance"');
    expect(hcl).toContain('engine               = "postgres"');
    expect(hcl).toContain('var.db_admin_username');
    expect(hcl).toContain('var.db_admin_password');
    expect(hcl).toContain('skip_final_snapshot');

    // No broken HCL markers
    expect(hcl).not.toContain('undefined');
    expect(hcl).not.toContain('null');

    // Variables file
    const vars = generateVariablesTf(awsOptions, awsProviderDefinition);
    expect(vars).toContain('variable "project_name"');
    expect(vars).toContain('variable "location"');

    // Outputs file
    const outputs = generateOutputsTf(normalized, awsProviderDefinition, awsOptions);
    expect(outputs).toContain('output');
  });
});

describe('GCP full-output HCL smoke test', () => {
  it('generates valid main.tf with VPC, subnet, Cloud Run, and Cloud SQL', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Core VPC', type: 'region' }),
        createPlate({ id: 'sub-1', name: 'App Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [
        createBlock({
          id: 'run-1',
          name: 'App Service',
          category: 'compute',
          subtype: 'cloud-run',
          placementId: 'sub-1',
        }),
        createBlock({
          id: 'sql-1',
          name: 'App Database',
          category: 'data',
          subtype: 'cloud-sql-postgres',
          placementId: 'sub-1',
        }),
      ],
    });

    const normalized = normalize(model, gcpProviderDefinition);
    const hcl = generateMainTf(normalized, gcpProviderDefinition, gcpOptions);

    expect(hcl).toContain('provider "google"');
    expect(hcl).toContain('resource "google_project_service"');
    expect(hcl).toContain('resource "google_compute_network"');
    expect(hcl).toContain('resource "google_compute_subnetwork"');
    expect(hcl).toContain('resource "google_cloud_run_v2_service"');
    expect(hcl).toContain('resource "google_sql_database_instance"');
    expect(hcl).toContain('google_project_service');
    expect(hcl).not.toContain('undefined');
    expect(hcl).not.toContain('null');

    const vars = generateVariablesTf(gcpOptions, gcpProviderDefinition);
    expect(vars).toContain('variable "project_name"');
    expect(vars).toContain('variable "location"');
    expect(vars).toContain('variable "project_id"');
    expect(vars).toContain('variable "zone"');

    const outputs = generateOutputsTf(normalized, gcpProviderDefinition, gcpOptions);
    expect(outputs).toContain('output');
  });
});

describe('GCP container rendering', () => {
  it('renders VPC and subnet-specific attributes', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Core VPC', type: 'region' }),
        createPlate({ id: 'sub-1', name: 'App Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [],
    });

    const hcl = generateMainTf(
      normalize(model, gcpProviderDefinition),
      gcpProviderDefinition,
      gcpOptions,
    );

    expect(hcl).toContain('auto_create_subnetworks = false');
    expect(hcl).toContain('network       = google_compute_network.network_core_vpc.id');
    expect(hcl).toContain('ip_cidr_range = "10.0.1.0/24"');
    expect(hcl).toContain('region        = var.location');
  });
});

describe('GCP compute with Debian image data source', () => {
  it('renders data source companion before compute resource', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Core VPC', type: 'region' }),
        createPlate({ id: 'sub-1', name: 'App Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [
        createBlock({
          id: 'gce-1',
          name: 'Web VM',
          category: 'compute',
          subtype: 'compute-engine',
          placementId: 'sub-1',
        }),
      ],
    });

    const hcl = generateMainTf(
      normalize(model, gcpProviderDefinition),
      gcpProviderDefinition,
      gcpOptions,
    );

    expect(hcl).toContain('data "google_compute_image" "gce_web_vm_image"');
    expect(hcl).toContain('resource "google_compute_instance" "gce_web_vm"');
    expect(hcl).toContain('machine_type = "e2-micro"');
    expect(hcl).toContain('zone         = var.zone');
    expect(hcl).toContain('boot_disk {');
    expect(hcl).toContain('subnetwork = google_compute_subnetwork.subnet_app_subnet.id');

    const dataIndex = hcl.indexOf('data "google_compute_image" "gce_web_vm_image"');
    const resourceIndex = hcl.indexOf('resource "google_compute_instance" "gce_web_vm"');
    expect(dataIndex).toBeGreaterThan(-1);
    expect(resourceIndex).toBeGreaterThan(-1);
    expect(dataIndex).toBeLessThan(resourceIndex);
  });
});

describe('GCP external block exclusion', () => {
  it('excludes external blocks from GCP shared resources and main.tf', () => {
    const model = createTestModel({
      plates: [
        createPlate({ id: 'vpc-1', name: 'Core VPC', type: 'region' }),
        createPlate({ id: 'sub-1', name: 'App Subnet', type: 'subnet', parentId: 'vpc-1' }),
      ],
      blocks: [
        createBlock({
          id: 'run-1',
          name: 'App Service',
          category: 'compute',
          subtype: 'cloud-run',
          placementId: 'sub-1',
        }),
      ],
    });
    model.nodes.push(
      {
        id: 'ext-browser',
        name: 'Browser',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'browser',
        category: 'delivery' as const,
        provider: 'gcp' as const,
        parentId: null,
        position: { x: -6, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
      {
        id: 'ext-internet',
        name: 'Internet',
        kind: 'resource' as const,
        layer: 'resource' as const,
        resourceType: 'internet',
        category: 'delivery' as const,
        provider: 'gcp' as const,
        parentId: null,
        position: { x: -3, y: 0, z: 5 },
        metadata: {},
        roles: ['external'],
      },
    );

    const normalized = normalize(model, gcpProviderDefinition);
    const hcl = generateMainTf(normalized, gcpProviderDefinition, gcpOptions);

    // External blocks should NOT appear in resource names
    expect(normalized.resourceNames.has('ext-browser')).toBe(false);
    expect(normalized.resourceNames.has('ext-internet')).toBe(false);

    // External blocks should NOT generate GCP API enablements or resources
    expect(hcl).not.toContain('browser');
    expect(hcl).not.toContain('ext-internet');

    // Real resources should still be present
    expect(hcl).toContain('resource "google_cloud_run_v2_service"');
    expect(hcl).toContain('resource "google_project_service"');
  });
});
