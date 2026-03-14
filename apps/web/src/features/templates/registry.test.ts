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
      plates: [],
      blocks: [],
      connections: [],
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' }],
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

  it('searchTemplates finds matches in name, description, and tags', async () => {
    const { registerTemplate, searchTemplates } = await import('./registry');

    registerTemplate(
      makeTemplate('registry-search-name', {
        name: 'Three Layer Service',
      })
    );
    registerTemplate(
      makeTemplate('registry-search-description', {
        description: 'A compact three node deployment',
      })
    );
    registerTemplate(
      makeTemplate('registry-search-tags', {
        tags: ['starter', 'three-tier'],
      })
    );
    registerTemplate(makeTemplate('registry-search-unrelated', { name: 'Unrelated' }));

    const results = searchTemplates('three');
    const resultIds = new Set(results.map((template) => template.id));

    expect(results).toHaveLength(3);
    expect(resultIds).toEqual(
      new Set([
        'registry-search-name',
        'registry-search-description',
        'registry-search-tags',
      ])
    );
  });

  it('searchTemplates is case-insensitive', async () => {
    const { registerTemplate, searchTemplates } = await import('./registry');

    registerTemplate(
      makeTemplate('registry-search-case', {
        name: 'Three Tier Case Match',
      })
    );

    const upper = searchTemplates('THREE');
    const mixed = searchTemplates('ThReE');

    expect(upper.map((template) => template.id)).toContain('registry-search-case');
    expect(mixed.map((template) => template.id)).toContain('registry-search-case');
  });
});
