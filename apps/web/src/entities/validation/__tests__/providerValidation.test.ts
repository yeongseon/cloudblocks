import { describe, expect, it } from 'vitest';
import type { ArchitectureModel, ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { validateProviderRules } from '../providerValidation';
import {
  makeTestArchitecture,
  makeTestBlock,
  makeTestPlate,
  type LegacyArchitectureOverrides,
  type LegacyBlockOverrides,
  type LegacyPlateOverrides,
} from '../../../__tests__/legacyModelTestUtils';

function makePlate(overrides: LegacyPlateOverrides = {}): ContainerBlock {
  return makeTestPlate({
    id: 'subnet-private-1',
    name: 'Subnet',
    type: 'subnet',
    parentId: 'network-1',
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 8, height: 1, depth: 8 },
    metadata: {},
    ...overrides,
  });
}

function makeBlock(overrides: LegacyBlockOverrides = {}): ResourceBlock {
  return makeTestBlock({
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'subnet-private-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  });
}

function makeModel(overrides: LegacyArchitectureOverrides = {}): ArchitectureModel {
  return makeTestArchitecture({
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
  });
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
      plates: [makePlate({ id: 'subnet-public-1' })],
      blocks: [
        makeBlock({
          id: 'sql-1',
          name: 'Cloud SQL',
          category: 'data',
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

  it('returns warning for GCP Cloud SQL on any subnet', () => {
    const model = makeModel({
      plates: [makePlate({ id: 'subnet-private-2' })],
      blocks: [
        makeBlock({
          id: 'sql-2',
          name: 'Cloud SQL Private',
          category: 'data',
          provider: 'gcp',
          subtype: 'cloud-sql-postgres',
          placementId: 'subnet-private-2',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      ruleId: 'rule-provider-gcp-sql-public',
      severity: 'warning',
      targetId: 'sql-2',
    });
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

  it('returns warning when default provider and subtype mismatch', () => {
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

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      ruleId: 'rule-provider-unknown-subtype',
      severity: 'warning',
      targetId: 'no-provider-1',
    });
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
      plates: [makePlate({ id: 'subnet-public-1' }), makePlate({ id: 'subnet-private-1' })],
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
          category: 'data',
          subtype: 'cloud-sql-postgres',
          placementId: 'subnet-public-1',
        }),
        makeBlock({
          id: 'unknown-2',
          name: 'Unknown Gateway',
          provider: 'azure',
          category: 'delivery',
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

  it('returns no warning for valid AWS nat-gateway subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'natgw-1',
          name: 'NAT Gateway',
          provider: 'aws',
          category: 'delivery',
          subtype: 'nat-gateway',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for valid AWS nsg subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'sg-1',
          name: 'Security Group',
          provider: 'aws',
          category: 'security',
          subtype: 'nsg',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for valid AWS identity subtypes', () => {
    const subtypes = [
      'managed-identity',
      'managed_identity',
      'service-account',
      'service_account',
      'service-principal',
      'service_principal',
    ];
    for (const subtype of subtypes) {
      const model = makeModel({
        blocks: [
          makeBlock({
            id: `identity-${subtype}`,
            name: `Identity ${subtype}`,
            provider: 'aws',
            category: 'identity',
            subtype,
          }),
        ],
      });

      const warnings = validateProviderRules(model);

      expect(warnings).toEqual([]);
    }
  });

  it('returns no warning for valid AWS athena subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'athena-1',
          name: 'Athena Workgroup',
          provider: 'aws',
          category: 'operations',
          subtype: 'athena',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for Azure timer-trigger as messaging subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'timer-1',
          name: 'Timer Trigger',
          provider: 'azure',
          category: 'messaging',
          subtype: 'timer-trigger',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for AWS eventbridge-scheduler as messaging subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'scheduler-1',
          name: 'EventBridge Scheduler',
          provider: 'aws',
          category: 'messaging',
          subtype: 'eventbridge-scheduler',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for GCP cloud-scheduler as messaging subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'scheduler-2',
          name: 'Cloud Scheduler',
          provider: 'gcp',
          category: 'messaging',
          subtype: 'cloud-scheduler',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });

  it('returns no warning for Azure azure-postgresql as data subtype', () => {
    const model = makeModel({
      blocks: [
        makeBlock({
          id: 'pg-1',
          name: 'PostgreSQL',
          provider: 'azure',
          category: 'data',
          subtype: 'azure-postgresql',
        }),
      ],
    });

    const warnings = validateProviderRules(model);

    expect(warnings).toEqual([]);
  });
});
