import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('uuid', () => ({
  v4: () => 'mocked-uuid-1234-5678-9012',
}));

import { generateId } from './id';

describe('generateId', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates ids for all supported entity types using {type}-{8chars} format', () => {
    const types = ['container', 'block', 'conn', 'ext', 'arch', 'ws'] as const;

    for (const type of types) {
      const id = generateId(type);
      expect(id).toBe(`${type}-mockeduu`);
      expect(id).toMatch(new RegExp(`^${type}-[a-z0-9]{8}$`));
    }
  });

  it('produces unique ids across calls', () => {
    const plateId = generateId('container');
    const blockId = generateId('block');
    const connId = generateId('conn');

    expect(plateId).not.toBe(blockId);
    expect(blockId).not.toBe(connId);
    expect(plateId).not.toBe(connId);
  });
});
