import { describe, expect, it } from 'vitest';
import { resources } from './geometry';
import { destinationParent, firstAvailableInParent, validateStudyMove } from './movement';

const app = resources.find((node) => node.id === 'app');
if (!app) throw new Error('Missing fixture app');
const gateway = resources.find((node) => node.id === 'gateway');
if (!gateway) throw new Error('Missing fixture gateway');
const sql = resources.find((node) => node.id === 'sql');
if (!sql) throw new Error('Missing fixture SQL');

describe('same-parent study movement', () => {
  it('snaps an empty location while keeping the parent', () => {
    expect(validateStudyMove(gateway, { x: 5.2, z: 0.2 }, new Map())).toEqual({
      valid: true,
      position: { x: 5, z: 0, parentId: 'subnet-a' },
    });
  });

  it('rejects a parent-boundary escape', () => {
    expect(validateStudyMove(gateway, { x: 10, z: 0 }, new Map())).toEqual({
      valid: false,
      reason: 'boundary',
    });
  });

  it('rejects a root PaaS sibling overlap', () => {
    expect(validateStudyMove(app, { x: -28, z: 3 }, new Map())).toEqual({
      valid: false,
      reason: 'overlap',
    });
  });

  it('allows an already-overlapping resource to escape its invalid starting position', () => {
    const moved = new Map([['app', { x: -28, z: 3, parentId: null }]]);
    expect(validateStudyMove(app, { x: -21, z: 10 }, moved)).toEqual({
      valid: true,
      position: { x: -21, z: 10, parentId: null },
    });
  });

  it('assigns a free position when transferring to the other subnet', () => {
    expect(destinationParent({ x: 8, z: 1 })).toBe('subnet-b');
    const result = firstAvailableInParent(gateway, new Map(), 'subnet-b');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.position.parentId).toBe('subnet-b');
      expect(validateStudyMove(gateway, result.position, new Map(), 'subnet-b')).toEqual(result);
    }
  });

  it('rejects subnet placement of root PaaS', () => {
    expect(validateStudyMove(sql, { x: 0, z: 0 }, new Map(), 'subnet-b')).toEqual({
      valid: false,
      reason: 'parent',
    });
  });

  it('keeps hosted PaaS blocks outside the subnet study surfaces', () => {
    expect(validateStudyMove(app, { x: 0, z: 0 }, new Map(), 'subnet-a')).toEqual({
      valid: false,
      reason: 'parent',
    });
  });
});
