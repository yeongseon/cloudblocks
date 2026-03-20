import type { GeneratorId, GeneratorPlugin } from './types';

/**
 * Generator Plugin Registry (v1.0)
 *
 * Central registry for all IaC generators (Terraform, Bicep, Pulumi).
 * Generators self-register via registerGenerator() at import time.
 */

const registry = new Map<GeneratorId, GeneratorPlugin>();

export function registerGenerator(plugin: GeneratorPlugin): void {
  registry.set(plugin.id, plugin);
}

export function getGenerator(id: GeneratorId): GeneratorPlugin | undefined {
  return registry.get(id);
}
