import type { ArchitectureTemplate, TemplateCategory } from '../../shared/types/template';

export type {
  ArchitectureTemplate,
  TemplateCategory,
  TemplateDifficulty,
} from '../../shared/types/template';

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

export function listTemplatesByCategory(category: TemplateCategory): ArchitectureTemplate[] {
  return listTemplates().filter((t) => t.category === category);
}
