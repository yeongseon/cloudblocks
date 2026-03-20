import { describe, expect, it } from 'vitest';
import type { ArchitectureModel, Block, Plate } from '@cloudblocks/schema';
import { validateProviderRules } from '../providerValidation';

function makePlate(overrides: Partial<Plate> = {}): Plate {
  return {
    id: 'subnet-private-1',
    name: 'Private Subnet',
    type: 'subnet',
    subnetAccess: 'private',
    parentId: 'network-1',
    children: [],
    position: { x: 0, y: 0, z: 0 },
    size: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  };
}

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'subnet-private-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  };
}

function makeModel(
  overrides: Partial<ArchitectureModel> = {}
): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1.0.0',
    plates: [makePlate()],
    blocks: [],
    connections: [],
    externalActors: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateProviderRules', () => {
  it('returns warning for AWS Lambda on subnet', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'lambda-1',
          name: 'Lambda Handler',
          provider: 'aws',
          subtype: 'lambda',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      ruleId: 'rule-provider-aws-lambda-subnet',
      severity: 'warning',
      targetId: 'lambda-1',
    });
  });

  it('returns no warning for AWS EC2 on subnet', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'ec2-1',
          name: 'EC2 App',
          provider: 'aws',
          subtype: 'ec2',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns warning for GCP Cloud SQL on public subnet', () => {
    const model = makeModel({
      plates: [makePlate({ id: 'subnet-public-1', subnetAccess: 'public' })],
      blocks: [
        makeBlock({
          id: 'sql-1',
          name: 'Cloud SQL',
          category: 'database',
          provider: 'gcp',
          subtype: 'cloud-sql-postgres',
          placementId: 'subnet-public-1',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      ruleId: 'rule-provider-gcp-sql-public',
      severity: 'warning',
      targetId: 'sql-1',
    });
  });

  it('returns no warning for GCP Cloud SQL on private subnet', () => {
    const model = makeModel({
      plates: [makePlate({ id: 'subnet-private-2', subnetAccess: 'private' })],
      blocks: [
        makeBlock({
          id: 'sql-2',
          name: 'Cloud SQL Private',
          category: 'database',
          provider: 'gcp',
          subtype: 'cloud-sql-postgres',
          placementId: 'subnet-private-2',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns warning for unknown subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'unknown-1',
          name: 'Mystery Compute',
          provider: 'aws',
          category: 'compute',
          subtype: 'mystery-instance',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      ruleId: 'rule-provider-unknown-subtype',
      severity: 'warning',
      targetId: 'unknown-1',
    });
  });

  it('returns no warning for known subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'known-1',
          name: 'Cloud Run Service',
          provider: 'gcp',
          category: 'compute',
          subtype: 'cloud-run',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warnings for block without provider', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'no-provider-1',
          name: 'Generic Compute',
          subtype: 'ec2',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warnings for block without subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'no-subtype-1',
          name: 'Provider Block',
          provider: 'aws',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('collects multiple warnings across architecture', () => {
    const model = makeModel({
      plates: [
        makePlate({ id: 'subnet-public-1', subnetAccess: 'public' }),
        makePlate({ id: 'subnet-private-1', subnetAccess: 'private' }),
      ],
      blocks: [
        makeBlock({
          id: 'lambda-1',
          name: 'Lambda Worker',
          provider: 'aws',
          category: 'compute',
          subtype: 'lambda',
          placementId: 'subnet-private-1',
        }),
        makeBlock({
          id: 'sql-public-1',
          name: 'Cloud SQL Public',
          provider: 'gcp',
          category: 'database',
          subtype: 'cloud-sql-postgres',
          placementId: 'subnet-public-1',
        }),
        makeBlock({
          id: 'unknown-2',
          name: 'Unknown Gateway',
          provider: 'azure',
          category: 'gateway',
          subtype: 'unknown-gateway',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toHaveLength(3);
    expect(warnings.map((warning) => warning.ruleId).sort()).toEqual([
      'rule-provider-aws-lambda-subnet',
      'rule-provider-gcp-sql-public',
      'rule-provider-unknown-subtype',
    ]);
    for (const warning of warnings) {
      expect(warning.severity).toBe('warning');
    }
  });
});
