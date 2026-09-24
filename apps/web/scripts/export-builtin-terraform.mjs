import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'vite';
import { generateEndpointsForBlock } from '@cloudblocks/schema';

const outputRoot = process.env.CLOUDBLOCKS_TERRAFORM_OUTPUT;
if (!outputRoot) throw new Error('CLOUDBLOCKS_TERRAFORM_OUTPUT must be set');

// `terraform validate` checks schema shape only. It does not verify Azure naming,
// network constraints, service equivalence, or plan/apply permissions.

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { registerBuiltinTemplates } = await server.ssrLoadModule(
    '/src/features/templates/builtin.ts',
  );
  const { listTemplates } = await server.ssrLoadModule('/src/features/templates/registry.ts');
  const { generateCode } = await server.ssrLoadModule('/src/features/generate/pipeline.ts');
  registerBuiltinTemplates();
  const templates = listTemplates();
  if (templates.length !== 6)
    throw new Error(`Expected 6 built-in templates, got ${templates.length}`);

  for (const template of templates) {
    const architecture = {
      ...structuredClone(template.architecture),
      id: `cli-${template.id}`,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      endpoints: template.architecture.nodes.flatMap((node) => generateEndpointsForBlock(node.id)),
    };
    const output = generateCode(architecture, {
      provider: 'azure',
      mode: 'draft',
      generator: 'terraform',
      projectName: template.id,
      region: 'eastus',
    });
    const expected = ['main.tf', 'outputs.tf', 'variables.tf'];
    const actual = output.files.map((file) => file.path).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${template.id}: expected ${expected}, got ${actual}`);
    }
    const directory = join(outputRoot, template.id);
    await mkdir(directory, { recursive: true });
    for (const file of output.files) {
      if (!file.content.trim()) throw new Error(`${template.id}: empty ${file.path}`);
      await writeFile(join(directory, file.path), file.content);
    }
    console.info(`Exported ${template.id}`);
  }
} finally {
  await server.close();
}
