/**
 * Generate JSON Schema from TypeScript types.
 *
 * Usage: tsx scripts/generate-schema.ts
 *
 * Produces: dist/architecture-model.schema.json
 */

import { createGenerator } from 'ts-json-schema-generator';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const config = {
  path: resolve(root, 'src/index.ts'),
  tsconfig: resolve(root, 'tsconfig.json'),
  type: 'ArchitectureModel',
  skipTypeCheck: true,
};

const generator = createGenerator(config);
const schema = generator.createSchema(config.type);

const distDir = resolve(root, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const outputPath = resolve(distDir, 'architecture-model.schema.json');
writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n');

console.log(`Generated JSON Schema → ${outputPath}`);
