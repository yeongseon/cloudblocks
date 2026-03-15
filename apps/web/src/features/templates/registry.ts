import type {
  ArchitectureTemplate,
  TemplateCategory,
  MarketplaceManifest,
  MarketplaceEntry,
} from '../../shared/types/template';

export type { ArchitectureTemplate, TemplateCategory, TemplateDifficulty } from '../../shared/types/template';
export type { MarketplaceManifest, MarketplaceEntry } from '../../shared/types/template';

const templateRegistry = new Map<string, ArchitectureTemplate>();

// ─── Built-in Template Registry ─────────────────────────────

export function registerTemplate(template: ArchitectureTemplate): void {
  templateRegistry.set(template.id, template);
}

export function getTemplate(id: string): ArchitectureTemplate | undefined {
  return templateRegistry.get(id);
}

export function listTemplates(): ArchitectureTemplate[] {
  return Array.from(templateRegistry.values());
}

export function listTemplatesByCategory(
  category: TemplateCategory
): ArchitectureTemplate[] {
  return listTemplates().filter((t) => t.category === category);
}

export function searchTemplates(query: string): ArchitectureTemplate[] {
  const q = query.toLowerCase();
  return listTemplates().filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

// ─── Marketplace Registry (v1.0) ────────────────────────────

let marketplaceManifest: MarketplaceManifest | null = null;

/**
 * Load a marketplace manifest (fetched from GitHub or bundled).
 * Replaces any previously loaded manifest.
 */
export function loadMarketplaceManifest(manifest: MarketplaceManifest): void {
  marketplaceManifest = manifest;
}

/**
 * Get the currently loaded marketplace manifest.
 */
export function getMarketplaceManifest(): MarketplaceManifest | null {
  return marketplaceManifest;
}

/**
 * List all marketplace entries.
 */
export function listMarketplaceEntries(): MarketplaceEntry[] {
  return marketplaceManifest?.templates ?? [];
}

/**
 * List marketplace entries filtered by category.
 */
export function listMarketplaceEntriesByCategory(
  category: TemplateCategory
): MarketplaceEntry[] {
  return listMarketplaceEntries().filter((e) => e.category === category);
}

/**
 * Search marketplace entries by query string.
 */
export function searchMarketplaceEntries(query: string): MarketplaceEntry[] {
  const q = query.toLowerCase();
  return listMarketplaceEntries().filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Clear the template registry and marketplace manifest.
 * Useful for testing.
 */
export function clearRegistry(): void {
  templateRegistry.clear();
  marketplaceManifest = null;
}
