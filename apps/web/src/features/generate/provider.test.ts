import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awsProviderDefinition,
  gcpProviderDefinition,
  azureProviderDefinition,
  getProviderDefinition,
} from './provider';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { GenerationOptions, TerraformBlockContext, TerraformContainerContext } from './types';

const stubArchitecture: ArchitectureModel = {
  id: 'arch-provider-test',
  name: 'Provider Test',
  version: '1',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const stubOptions: GenerationOptions = {
  provider: 'azure',
  mode: 'draft',
  projectName: 'test',
  region: 'eastus',
};

const stubContainerContext: TerraformContainerContext = {
  normalized: {
    architecture: stubArchitecture,
    resourceNames: new Map(),
  },
  options: stubOptions,
  resourceNames: new Map(),
  container: {
    id: 'container-1',
    name: 'Container',
    kind: 'container',
    layer: 'region',
    resourceType: 'virtual_network',
    category: 'network',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 1, height: 1, depth: 1 },
    metadata: {},
  },
  mapping: { resourceType: 'aws_vpc', namePrefix: 'vpc' },
  resourceName: 'vpc_main',
  parentResourceName: null,
};

const stubBlockContext: TerraformBlockContext = {
  normalized: {
    architecture: stubArchitecture,
    resourceNames: new Map(),
  },
  options: stubOptions,
  resourceNames: new Map(),
  block: {
    id: 'block-1',
    name: 'Block',
    kind: 'resource',
    layer: 'resource',
    resourceType: 'web_compute',
    category: 'compute',
    provider: 'azure',
    parentId: 'container-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  },
  mapping: { resourceType: 'aws_instance', namePrefix: 'ec2' },
  resourceName: 'ec2_main',
  parentResourceName: null,
};

describe('azureProviderDefinition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes azure provider identity', () => {
    expect(azureProviderDefinition.name).toBe('azure');
    expect(azureProviderDefinition.displayName).toBe('Azure');
  });

  it('defines all block mappings', () => {
    expect(azureProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'azurerm_linux_web_app',
      namePrefix: 'webapp',
    });
    expect(azureProviderDefinition.blockMappings.data).toEqual({
      resourceType: 'azurerm_postgresql_flexible_server',
      namePrefix: 'pgserver',
    });
    expect(azureProviderDefinition.blockMappings.delivery).toEqual({
      resourceType: 'azurerm_application_gateway',
      namePrefix: 'appgw',
    });
    expect(azureProviderDefinition.blockMappings.messaging).toEqual({
      resourceType: 'azurerm_storage_queue',
      namePrefix: 'queue',
    });
    expect(azureProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'azurerm_user_assigned_identity',
      namePrefix: 'identity',
    });
    expect(azureProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'azurerm_log_analytics_workspace',
      namePrefix: 'analytics',
    });
  });

  it('defines all container mappings', () => {
    expect(azureProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'azurerm_virtual_network',
      namePrefix: 'vnet',
    });
    expect(azureProviderDefinition.containerLayerMappings.subnet).toEqual({
      resourceType: 'azurerm_subnet',
      namePrefix: 'subnet',
    });
  });

  it('builds provider block hcl', () => {
    const block = azureProviderDefinition.generators.terraform.providerBlock('eastus');

    expect(block).toContain('provider "azurerm" {');
    expect(block).toContain('features {}');
    expect(block).toContain('# region: eastus');
    expect(block).toContain('}');
  });

  it('builds required_providers hcl', () => {
    const requiredProviders = azureProviderDefinition.generators.terraform.requiredProviders();

    expect(requiredProviders).toContain('terraform {');
    expect(requiredProviders).toContain('required_providers {');
    expect(requiredProviders).toContain('azurerm = {');
    expect(requiredProviders).toContain('source  = "hashicorp/azurerm"');
    expect(requiredProviders).toContain('version = "~> 3.0"');
  });
});

describe('getProviderDefinition', () => {
  it('returns azure provider definition for azure name', () => {
    expect(getProviderDefinition('azure')).toBe(azureProviderDefinition);
  });

  it('returns aws provider definition for aws name', () => {
    expect(getProviderDefinition('aws')).toBe(awsProviderDefinition);
  });

  it('returns gcp provider definition for gcp name', () => {
    expect(getProviderDefinition('gcp')).toBe(gcpProviderDefinition);
  });

  it('returns undefined for unknown name', () => {
    expect(getProviderDefinition('unknown' as 'azure')).toBeUndefined();
  });
});

describe('awsProviderDefinition', () => {
  it('uses EC2 instance mapping for compute category and includes new category mappings', () => {
    expect(awsProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'aws_instance',
      namePrefix: 'ec2',
    });
    expect(awsProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'aws_athena_workgroup',
      namePrefix: 'analytics',
    });
    expect(awsProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'aws_iam_role',
      namePrefix: 'role',
    });
  });

  it('keeps expected network and subnet container mappings', () => {
    expect(awsProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    });
    expect(awsProviderDefinition.containerLayerMappings.subnet).toEqual({
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    });
  });

  it('exposes terraform hooks with AWS starter bodies', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;

    expect(terraformConfig.requiredProviders()).toContain('hashicorp/aws');
    expect(terraformConfig.providerBlock('us-east-1')).toContain('provider "aws" {');
    expect(terraformConfig.regionVariableDescription).toBe('AWS region for resource deployment');
    const sharedResources = terraformConfig.renderSharedResources?.({
      normalized: stubContainerContext.normalized,
      options: stubContainerContext.options,
      resourceNames: stubContainerContext.resourceNames,
    });
    expect(sharedResources).toBeDefined();
    expect(sharedResources!.length).toBeGreaterThan(0);
    expect(sharedResources!.join('\n')).toContain('aws_ssm_parameter');
    expect(sharedResources!.join('\n')).toContain('aws_availability_zones');
    expect(terraformConfig.renderContainerBody(stubContainerContext)).toContain(
      '  cidr_block           = "10.0.0.0/16"',
    );
    expect(terraformConfig.renderBlockBody(stubBlockContext)).toContain(
      '  instance_type = "t3.micro"',
    );
    expect(terraformConfig.renderBlockBody(stubBlockContext)).toContain(
      '  ami           = data.aws_ssm_parameter.amazon_linux_ami.value',
    );
  });

  it('renders subnet-specific container body with parent VPC and CIDR index', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const subnetCtx: TerraformContainerContext = {
      ...stubContainerContext,
      normalized: {
        architecture: {
          ...stubArchitecture,
          nodes: [
            {
              ...stubContainerContext.container,
              id: 'vpc-1',
              name: 'Core',
              layer: 'region',
              parentId: null,
            },
            {
              ...stubContainerContext.container,
              id: 'sub-1',
              name: 'SubnetA',
              layer: 'subnet',
              parentId: 'vpc-1',
            },
            {
              ...stubContainerContext.container,
              id: 'sub-2',
              name: 'SubnetB',
              layer: 'subnet',
              parentId: 'vpc-1',
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
        resourceNames: new Map([
          ['vpc-1', 'vpc_core'],
          ['sub-1', 'subnet_subneta'],
          ['sub-2', 'subnet_subnetb'],
        ]),
      },
      container: {
        ...stubContainerContext.container,
        id: 'sub-2',
        name: 'SubnetB',
        layer: 'subnet',
        parentId: 'vpc-1',
      },
      resourceName: 'subnet_subnetb',
      parentResourceName: 'vpc_core',
    };

    const body = terraformConfig.renderContainerBody(subnetCtx);

    expect(body).toContain('  vpc_id            = aws_vpc.vpc_core.id');
    expect(body).toContain('  cidr_block        = "10.0.2.0/24"');
    expect(body).toContain('  availability_zone = data.aws_availability_zones.available.names[0]');
  });

  it('renders all AWS block body variants', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const resourceTypes = [
      'aws_ecs_service',
      'aws_lambda_function',
      'aws_db_instance',
      'aws_dynamodb_table',
      'aws_s3_bucket',
      'aws_lb',
      'aws_apigatewayv2_api',
      'aws_sqs_queue',
      'aws_sns_topic',
      'aws_iam_role',
      'aws_cloudwatch_dashboard',
      'aws_nat_gateway',
      'aws_iam_user',
      'aws_athena_workgroup',
      'aws_unknown_resource',
    ];

    for (const resourceType of resourceTypes) {
      const body = terraformConfig.renderBlockBody({
        ...stubBlockContext,
        mapping: { resourceType, namePrefix: 'x' },
        parentResourceName: 'subnet_main',
      });
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it('renders security group with ancestor VPC lookup and fallback', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const withVpcContext: TerraformBlockContext = {
      ...stubBlockContext,
      normalized: {
        architecture: {
          ...stubArchitecture,
          nodes: [
            {
              ...stubContainerContext.container,
              id: 'vpc-1',
              name: 'VPC',
              layer: 'region',
              parentId: null,
            },
            {
              ...stubContainerContext.container,
              id: 'sub-1',
              name: 'Subnet',
              layer: 'subnet',
              parentId: 'vpc-1',
            },
            {
              ...stubBlockContext.block,
              id: 'sg-1',
              category: 'security',
              parentId: 'sub-1',
            },
          ],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
        resourceNames: new Map([
          ['vpc-1', 'vpc_main'],
          ['sub-1', 'subnet_main'],
          ['sg-1', 'sg_main'],
        ]),
      },
      resourceNames: new Map([
        ['vpc-1', 'vpc_main'],
        ['sub-1', 'subnet_main'],
        ['sg-1', 'sg_main'],
      ]),
      block: { ...stubBlockContext.block, id: 'sg-1', parentId: 'sub-1', category: 'security' },
      mapping: { resourceType: 'aws_security_group', namePrefix: 'sg' },
      resourceName: 'sg_main',
    };

    const withVpc = terraformConfig.renderBlockBody(withVpcContext);
    expect(withVpc).toContain('  vpc_id = aws_vpc.vpc_main.id');

    const withoutVpc = terraformConfig.renderBlockBody({
      ...stubBlockContext,
      block: { ...stubBlockContext.block, parentId: null, category: 'security' },
      mapping: { resourceType: 'aws_security_group', namePrefix: 'sg' },
    });
    expect(withoutVpc.join('\n')).toContain('# ERROR: Security group requires a VPC ancestor');

    const missingParent = terraformConfig.renderBlockBody({
      ...stubBlockContext,
      block: { ...stubBlockContext.block, parentId: 'missing-parent', category: 'security' },
      mapping: { resourceType: 'aws_security_group', namePrefix: 'sg' },
    });
    expect(missingParent.join('\n')).toContain('# ERROR: Security group requires a VPC ancestor');
  });

  it('renderSharedResources returns SSM and AZ data blocks with correct structure', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const shared = terraformConfig.renderSharedResources?.({
      normalized: stubContainerContext.normalized,
      options: stubContainerContext.options,
      resourceNames: stubContainerContext.resourceNames,
    });

    expect(shared).toBeDefined();
    const joined = shared!.join('\n');
    expect(joined).toContain('data "aws_ssm_parameter" "amazon_linux_ami"');
    expect(joined).toContain('/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2');
    expect(joined).toContain('data "aws_availability_zones" "available"');
    expect(joined).toContain('state = "available"');
  });

  it('S3 bucket uses bucket_prefix with sanitized and trimmed name', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const s3Body = terraformConfig.renderBlockBody({
      ...stubBlockContext,
      mapping: { resourceType: 'aws_s3_bucket', namePrefix: 's3' },
      resourceName: 'very_long_resource_name_that_exceeds_24_characters',
    });

    const joined = s3Body.join('\n');
    expect(joined).toContain('bucket_prefix');
    expect(joined).not.toContain('bucket =');
    // Verify underscore-to-hyphen sanitization
    expect(joined).toContain('very-long-resource-name-');
    // Verify 24-char trim ("very-long-resource-name-" is exactly 24)
    expect(joined).not.toContain('very-long-resource-name-that-exceeds-24-characters');
  });

  it('unsupported resources emit "cannot be planned" warnings', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;

    for (const resourceType of ['aws_ecs_service', 'aws_lambda_function', 'aws_nat_gateway']) {
      const body = terraformConfig.renderBlockBody({
        ...stubBlockContext,
        mapping: { resourceType, namePrefix: 'test' },
      });
      const joined = body.join('\n');
      expect(joined).toContain('cannot be planned without');
    }
  });

  it('EC2 instance uses SSM data source for AMI instead of hardcoded AMI ID', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const body = terraformConfig.renderBlockBody({
      ...stubBlockContext,
      mapping: { resourceType: 'aws_instance', namePrefix: 'ec2' },
      parentResourceName: 'subnet_main',
    });

    const joined = body.join('\n');
    expect(joined).toContain('data.aws_ssm_parameter.amazon_linux_ami.value');
    expect(joined).not.toMatch(/ami-[0-9a-f]{8,}/);
    expect(joined).toContain('subnet_id     = aws_subnet.subnet_main.id');
  });

  it('subnet container without parent renders AZ but no vpc_id', () => {
    const terraformConfig = awsProviderDefinition.generators.terraform;
    const body = terraformConfig.renderContainerBody({
      ...stubContainerContext,
      container: { ...stubContainerContext.container, layer: 'subnet', parentId: null },
      parentResourceName: null,
    });

    const joined = body.join('\n');
    expect(joined).toContain('availability_zone = data.aws_availability_zones.available.names[0]');
    expect(joined).not.toContain('vpc_id');
  });
});

describe('gcpProviderDefinition', () => {
  it('uses Cloud Run/backend mappings and includes new category mappings', () => {
    expect(gcpProviderDefinition.blockMappings.compute).toEqual({
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    });
    expect(gcpProviderDefinition.blockMappings.delivery).toEqual({
      resourceType: 'google_compute_backend_service',
      namePrefix: 'backend',
    });
    expect(gcpProviderDefinition.blockMappings.operations).toEqual({
      resourceType: 'google_bigquery_dataset',
      namePrefix: 'analytics',
    });
    expect(gcpProviderDefinition.blockMappings.security).toEqual({
      resourceType: 'google_service_account',
      namePrefix: 'sa',
    });
  });

  it('keeps expected network and subnet container mappings', () => {
    expect(gcpProviderDefinition.containerLayerMappings.region).toEqual({
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    });
    expect(gcpProviderDefinition.containerLayerMappings.subnet).toEqual({
      resourceType: 'google_compute_subnetwork',
      namePrefix: 'subnet',
    });
  });

  it('exposes terraform hook stubs', () => {
    const terraformConfig = gcpProviderDefinition.generators.terraform;
    const blockContext: TerraformBlockContext = {
      ...stubBlockContext,
      mapping: { resourceType: 'google_compute_instance', namePrefix: 'gce' },
    };

    expect(terraformConfig.requiredProviders()).toContain('hashicorp/google');
    expect(terraformConfig.providerBlock('us-central1')).toContain('provider "google" {');
    expect(terraformConfig.renderContainerBody(stubContainerContext)).toEqual([]);
    expect(terraformConfig.renderBlockBody(blockContext)).toEqual([
      '  # TODO: Configure google_compute_instance',
    ]);
  });
});
