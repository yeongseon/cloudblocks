import { describe, it, expect } from 'vitest';
import { validateProviderRules } from './providerValidation';
import {
  makeTestBlock,
  makeTestPlate,
  makeTestArchitecture,
} from '../../__tests__/legacyModelTestUtils';

describe('validateProviderRules', () => {
  it('returns empty array when no resource blocks exist', () => {
    const model = makeTestArchitecture({ nodes: [] });
    expect(validateProviderRules(model)).toEqual([]);
  });

  it('returns empty array for a block with no provider-specific warnings', () => {
    const block = makeTestBlock({
      provider: 'azure',
      category: 'compute',
      resourceType: 'web_compute',
    });
    const container = makeTestPlate({ id: 'container-1' });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });
    expect(validateProviderRules(model)).toEqual([]);
  });

  it('warns when AWS Lambda is inside a subnet', () => {
    const container = makeTestPlate({ id: 'subnet-1' });
    const block = makeTestBlock({
      id: 'lambda-1',
      name: 'MyLambda',
      provider: 'aws',
      category: 'compute',
      resourceType: 'web_compute',
      subtype: 'lambda',
      placementId: 'subnet-1',
    });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });

    const result = validateProviderRules(model);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-provider-aws-lambda-subnet');
    expect(result[0].severity).toBe('warning');
    expect(result[0].targetId).toBe('lambda-1');
    expect(result[0].message).toBe('AWS Lambda "MyLambda" is inside a subnet.');
    expect(result[0].suggestion).toBe(
      "Lambda is serverless — it usually doesn't need VPC placement. If you need private resource access, keep it here; otherwise, consider placing it outside the subnet.",
    );
  });

  it('warns when GCP Cloud SQL is on a subnet without explicit security', () => {
    const container = makeTestPlate({ id: 'subnet-1' });
    const block = makeTestBlock({
      id: 'sql-1',
      name: 'MyCloudSQL',
      provider: 'gcp',
      category: 'data',
      resourceType: 'database',
      subtype: 'cloud-sql-postgres',
      placementId: 'subnet-1',
    });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });

    const result = validateProviderRules(model);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-provider-gcp-sql-public');
    expect(result[0].severity).toBe('warning');
    expect(result[0].targetId).toBe('sql-1');
    expect(result[0].message).toBe(
      'GCP Cloud SQL "MyCloudSQL" is on a subnet without explicit security.',
    );
    expect(result[0].suggestion).toBe(
      'Database instances should be protected with VPC firewall rules or private service access. This is a reminder to configure network security for your database.',
    );
  });

  it('warns for unrecognized subtype', () => {
    const container = makeTestPlate({ id: 'subnet-1' });
    const block = makeTestBlock({
      id: 'block-x',
      name: 'WeirdService',
      provider: 'aws',
      category: 'compute',
      resourceType: 'web_compute',
      subtype: 'nonexistent-service',
      placementId: 'subnet-1',
    });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });

    const result = validateProviderRules(model);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-provider-unknown-subtype');
    expect(result[0].severity).toBe('warning');
    expect(result[0].targetId).toBe('block-x');
    expect(result[0].message).toBe(
      '"WeirdService" uses an unrecognized subtype "nonexistent-service" for aws compute.',
    );
    expect(result[0].suggestion).toBe(
      'This subtype may not be a standard aws service. Check available subtypes for aws compute resources, or verify the spelling.',
    );
  });

  it('does not warn for recognized AWS Lambda subtype outside subnet', () => {
    const container = makeTestPlate({ id: 'region-1', type: 'region' });
    const block = makeTestBlock({
      provider: 'aws',
      category: 'compute',
      resourceType: 'web_compute',
      subtype: 'lambda',
      placementId: 'region-1',
    });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });

    expect(validateProviderRules(model)).toEqual([]);
  });

  it('does not warn for recognized subtype', () => {
    const container = makeTestPlate({ id: 'subnet-1' });
    const block = makeTestBlock({
      provider: 'aws',
      category: 'compute',
      resourceType: 'web_compute',
      subtype: 'ec2',
      placementId: 'subnet-1',
    });
    const model = makeTestArchitecture({ plates: [container], blocks: [block] });

    expect(validateProviderRules(model)).toEqual([]);
  });
});
