import type { ResourceCategory } from '@cloudblocks/schema';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<ResourceCategory, Record<string, SubtypeEntry>>>;

export const awsSubtypeRegistry: SubtypeRegistry = {
  compute: {
    ec2: {
      displayName: 'EC2 Instance',
      description: 'Virtual server in the cloud',
      defaultConfig: { instanceType: 't3.medium' },
    },
    ecs: {
      displayName: 'ECS Service',
      description: 'Container orchestration service',
      defaultConfig: { launchType: 'FARGATE' },
    },
    lambda: {
      displayName: 'Lambda Function',
      description: 'Serverless compute service',
      defaultConfig: { runtime: 'nodejs20.x', memorySize: 256 },
    },
  },
  data: {
    'rds-postgres': {
      displayName: 'RDS PostgreSQL',
      description: 'Managed PostgreSQL database',
      defaultConfig: { engine: 'postgres', instanceClass: 'db.t3.micro' },
    },
    dynamodb: {
      displayName: 'DynamoDB',
      description: 'Serverless NoSQL database',
      defaultConfig: { billingMode: 'PAY_PER_REQUEST' },
    },
  },
  edge: {
    alb: {
      displayName: 'Application Load Balancer',
      description: 'Layer 7 load balancer for HTTP/HTTPS',
    },
    'api-gateway': {
      displayName: 'API Gateway',
      description: 'Managed API endpoint',
    },
    'nat-gateway': {
      displayName: 'NAT Gateway',
      description: 'Managed outbound internet access for private subnets',
    },
  },
  messaging: {
    sqs: {
      displayName: 'SQS Queue',
      description: 'Managed message queue service',
    },
    sns: {
      displayName: 'SNS Topic',
      description: 'Managed pub/sub messaging service',
    },
  },
  security: {
    iam: {
      displayName: 'IAM Role',
      description: 'Identity and access management role',
    },
    nsg: {
      displayName: 'Security Group',
      description: 'Virtual firewall for EC2 instances and subnets',
    },
  },
  operations: {
    cloudwatch: {
      displayName: 'CloudWatch Dashboard',
      description: 'Operational metrics and dashboards',
    },
    athena: {
      displayName: 'Athena Workgroup',
      description: 'Serverless query and analytics workgroup',
    },
  },
};
