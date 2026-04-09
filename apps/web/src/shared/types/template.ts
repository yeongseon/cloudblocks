import type { ArchitectureModel } from './index';
import type { GeneratorId } from './generator';

// ─── Template Types (extracted from features/templates for FSD compliance) ──

export type TemplateCategory = 'web-application' | 'serverless' | 'data-pipeline' | 'general';

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
