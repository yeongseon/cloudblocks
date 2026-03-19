import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ArchitectureTemplate,
  MarketplaceManifest,
  MarketplaceEntry,
} from '../../shared/types/template';

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
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
    },
    ...overrides,
  };
}

function makeMarketplaceEntry(
  id: string,
  overrides: Partial<MarketplaceEntry> = {}
): MarketplaceEntry {
  return {
    id,
    name: `Marketplace ${id}`,
    description: 'Test marketplace entry',
    category: 'general',
    difficulty: 'beginner',
    tags: ['test'],
    author: 'testuser',
    minAppVersion: '1.0.0',
    generatorCompat: ['terraform'],
    source: { repo: 'test/repo', path: 'template.json', ref: 'v1.0.0' },
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

describe('marketplace registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loadMarketplaceManifest loads manifest and getMarketplaceManifest returns it', async () => {
    const { loadMarketplaceManifest, getMarketplaceManifest } = await import('./registry');

    const manifest: MarketplaceManifest = {
      schemaVersion: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      templates: [makeMarketplaceEntry('mp-1')],
    };

    loadMarketplaceManifest(manifest);

    expect(getMarketplaceManifest()).toEqual(manifest);
  });

  it('getMarketplaceManifest returns null when nothing loaded', async () => {
    const { getMarketplaceManifest } = await import('./registry');

    expect(getMarketplaceManifest()).toBeNull();
  });

  it('listMarketplaceEntries returns all entries from manifest', async () => {
    const { loadMarketplaceManifest, listMarketplaceEntries } = await import('./registry');

    const entry1 = makeMarketplaceEntry('mp-1');
    const entry2 = makeMarketplaceEntry('mp-2');
    loadMarketplaceManifest({
      schemaVersion: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      templates: [entry1, entry2],
    });

    const listed = listMarketplaceEntries();
    const listedIds = new Set(listed.map((entry) => entry.id));

    expect(listed).toHaveLength(2);
    expect(listedIds).toEqual(new Set([entry1.id, entry2.id]));
  });

  it('listMarketplaceEntries returns empty array when no manifest loaded', async () => {
    const { listMarketplaceEntries } = await import('./registry');

    expect(listMarketplaceEntries()).toEqual([]);
  });

  it('listMarketplaceEntriesByCategory filters by category', async () => {
    const { loadMarketplaceManifest, listMarketplaceEntriesByCategory } = await import('./registry');

    loadMarketplaceManifest({
      schemaVersion: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      templates: [
        makeMarketplaceEntry('mp-serverless', { category: 'serverless' }),
        makeMarketplaceEntry('mp-general', { category: 'general' }),
      ],
    });

    const filtered = listMarketplaceEntriesByCategory('serverless');

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('mp-serverless');
  });

  it('searchMarketplaceEntries finds matches in name, description, tags', async () => {
    const { loadMarketplaceManifest, searchMarketplaceEntries } = await import('./registry');

    loadMarketplaceManifest({
      schemaVersion: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      templates: [
        makeMarketplaceEntry('mp-name', { name: 'Serverless Starter' }),
        makeMarketplaceEntry('mp-desc', { description: 'Pipeline starter template' }),
        makeMarketplaceEntry('mp-tags', { tags: ['starter', 'event'] }),
        makeMarketplaceEntry('mp-other', { name: 'Unrelated' }),
      ],
    });

    const results = searchMarketplaceEntries('starter');
    const resultIds = new Set(results.map((entry) => entry.id));

    expect(results).toHaveLength(3);
    expect(resultIds).toEqual(new Set(['mp-name', 'mp-desc', 'mp-tags']));
  });

  it('clearRegistry clears both templates and marketplace manifest', async () => {
    const {
      clearRegistry,
      registerTemplate,
      listTemplates,
      loadMarketplaceManifest,
      getMarketplaceManifest,
      listMarketplaceEntries,
    } = await import('./registry');

    registerTemplate(makeTemplate('template-clear-1'));
    loadMarketplaceManifest({
      schemaVersion: 1,
      updatedAt: '2026-01-01T00:00:00Z',
      templates: [makeMarketplaceEntry('mp-clear-1')],
    });

    clearRegistry();

    expect(listTemplates()).toEqual([]);
    expect(getMarketplaceManifest()).toBeNull();
    expect(listMarketplaceEntries()).toEqual([]);
  });
});
