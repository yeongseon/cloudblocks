import type { ArchitectureModel } from './index';
import type { GeneratorId } from '../../features/generate/types';

// ─── Template Types (extracted from features/templates for FSD compliance) ──

export type TemplateCategory =
  | 'web-application'
  | 'serverless'
  | 'data-pipeline'
  | 'general';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  tags: string[];
  /** Compatible generator IDs (undefined = all generators) */
  generatorCompat?: GeneratorId[];
  /** The architecture snapshot to instantiate */
  architecture: Omit<ArchitectureModel, 'id' | 'createdAt' | 'updatedAt'>;
}

// ─── Marketplace Types (v1.0) ───────────────────────────────

export interface TemplateSource {
  /** GitHub repo (owner/repo) */
  repo: string;
  /** Path within the repo to the template JSON */
  path: string;
  /** Git ref (tag, branch, or commit SHA) */
  ref: string;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  tags: string[];
  /** Author (GitHub username or display name) */
  author: string;
  /** Minimum app version required */
  minAppVersion: string;
  /** Compatible generators */
  generatorCompat: GeneratorId[];
  /** Source location on GitHub */
  source: TemplateSource;
}

export interface MarketplaceManifest {
  /** Manifest schema version for forward compatibility */
  schemaVersion: number;
  /** Last updated ISO timestamp */
  updatedAt: string;
  /** Community template entries */
  templates: MarketplaceEntry[];
}
