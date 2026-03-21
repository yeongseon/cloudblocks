import { describe, it, expect } from 'vitest';
import type { Block, BlockRole } from '@cloudblocks/schema';
import { BLOCK_ROLES } from '@cloudblocks/domain';
import { validateRoles } from './role';
import { makeTestBlock, type LegacyBlockOverrides } from '../../__tests__/legacyModelTestUtils';

function makeBlock(overrides: LegacyBlockOverrides = {}): Block {
  return makeTestBlock({
    id: 'block-1',
    name: 'Block One',
    category: 'compute',
    placementId: 'plate-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    ...overrides,
  });
}

describe('validateRoles', () => {
  it('returns null when block has no roles', () => {
    const block = makeBlock();
    expect(validateRoles(block)).toBeNull();
  });

  it('returns null when roles is empty array', () => {
    const block = makeBlock({ roles: [] });
    expect(validateRoles(block)).toBeNull();
  });

  it('returns null for a single valid role', () => {
    const block = makeBlock({ roles: ['primary'] });
    expect(validateRoles(block)).toBeNull();
  });

  it('returns null for all 8 valid roles combined', () => {
    const block = makeBlock({ roles: [...BLOCK_ROLES] as BlockRole[] });
    expect(validateRoles(block)).toBeNull();
  });

  it('returns null for multiple valid roles', () => {
    const block = makeBlock({ roles: ['public', 'reader'] });
    expect(validateRoles(block)).toBeNull();
  });

  it('returns error for invalid role value', () => {
    const block = makeBlock({
      id: 'b1',
      name: 'BadRole',
      roles: ['invalid-role' as BlockRole],
    });

    const result = validateRoles(block);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-role-invalid');
    expect(result!.severity).toBe('error');
    expect(result!.message).toContain('invalid-role');
    expect(result!.targetId).toBe('b1');
  });

  it('returns error listing all invalid roles', () => {
    const block = makeBlock({
      id: 'b2',
      name: 'MultiInvalid',
      roles: ['primary', 'bogus' as BlockRole, 'fake' as BlockRole],
    });

    const result = validateRoles(block);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-role-invalid');
    expect(result!.message).toContain('bogus');
    expect(result!.message).toContain('fake');
  });

  it('returns warning for duplicate roles', () => {
    const block = makeBlock({
      id: 'b3',
      name: 'DupeRole',
      roles: ['public', 'public'],
    });

    const result = validateRoles(block);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-role-duplicate');
    expect(result!.severity).toBe('warning');
    expect(result!.message).toContain('public');
    expect(result!.targetId).toBe('b3');
  });

  it('returns warning for multiple duplicate roles', () => {
    const block = makeBlock({
      id: 'b4',
      name: 'MultiDupe',
      roles: ['reader', 'writer', 'reader', 'writer'],
    });

    const result = validateRoles(block);
    expect(result).not.toBeNull();
    expect(result!.ruleId).toBe('rule-role-duplicate');
    expect(result!.message).toContain('reader');
    expect(result!.message).toContain('writer');
  });

  it('invalid role takes precedence over duplicates', () => {
    const block = makeBlock({
      roles: ['bad' as BlockRole, 'bad' as BlockRole],
    });

    const result = validateRoles(block);
    expect(result).not.toBeNull();
    // Invalid check happens before duplicate check
    expect(result!.ruleId).toBe('rule-role-invalid');
  });
});

describe('BLOCK_ROLES constant', () => {
  it('contains exactly 8 roles', () => {
    expect(BLOCK_ROLES).toHaveLength(8);
  });

  it('contains all spec-defined roles', () => {
    const expectedRoles: BlockRole[] = [
      'primary', 'secondary', 'reader', 'writer',
      'public', 'private', 'internal', 'external',
    ];
    expectedRoles.forEach((role) => {
      expect(BLOCK_ROLES).toContain(role);
    });
  });
});
