import type { ProviderDefinition, SubtypeResourceMap } from '../../types';

const awsSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    ec2: { resourceType: 'aws_instance', namePrefix: 'ec2' },
    ecs: { resourceType: 'aws_ecs_service', namePrefix: 'ecs' },
    lambda: { resourceType: 'aws_lambda_function', namePrefix: 'fn' },
  },
  data: {
    'rds-postgres': { resourceType: 'aws_db_instance', namePrefix: 'rds' },
    dynamodb: { resourceType: 'aws_dynamodb_table', namePrefix: 'ddb' },
    s3: { resourceType: 'aws_s3_bucket', namePrefix: 's3' },
  },
  delivery: {
    alb: { resourceType: 'aws_lb', namePrefix: 'alb' },
    'api-gateway': { resourceType: 'aws_apigatewayv2_api', namePrefix: 'apigw' },
    'nat-gateway': { resourceType: 'aws_nat_gateway', namePrefix: 'natgw' },
  },
  messaging: {
    sqs: { resourceType: 'aws_sqs_queue', namePrefix: 'queue' },
    sns: { resourceType: 'aws_sns_topic', namePrefix: 'topic' },
  },
  security: {
    iam: { resourceType: 'aws_iam_role', namePrefix: 'role' },
    nsg: { resourceType: 'aws_security_group', namePrefix: 'sg' },
  },
  identity: {
    'managed-identity': { resourceType: 'aws_iam_role', namePrefix: 'identity' },
    managed_identity: { resourceType: 'aws_iam_role', namePrefix: 'identity' },
    'service-account': { resourceType: 'aws_iam_user', namePrefix: 'svcacct' },
    service_account: { resourceType: 'aws_iam_user', namePrefix: 'svcacct' },
    'service-principal': { resourceType: 'aws_iam_role', namePrefix: 'svcpr' },
    service_principal: { resourceType: 'aws_iam_role', namePrefix: 'svcpr' },
  },
  operations: {
    cloudwatch: { resourceType: 'aws_cloudwatch_dashboard', namePrefix: 'dashboard' },
    athena: { resourceType: 'aws_athena_workgroup', namePrefix: 'analytics' },
  },
};

export const awsProviderDefinition: ProviderDefinition = {
  name: 'aws',
  displayName: 'AWS',
  blockMappings: {
    network: {
      resourceType: 'aws_vpc',
      namePrefix: 'network',
    },
    security: {
      resourceType: 'aws_iam_role',
      namePrefix: 'role',
    },
    identity: {
      resourceType: 'aws_iam_role',
      namePrefix: 'identity',
    },
    delivery: {
      resourceType: 'aws_lb',
      namePrefix: 'lb',
    },
    compute: {
      resourceType: 'aws_ecs_service',
      namePrefix: 'ecs',
    },
    data: {
      resourceType: 'aws_db_instance',
      namePrefix: 'db',
    },
    messaging: {
      resourceType: 'aws_sqs_queue',
      namePrefix: 'queue',
    },
    operations: {
      resourceType: 'aws_athena_workgroup',
      namePrefix: 'analytics',
    },
  },
  containerLayerMappings: {
    global: {
      resourceType: 'aws_vpc',
      namePrefix: 'global',
    },
    edge: {
      resourceType: 'aws_vpc',
      namePrefix: 'edge',
    },
    region: {
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    },
    zone: {
      resourceType: 'aws_vpc',
      namePrefix: 'zone',
    },
    subnet: {
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    },
  },
  generators: {
    terraform: {
      requiredProviders: () =>
        [
          'terraform {',
          '  required_providers {',
          '    aws = {',
          '      source  = "hashicorp/aws"',
          '      version = "~> 5.0"',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      providerBlock: (region: string) =>
        ['provider "aws" {', `  region = "${region}"`, '}'].join('\n'),
    },
    bicep: {
      targetScope: 'resourceGroup',
    },
    pulumi: {
      packageName: '@pulumi/aws',
      runtime: 'nodejs',
    },
  },
  subtypeBlockMappings: awsSubtypeBlockMappings,
};
