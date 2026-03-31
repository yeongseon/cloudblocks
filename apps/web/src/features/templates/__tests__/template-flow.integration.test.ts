import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchitectureModel } from '@cloudblocks/schema';
import { generateEndpointsForBlock } from '@cloudblocks/schema';
import type { ArchitectureTemplate } from '../registry';
import type { GeneratorId } from '../../generate/types';

/**
 * Template → Edit → Export Flow Integration Tests (#1484)
 *
 * Verifies that every built-in template can complete the full
 * Gate 6 flow: load template → architecture is valid → edit →
 * generate Terraform (and Bicep/Pulumi where compatible) → non-empty output.
 *
 * Pure pipeline tests — no DOM, no React, no RTL.
 */

const TEMPLATE_IDS = [
  'template-three-tier',
  'template-simple-compute',
  'template-data-storage',
  'template-serverless-http-api',
  'template-event-driven-pipeline',
  'template-full-stack-serverless',
] as const;

/**
 * Hydrate a template's partial architecture into a full ArchitectureModel.
 * Deep-clones the template architecture to avoid mutating the registry,
 * and generates endpoints for all nodes (as loadFromTemplate does in production).
 */
function hydrateArchitecture(template: ArchitectureTemplate): ArchitectureModel {
  const cloned = JSON.parse(JSON.stringify(template.architecture));
  const nodeIds = cloned.nodes.map((n: { id: string }) => n.id);
  cloned.endpoints = nodeIds.flatMap((id: string) => generateEndpointsForBlock(id));
  return {
    id: `test-${template.id}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...cloned,
  };
}

describe('template → edit → export flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('all templates load and have valid structure', () => {
    it('registry contains all 6 expected templates', async () => {
      const { registerBuiltinTemplates } = await import('../builtin');
      const { listTemplates } = await import('../registry');

      registerBuiltinTemplates();
      const templates = listTemplates();

      expect(templates).toHaveLength(6);

      const ids = templates.map((t) => t.id).sort();
      expect(ids).toEqual([...TEMPLATE_IDS].sort());
    });

    it.each(TEMPLATE_IDS)('%s has nodes, connections, and externalActors', async (templateId) => {
      const { registerBuiltinTemplates } = await import('../builtin');
      const { getTemplate } = await import('../registry');

      registerBuiltinTemplates();
      const template = getTemplate(templateId);

      expect(template).toBeDefined();
      expect(template!.architecture.nodes.length).toBeGreaterThan(0);
      expect(template!.architecture.connections.length).toBeGreaterThan(0);
      expect(template!.architecture.externalActors?.length).toBeGreaterThan(0);

      // Every template must have at least one container and one resource
      const containers = template!.architecture.nodes.filter((n) => n.kind === 'container');
      const resources = template!.architecture.nodes.filter((n) => n.kind === 'resource');
      expect(containers.length).toBeGreaterThanOrEqual(1);
      expect(resources.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('all templates pass architecture validation', () => {
    it.each(TEMPLATE_IDS)('%s passes validateArchitecture()', async (templateId) => {
      const { registerBuiltinTemplates } = await import('../builtin');
      const { getTemplate } = await import('../registry');
      const { validateArchitecture } = await import('../../../entities/validation/engine');

      registerBuiltinTemplates();
      const template = getTemplate(templateId)!;
      const architecture = hydrateArchitecture(template);

      const result = validateArchitecture(architecture);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Terraform generation produces non-trivial output for all templates', () => {
    it.each(TEMPLATE_IDS)(
      '%s generates valid Terraform with main.tf, variables.tf, outputs.tf',
      async (templateId) => {
        const { registerBuiltinTemplates } = await import('../builtin');
        const { getTemplate } = await import('../registry');
        const { generateCode } = await import('../../generate/pipeline');

        registerBuiltinTemplates();
        const template = getTemplate(templateId)!;
        const architecture = hydrateArchitecture(template);

        const output = generateCode(architecture, {
          provider: 'azure',
          mode: 'draft',
          projectName: `test-${templateId}`,
          region: 'eastus',
          generator: 'terraform',
        });

        // All three standard Terraform files must exist
        const mainTf = output.files.find((f) => f.path === 'main.tf');
        const variablesTf = output.files.find((f) => f.path === 'variables.tf');
        const outputsTf = output.files.find((f) => f.path === 'outputs.tf');

        expect(mainTf).toBeDefined();
        expect(variablesTf).toBeDefined();
        expect(outputsTf).toBeDefined();

        // main.tf must contain Azure provider and at least one resource block
        expect(mainTf!.content).toContain('provider "azurerm"');
        expect(mainTf!.content).toContain('resource "');
        expect(mainTf!.content.trim().length).toBeGreaterThan(100);

        // variables.tf must contain project_name variable
        expect(variablesTf!.content).toContain('variable "project_name"');

        // outputs.tf must have at least one output block
        expect(outputsTf!.content).toContain('output "');
      },
    );
  });

  describe('Bicep generation for compatible templates', () => {
    const bicepCompatible = [
      'template-serverless-http-api',
      'template-event-driven-pipeline',
      'template-full-stack-serverless',
    ] as const;

    it.each(bicepCompatible)('%s generates non-empty Bicep output', async (templateId) => {
      const { registerBuiltinTemplates } = await import('../builtin');
      const { getTemplate } = await import('../registry');
      const { generateCode } = await import('../../generate/pipeline');

      registerBuiltinTemplates();
      const template = getTemplate(templateId)!;

      expect(template.generatorCompat).toContain('bicep');

      const architecture = hydrateArchitecture(template);

      const output = generateCode(architecture, {
        provider: 'azure',
        mode: 'draft',
        projectName: `test-${templateId}`,
        region: 'eastus',
        generator: 'bicep',
      });

      expect(output.files.length).toBeGreaterThan(0);

      const mainFile = output.files.find((f) => f.path === 'main.bicep');
      expect(mainFile).toBeDefined();
      expect(mainFile!.content.trim().length).toBeGreaterThan(50);
    });
  });

  describe('Pulumi generation for compatible templates', () => {
    const pulumiCompatible = [
      'template-serverless-http-api',
      'template-event-driven-pipeline',
      'template-full-stack-serverless',
    ] as const;

    it.each(pulumiCompatible)('%s generates non-empty Pulumi output', async (templateId) => {
      const { registerBuiltinTemplates } = await import('../builtin');
      const { getTemplate } = await import('../registry');
      const { generateCode } = await import('../../generate/pipeline');

      registerBuiltinTemplates();
      const template = getTemplate(templateId)!;

      expect(template.generatorCompat).toContain('pulumi');

      const architecture = hydrateArchitecture(template);

      const output = generateCode(architecture, {
        provider: 'azure',
        mode: 'draft',
        projectName: `test-${templateId}`,
        region: 'eastus',
        generator: 'pulumi',
      });

      expect(output.files.length).toBeGreaterThan(0);

      const mainFile = output.files.find((f) => f.path === 'index.ts');
      expect(mainFile).toBeDefined();
      expect(mainFile!.content.trim().length).toBeGreaterThan(50);
    });
  });

  describe('templates support edit simulation (architecture mutation)', () => {
    it.each(TEMPLATE_IDS)(
      '%s: edited architecture validates and exports through all compatible generators',
      async (templateId) => {
        const { registerBuiltinTemplates } = await import('../builtin');
        const { getTemplate } = await import('../registry');
        const { generateCode } = await import('../../generate/pipeline');
        const { validateArchitecture } = await import('../../../entities/validation/engine');

        registerBuiltinTemplates();
        const template = getTemplate(templateId)!;

        // Deep-clone to avoid mutating the registry object
        const architecture = hydrateArchitecture(template);

        // Find the first subnet container to add a resource into
        const subnet = architecture.nodes.find(
          (n) => n.kind === 'container' && n.layer === 'subnet',
        );
        expect(subnet).toBeDefined();

        const newBlockId = 'block-test-edit';
        const newBlockEndpoints = generateEndpointsForBlock(newBlockId);

        // Simulate an edit: add a new blob-storage resource block
        const editedArchitecture: ArchitectureModel = {
          ...architecture,
          nodes: [
            ...architecture.nodes,
            {
              id: newBlockId,
              name: 'Test Storage',
              kind: 'resource',
              layer: 'resource' as const,
              resourceType: 'blob-storage',
              category: 'data' as const,
              provider: 'azure' as const,
              subtype: 'blob-storage',
              parentId: subnet!.id,
              position: { x: 0, y: 0.5, z: 0 },
              metadata: {},
            },
          ],
          // Generate endpoints for the new block alongside existing ones
          endpoints: [...architecture.endpoints, ...newBlockEndpoints],
        };

        // Verify endpoints were generated for the new block (6 per block)
        expect(editedArchitecture.endpoints.length).toBe(architecture.endpoints.length + 6);
        expect(editedArchitecture.endpoints.filter((ep) => ep.blockId === newBlockId)).toHaveLength(
          6,
        );

        // The edited architecture must pass validation
        const validationResult = validateArchitecture(editedArchitecture);
        expect(validationResult.valid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);

        // Export through all compatible generators
        const generators: GeneratorId[] = ['terraform'];
        if (template.generatorCompat) {
          for (const gen of template.generatorCompat) {
            if (!generators.includes(gen)) {
              generators.push(gen);
            }
          }
        }

        for (const generator of generators) {
          const output = generateCode(editedArchitecture, {
            provider: 'azure',
            mode: 'draft',
            projectName: `test-edit-${templateId}`,
            region: 'eastus',
            generator,
          });

          expect(output.files.length).toBeGreaterThan(0);
          expect(output.files.some((f) => f.content.trim().length > 0)).toBe(true);
        }

        // Terraform-specific: the new storage resource should appear in the output
        const tfOutput = generateCode(editedArchitecture, {
          provider: 'azure',
          mode: 'draft',
          projectName: `test-edit-${templateId}`,
          region: 'eastus',
          generator: 'terraform',
        });
        const mainTf = tfOutput.files.find((f) => f.path === 'main.tf');
        expect(mainTf).toBeDefined();
        expect(mainTf!.content).toContain('test_storage');
      },
    );
  });

  describe('all generators for all compatible templates', () => {
    it.each(TEMPLATE_IDS)(
      '%s produces output for every compatible generator',
      async (templateId) => {
        const { registerBuiltinTemplates } = await import('../builtin');
        const { getTemplate } = await import('../registry');
        const { generateCode } = await import('../../generate/pipeline');

        registerBuiltinTemplates();
        const template = getTemplate(templateId)!;
        const architecture = hydrateArchitecture(template);

        // Terraform is always compatible
        const generators: GeneratorId[] = ['terraform'];
        if (template.generatorCompat) {
          for (const gen of template.generatorCompat) {
            if (!generators.includes(gen)) {
              generators.push(gen);
            }
          }
        }

        for (const generator of generators) {
          const output = generateCode(architecture, {
            provider: 'azure',
            mode: 'draft',
            projectName: `test-compat-${templateId}`,
            region: 'eastus',
            generator,
          });

          expect(output.files.length).toBeGreaterThan(0);
          expect(output.files.some((f) => f.content.trim().length > 0)).toBe(true);
        }
      },
    );
  });
});
