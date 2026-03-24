import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureModel, ResourceBlock } from '@cloudblocks/schema';
import { validateArchitecture } from './engine';
import * as aggregationModule from './aggregation';
import * as roleModule from './role';
import * as providerModule from './providerValidation';

function makeModel(): ArchitectureModel {
  return {
    id: 'arch-1',
    name: 'Architecture',
    version: '1',
    nodes: [
      {
        id: 'container-1',
        name: 'Subnet',
        kind: 'container',
        layer: 'subnet',
        resourceType: 'subnet',
        category: 'network',
        provider: 'azure',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        frame: { width: 8, height: 0.2, depth: 8 },
        metadata: {},
      },
      {
        id: 'resource-1',
        name: 'Compute',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'web_compute',
        category: 'compute',
        provider: 'azure',
        parentId: 'container-1',
        position: { x: 1, y: 0.5, z: 1 },
        metadata: {},
      },
    ],
    connections: [],
    endpoints: [],
    externalActors: [
      { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('validation engine aggregation/role branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(providerModule, 'validateProviderRules').mockReturnValue([]);
  });

  it('routes aggregation severity branches to errors and warnings', () => {
    vi.spyOn(aggregationModule, 'validateAggregation').mockImplementation(
      (resource: ResourceBlock) => {
        if (resource.id === 'resource-1') {
          return {
            ruleId: 'agg-error',
            severity: 'error',
            message: 'Aggregation error',
            targetId: resource.id,
          };
        }

        return {
          ruleId: 'agg-warning',
          severity: 'warning',
          message: 'Aggregation warning',
          targetId: resource.id,
        };
      },
    );
    vi.spyOn(roleModule, 'validateRoles').mockReturnValue(null);

    const result = validateArchitecture(makeModel());

    expect(result.errors.map((entry) => entry.ruleId)).toContain('agg-error');
    expect(result.warnings.map((entry) => entry.ruleId)).not.toContain('agg-error');
  });

  it('routes role severity branches to errors and warnings', () => {
    vi.spyOn(aggregationModule, 'validateAggregation').mockReturnValue(null);
    vi.spyOn(roleModule, 'validateRoles').mockImplementation((resource: ResourceBlock) => ({
      ruleId: 'role-warning',
      severity: 'warning',
      message: `Role warning for ${resource.id}`,
      targetId: resource.id,
    }));

    const warningResult = validateArchitecture(makeModel());

    expect(warningResult.errors).toEqual([]);
    expect(warningResult.warnings.map((entry) => entry.ruleId)).toContain('role-warning');

    vi.spyOn(roleModule, 'validateRoles').mockImplementation((resource: ResourceBlock) => ({
      ruleId: 'role-error',
      severity: 'error',
      message: `Role error for ${resource.id}`,
      targetId: resource.id,
    }));

    const errorResult = validateArchitecture(makeModel());

    expect(errorResult.errors.map((entry) => entry.ruleId)).toContain('role-error');
    expect(errorResult.warnings.map((entry) => entry.ruleId)).not.toContain('role-error');
  });

  it('treats null aggregation and role results as no-op', () => {
    vi.spyOn(aggregationModule, 'validateAggregation').mockReturnValue(null);
    vi.spyOn(roleModule, 'validateRoles').mockReturnValue(null);

    const result = validateArchitecture(makeModel());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
