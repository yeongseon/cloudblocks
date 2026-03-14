import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('registerBuiltinTemplates', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers exactly three builtin templates with expected ids', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { listTemplates } = await import('./registry');

    registerBuiltinTemplates();

    const templates = listTemplates();
    const ids = templates.map((template) => template.id).sort();

    expect(templates).toHaveLength(3);
    expect(ids).toEqual([
      'template-data-storage',
      'template-simple-compute',
      'template-three-tier',
    ]);
  });

  it('registers templates with valid architecture shape', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { listTemplates } = await import('./registry');

    registerBuiltinTemplates();

    for (const template of listTemplates()) {
      expect(Array.isArray(template.architecture.plates)).toBe(true);
      expect(Array.isArray(template.architecture.blocks)).toBe(true);
      expect(Array.isArray(template.architecture.connections)).toBe(true);
      expect(Array.isArray(template.architecture.externalActors)).toBe(true);
      expect(template.architecture.externalActors.length).toBeGreaterThan(0);
    }
  });

  it('three-tier template has expected plate/block/connection counts', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { getTemplate } = await import('./registry');

    registerBuiltinTemplates();

    const template = getTemplate('template-three-tier');

    expect(template).toBeDefined();
    expect(template?.architecture.plates).toHaveLength(3);
    expect(template?.architecture.blocks).toHaveLength(4);
    expect(template?.architecture.connections).toHaveLength(4);
  });

  it('simple compute template has expected plate/block/connection counts', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { getTemplate } = await import('./registry');

    registerBuiltinTemplates();

    const template = getTemplate('template-simple-compute');

    expect(template).toBeDefined();
    expect(template?.architecture.plates).toHaveLength(2);
    expect(template?.architecture.blocks).toHaveLength(2);
    expect(template?.architecture.connections).toHaveLength(2);
  });

  it('data storage template has expected plate/block/connection counts', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { getTemplate } = await import('./registry');

    registerBuiltinTemplates();

    const template = getTemplate('template-data-storage');

    expect(template).toBeDefined();
    expect(template?.architecture.plates).toHaveLength(3);
    expect(template?.architecture.blocks).toHaveLength(4);
    expect(template?.architecture.connections).toHaveLength(4);
  });
});
