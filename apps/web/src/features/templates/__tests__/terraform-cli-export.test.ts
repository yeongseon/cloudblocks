import { describe, expect, it } from 'vitest';
import { generateEndpointsForBlock } from '@cloudblocks/schema';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { registerBuiltinTemplates } from '../builtin';
import { listTemplates } from '../registry';
import { generateCode } from '../../generate/pipeline';

describe('built-in Terraform CLI fixtures', () => {
  it('exports all six templates via the production pipeline', async () => {
    registerBuiltinTemplates();
    const templates = listTemplates();
    expect(templates).toHaveLength(6);

    for (const template of templates) {
      const architecture: ArchitectureModel = {
        ...structuredClone(template.architecture),
        id: `cli-${template.id}`,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        endpoints: template.architecture.nodes.flatMap((node) =>
          generateEndpointsForBlock(node.id),
        ),
      };
      const output = generateCode(architecture, {
        provider: 'azure',
        mode: 'draft',
        generator: 'terraform',
        projectName: template.id,
        region: 'eastus',
      });
      expect(output.files.map((file) => file.path).sort()).toEqual([
        'main.tf',
        'outputs.tf',
        'variables.tf',
      ]);

      expect(output.files.every((file) => file.content.length > 0)).toBe(true);
    }
  });
});
