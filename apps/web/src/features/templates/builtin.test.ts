import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('registerBuiltinTemplates', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers exactly six builtin templates with expected ids', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { listTemplates } = await import('./registry');

    registerBuiltinTemplates();

    const templates = listTemplates();
    const ids = templates.map((template) => template.id).sort();

    expect(templates).toHaveLength(6);
    expect(ids).toEqual([
      'template-data-storage',
      'template-event-driven-pipeline',
      'template-full-stack-serverless',
      'template-serverless-http-api',
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

  it('serverless templates have generator compatibility and expected counts', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { getTemplate } = await import('./registry');

    registerBuiltinTemplates();

    const httpApiTemplate = getTemplate('template-serverless-http-api');
    const eventPipelineTemplate = getTemplate('template-event-driven-pipeline');

    expect(httpApiTemplate).toBeDefined();
    expect(httpApiTemplate?.generatorCompat).toEqual(['terraform', 'bicep', 'pulumi']);
    expect(httpApiTemplate?.architecture.plates).toHaveLength(3);
    expect(httpApiTemplate?.architecture.blocks).toHaveLength(4);
    expect(httpApiTemplate?.architecture.connections).toHaveLength(4);

    expect(eventPipelineTemplate).toBeDefined();
    expect(eventPipelineTemplate?.generatorCompat).toEqual(['terraform', 'bicep', 'pulumi']);
    expect(eventPipelineTemplate?.architecture.plates).toHaveLength(2);
    expect(eventPipelineTemplate?.architecture.blocks).toHaveLength(6);
    expect(eventPipelineTemplate?.architecture.connections).toHaveLength(6);
  });

  it('full-stack serverless template uses all block categories with expected counts', async () => {
    const { registerBuiltinTemplates } = await import('./builtin');
    const { getTemplate } = await import('./registry');

    registerBuiltinTemplates();

    const template = getTemplate('template-full-stack-serverless');

    expect(template).toBeDefined();
    expect(template?.generatorCompat).toEqual(['terraform', 'bicep', 'pulumi']);
    expect(template?.architecture.plates).toHaveLength(3);
    expect(template?.architecture.blocks).toHaveLength(10);
    expect(template?.architecture.connections).toHaveLength(11);
    expect(template?.architecture.externalActors).toHaveLength(1);

    const categories = template?.architecture.blocks.map((b) => b.category).sort();
    expect(categories).toEqual([
      'compute', 'database', 'event', 'function', 'function', 'function',
      'gateway', 'queue', 'storage', 'timer',
    ]);
  });
});
