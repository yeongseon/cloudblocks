import type { ProviderAdapter, ProviderDefinition, SubtypeResourceMap } from '../../types';

const awsSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    ec2: { resourceType: 'aws_instance', namePrefix: 'ec2' },
    ecs: { resourceType: 'aws_ecs_service', namePrefix: 'ecs' },
    lambda: { resourceType: 'aws_lambda_function', namePrefix: 'fn' },
  },
  database: {
    'rds-postgres': { resourceType: 'aws_db_instance', namePrefix: 'rds' },
    dynamodb: { resourceType: 'aws_dynamodb_table', namePrefix: 'ddb' },
  },
  storage: {
    s3: { resourceType: 'aws_s3_bucket', namePrefix: 's3' },
  },
  gateway: {
    alb: { resourceType: 'aws_lb', namePrefix: 'alb' },
    'api-gateway': { resourceType: 'aws_apigatewayv2_api', namePrefix: 'apigw' },
  },
};

export const awsProviderDefinition: ProviderDefinition = {
  name: 'aws',
  displayName: 'AWS',
  blockMappings: {
    compute: {
      resourceType: 'aws_ecs_service',
      namePrefix: 'ecs',
    },
    database: {
      resourceType: 'aws_db_instance',
      namePrefix: 'db',
    },
    storage: {
      resourceType: 'aws_s3_bucket',
      namePrefix: 'bucket',
    },
    gateway: {
      resourceType: 'aws_lb',
      namePrefix: 'lb',
    },
    function: {
      resourceType: 'aws_lambda_function',
      namePrefix: 'lambda',
    },
    queue: {
      resourceType: 'aws_sqs_queue',
      namePrefix: 'queue',
    },
    event: {
      resourceType: 'aws_sns_topic',
      namePrefix: 'topic',
    },
    timer: {
      resourceType: 'aws_cloudwatch_event_rule',
      namePrefix: 'schedule',
    },
  },
  plateMappings: {
    network: {
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
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
        [
          'provider "aws" {',
          `  region = "${region}"`,
          '}',
        ].join('\n'),
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

export const awsProvider: ProviderAdapter = {
  name: awsProviderDefinition.name,
  displayName: awsProviderDefinition.displayName,
  blockMappings: awsProviderDefinition.blockMappings,
  plateMappings: awsProviderDefinition.plateMappings,
  providerBlock: awsProviderDefinition.generators.terraform.providerBlock,
  requiredProviders: awsProviderDefinition.generators.terraform.requiredProviders,
};
