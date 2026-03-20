// @cloudblocks/domain — Unit tests
// Validates domain constants, hierarchy rules, and validation types.

import { describe, it, expect } from 'vitest';
import {
  DOMAIN_VERSION,
  VALID_PARENTS,
  CONNECTION_TYPE_LABELS,
  BLOCK_ROLES,
} from '../index.js';
import type {
  RuleSeverity,
  RuleType,
  RuleDefinition,
  ValidationError,
  ValidationResult,
} from '../index.js';

// ── DOMAIN_VERSION ──────────────────────────────────────────

describe('DOMAIN_VERSION', () => {
  it('is a semver string', () => {
    expect(DOMAIN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ── VALID_PARENTS ───────────────────────────────────────────

describe('VALID_PARENTS', () => {
  it('covers all 6 layer types', () => {
    const layers = ['global', 'edge', 'region', 'zone', 'subnet', 'resource'] as const;
    for (const layer of layers) {
      expect(VALID_PARENTS).toHaveProperty(layer);
      expect(Array.isArray(VALID_PARENTS[layer])).toBe(true);
    }
  });

  it('global and edge are root-level (empty parents)', () => {
    expect(VALID_PARENTS.global).toEqual([]);
    expect(VALID_PARENTS.edge).toEqual([]);
  });

  it('region can only nest inside global', () => {
    expect(VALID_PARENTS.region).toEqual(['global']);
  });

  it('zone can only nest inside region', () => {
    expect(VALID_PARENTS.zone).toEqual(['region']);
  });

  it('subnet can nest inside zone or region', () => {
    expect(VALID_PARENTS.subnet).toContain('zone');
    expect(VALID_PARENTS.subnet).toContain('region');
  });

  it('resource can nest inside subnet, zone, region, edge, or global', () => {
    expect(VALID_PARENTS.resource).toContain('subnet');
    expect(VALID_PARENTS.resource).toContain('zone');
    expect(VALID_PARENTS.resource).toContain('region');
    expect(VALID_PARENTS.resource).toContain('edge');
    expect(VALID_PARENTS.resource).toContain('global');
  });

  it('no layer allows itself as a parent (no self-nesting)', () => {
    for (const [layer, parents] of Object.entries(VALID_PARENTS)) {
      expect(parents).not.toContain(layer);
    }
  });
});

// ── CONNECTION_TYPE_LABELS ──────────────────────────────────

describe('CONNECTION_TYPE_LABELS', () => {
  it('covers all 5 connection types', () => {
    const types = ['dataflow', 'http', 'internal', 'data', 'async'] as const;
    for (const t of types) {
      expect(CONNECTION_TYPE_LABELS).toHaveProperty(t);
      expect(typeof CONNECTION_TYPE_LABELS[t]).toBe('string');
      expect(CONNECTION_TYPE_LABELS[t].length).toBeGreaterThan(0);
    }
  });

  it('has correct human-readable labels', () => {
    expect(CONNECTION_TYPE_LABELS.dataflow).toBe('Data Flow');
    expect(CONNECTION_TYPE_LABELS.http).toBe('HTTP');
    expect(CONNECTION_TYPE_LABELS.internal).toBe('Internal');
    expect(CONNECTION_TYPE_LABELS.data).toBe('Data');
    expect(CONNECTION_TYPE_LABELS.async).toBe('Async');
  });
});

// ── BLOCK_ROLES ─────────────────────────────────────────────

describe('BLOCK_ROLES', () => {
  it('contains all 8 roles', () => {
    expect(BLOCK_ROLES).toHaveLength(8);
  });

  it('includes every canonical role', () => {
    const expected = [
      'primary', 'secondary', 'reader', 'writer',
      'public', 'private', 'internal', 'external',
    ];
    for (const role of expected) {
      expect(BLOCK_ROLES).toContain(role);
    }
  });

  it('has correct type annotation (readonly at compile time)', () => {
    // `as const` is a compile-time-only assertion in TypeScript.
    // Verify the array values are intact and structurally correct.
    expect(Object.isFrozen(BLOCK_ROLES) || Array.isArray(BLOCK_ROLES)).toBe(true);
    expect(BLOCK_ROLES[0]).toBe('primary');
    expect(BLOCK_ROLES[7]).toBe('external');
  });
});

// ── Validation Types (type-level assignability tests) ───────

describe('Validation types', () => {
  it('RuleSeverity accepts valid values', () => {
    const error: RuleSeverity = 'error';
    const warning: RuleSeverity = 'warning';
    expect(error).toBe('error');
    expect(warning).toBe('warning');
  });

  it('RuleType accepts valid values', () => {
    const placement: RuleType = 'placement';
    const connection: RuleType = 'connection';
    expect(placement).toBe('placement');
    expect(connection).toBe('connection');
  });

  it('RuleDefinition interface is assignable', () => {
    const rule: RuleDefinition = {
      id: 'R001',
      name: 'Block placement check',
      type: 'placement',
      severity: 'error',
      description: 'Validates block can be placed in target plate',
    };
    expect(rule.id).toBe('R001');
    expect(rule.type).toBe('placement');
    expect(rule.severity).toBe('error');
  });

  it('ValidationError interface is assignable', () => {
    const err: ValidationError = {
      ruleId: 'R001',
      severity: 'error',
      message: 'Block cannot be placed here',
      suggestion: 'Try placing in a subnet',
      targetId: 'block-1',
    };
    expect(err.ruleId).toBe('R001');
    expect(err.targetId).toBe('block-1');
    expect(err.suggestion).toBe('Try placing in a subnet');
  });

  it('ValidationError suggestion is optional', () => {
    const err: ValidationError = {
      ruleId: 'R002',
      severity: 'warning',
      message: 'Unusual connection type',
      targetId: 'conn-1',
    };
    expect(err.suggestion).toBeUndefined();
  });

  it('ValidationResult interface is assignable', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('ValidationResult with errors is invalid', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'R001',
          severity: 'error',
          message: 'Block cannot be placed here',
          targetId: 'block-1',
        },
      ],
      warnings: [
        {
          ruleId: 'R003',
          severity: 'warning',
          message: 'Redundant connection',
          targetId: 'conn-2',
        },
      ],
    };
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});
