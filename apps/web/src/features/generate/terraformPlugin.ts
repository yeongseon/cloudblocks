import type { GeneratorPlugin } from './types';
import { GENERATOR_METADATA_VERSION } from './types';
import {
  normalize,
  generateMainTf,
  generateVariablesTf,
  generateOutputsTf,
  resolveTerraformBlockMapping,
} from './terraform';
import { isExternalResourceType } from '@cloudblocks/schema';

/**
 * Terraform Generator Plugin (v1.0)
 *
 * Wraps the existing terraform.ts pure functions as a GeneratorPlugin.
 * Generates main.tf, variables.tf, outputs.tf for Azure provider.
 */
export const terraformPlugin: GeneratorPlugin = {
  id: 'terraform',
  displayName: 'Terraform (HCL)',
  supportedProviders: ['azure', 'aws', 'gcp'],

  validate: (architecture, { provider }) =>
    architecture.nodes.flatMap((node) => {
      if (node.kind !== 'resource' || isExternalResourceType(node.resourceType)) {
        return [];
      }

      if (resolveTerraformBlockMapping(provider, node)) {
        return [];
      }

      return [
        {
          severity: 'error' as const,
          blockId: node.id,
          message: `${node.name} (${node.resourceType}) is not supported for ${provider.displayName} Terraform export.`,
        },
      ];
    }),

  filePlan: () => [
    { path: 'main.tf', language: 'hcl' },
    { path: 'variables.tf', language: 'hcl' },
    { path: 'outputs.tf', language: 'hcl' },
  ],

  normalize: (arch, ctx) => normalize(arch, ctx.provider),

  generate: (model, ctx) => {
    const mainTf = generateMainTf(model, ctx.provider, ctx.options);
    const variablesTf = generateVariablesTf(ctx.options, ctx.provider, model);
    const outputsTf = generateOutputsTf(model, ctx.provider, ctx.options);

    return {
      files: [
        { path: 'main.tf', content: mainTf, language: 'hcl' },
        { path: 'variables.tf', content: variablesTf, language: 'hcl' },
        { path: 'outputs.tf', content: outputsTf, language: 'hcl' },
      ],
      metadata: {
        generator: 'terraform',
        version: GENERATOR_METADATA_VERSION,
        provider: ctx.options.provider,
        generatedAt: new Date().toISOString(),
      },
    };
  },
};
