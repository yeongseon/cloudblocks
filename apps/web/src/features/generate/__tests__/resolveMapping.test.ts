import { describe, expect, it } from 'vitest';
import type { BlockResourceMap, SubtypeResourceMap } from '../types';
import { resolveBlockMapping } from '../types';

const baseBlockMappings: BlockResourceMap = {
  compute: { resourceType: 'aws_ecs_service', namePrefix: 'ecs' },
  database: { resourceType: 'aws_db_instance', namePrefix: 'db' },
  storage: { resourceType: 'aws_s3_bucket', namePrefix: 'bucket' },
  gateway: { resourceType: 'aws_lb', namePrefix: 'lb' },
  function: { resourceType: 'aws_lambda_function', namePrefix: 'lambda' },
  queue: { resourceType: 'aws_sqs_queue', namePrefix: 'queue' },
  event: { resourceType: 'aws_sns_topic', namePrefix: 'topic' },
  timer: { resourceType: 'aws_cloudwatch_event_rule', namePrefix: 'schedule' },
};

const subtypeMappings: SubtypeResourceMap = {
  compute: {
    ec2: { resourceType: 'aws_instance', namePrefix: 'ec2' },
    ecs: { resourceType: 'aws_ecs_service', namePrefix: 'ecs' },
    lambda: { resourceType: 'aws_lambda_function', namePrefix: 'fn' },
  },
  database: {
    'rds-postgres': { resourceType: 'aws_db_instance', namePrefix: 'rds' },
    dynamodb: { resourceType: 'aws_dynamodb_table', namePrefix: 'ddb' },
  },
};

describe('resolveBlockMapping', () => {
  it('returns subtype mapping when subtype is found', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'compute', 'ec2');
    expect(result).toEqual({ resourceType: 'aws_instance', namePrefix: 'ec2' });
  });

  it('falls back to category mapping when subtype is unknown', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'compute', 'unknown-subtype');
    expect(result).toEqual({ resourceType: 'aws_ecs_service', namePrefix: 'ecs' });
  });

  it('falls back to category mapping when subtype is undefined', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'compute', undefined);
    expect(result).toEqual({ resourceType: 'aws_ecs_service', namePrefix: 'ecs' });
  });

  it('falls back to category mapping when subtypeMappings is undefined', () => {
    const result = resolveBlockMapping(baseBlockMappings, undefined, 'compute', 'ec2');
    expect(result).toEqual({ resourceType: 'aws_ecs_service', namePrefix: 'ecs' });
  });

  it('falls back to category mapping when category has no subtypes defined', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'storage', 's3');
    expect(result).toEqual({ resourceType: 'aws_s3_bucket', namePrefix: 'bucket' });
  });

  it('returns category mapping for categories without any subtype entries', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'gateway');
    expect(result).toEqual({ resourceType: 'aws_lb', namePrefix: 'lb' });
  });

  it('returns subtype mapping for database subtypes', () => {
    const result = resolveBlockMapping(baseBlockMappings, subtypeMappings, 'database', 'dynamodb');
    expect(result).toEqual({ resourceType: 'aws_dynamodb_table', namePrefix: 'ddb' });
  });

  it('returns category mapping with empty subtypeMappings object', () => {
    const result = resolveBlockMapping(baseBlockMappings, {}, 'compute', 'ec2');
    expect(result).toEqual({ resourceType: 'aws_ecs_service', namePrefix: 'ecs' });
  });
});
