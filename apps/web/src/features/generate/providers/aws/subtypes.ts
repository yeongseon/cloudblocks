import type { BlockCategory } from '@cloudblocks/schema';

export interface SubtypeEntry {
  displayName: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export type SubtypeRegistry = Partial<Record<BlockCategory, Record<string, SubtypeEntry>>>;

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
  database: {
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
  storage: {
    s3: {
      displayName: 'S3 Bucket',
      description: 'Object storage service',
    },
  },
  gateway: {
    alb: {
      displayName: 'Application Load Balancer',
      description: 'Layer 7 load balancer for HTTP/HTTPS',
    },
    'api-gateway': {
      displayName: 'API Gateway',
      description: 'Managed API endpoint',
    },
  },
};
