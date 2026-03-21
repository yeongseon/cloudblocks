import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureTemplate } from '../../shared/types/template';

function makeTemplate(
  id: string,
  overrides: Partial<ArchitectureTemplate> = {}
): ArchitectureTemplate {
  return {
    id,
    name: `Template ${id}`,
    description: 'Base template description',
    category: 'general',
    difficulty: 'beginner',
    tags: ['base'],
    architecture: {
      name: `Architecture ${id}`,
      version: '1',
      nodes: [],
      connections: [],
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    },
    ...overrides,
  };
}

describe('template registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registerTemplate adds a template and getTemplate retrieves it', async () => {
    const { registerTemplate, getTemplate } = await import('./registry');

    const template = makeTemplate('registry-test-template-1');
    registerTemplate(template);

    expect(getTemplate(template.id)).toEqual(template);
  });

  it('getTemplate returns undefined for unknown id', async () => {
    const { getTemplate } = await import('./registry');

    expect(getTemplate('unknown-template-id')).toBeUndefined();
  });

  it('listTemplates returns all registered templates', async () => {
    const { registerTemplate, listTemplates } = await import('./registry');

    const templateA = makeTemplate('registry-test-template-2');
    const templateB = makeTemplate('registry-test-template-3');
    registerTemplate(templateA);
    registerTemplate(templateB);

    const listed = listTemplates();
    const listedIds = new Set(listed.map((template) => template.id));

    expect(listed).toHaveLength(2);
    expect(listedIds).toEqual(new Set([templateA.id, templateB.id]));
  });

  it('listTemplatesByCategory filters templates by category', async () => {
    const { registerTemplate, listTemplatesByCategory } = await import('./registry');

    const webTemplate = makeTemplate('registry-web-template', {
      category: 'web-application',
    });
    const dataTemplate = makeTemplate('registry-data-template', {
      category: 'data-pipeline',
    });
    registerTemplate(webTemplate);
    registerTemplate(dataTemplate);

    const webTemplates = listTemplatesByCategory('web-application');

    expect(webTemplates).toHaveLength(1);
    expect(webTemplates[0]?.id).toBe(webTemplate.id);
  });

});
