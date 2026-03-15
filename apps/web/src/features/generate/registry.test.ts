import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratorPlugin } from './types';

const mockPlugin: GeneratorPlugin = {
  id: 'terraform',
  displayName: 'Test Plugin',
  supportedProviders: ['azure'],
  normalize: vi.fn() as unknown as GeneratorPlugin['normalize'],
  generate: vi.fn() as unknown as GeneratorPlugin['generate'],
};

async function loadRegistry() {
  return import('./registry');
}

describe('generator registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registerGenerator adds a plugin and getGenerator retrieves it', async () => {
    const { registerGenerator, getGenerator } = await loadRegistry();

    registerGenerator(mockPlugin);

    expect(getGenerator('terraform')).toBe(mockPlugin);
  });

  it('getGenerator returns undefined for unknown id', async () => {
    const { getGenerator } = await loadRegistry();

    expect(getGenerator('pulumi')).toBeUndefined();
  });

  it('listGenerators returns all registered plugins', async () => {
    const { registerGenerator, listGenerators } = await loadRegistry();
    const bicepPlugin: GeneratorPlugin = {
      ...mockPlugin,
      id: 'bicep',
      displayName: 'Bicep Test Plugin',
    };

    registerGenerator(mockPlugin);
    registerGenerator(bicepPlugin);

    expect(listGenerators()).toEqual([mockPlugin, bicepPlugin]);
  });

  it('listGeneratorIds returns all registered ids', async () => {
    const { registerGenerator, listGeneratorIds } = await loadRegistry();
    const pulumiPlugin: GeneratorPlugin = {
      ...mockPlugin,
      id: 'pulumi',
      displayName: 'Pulumi Test Plugin',
    };

    registerGenerator(mockPlugin);
    registerGenerator(pulumiPlugin);

    expect(listGeneratorIds()).toEqual(['terraform', 'pulumi']);
  });

  it('registering with same id overwrites previous plugin', async () => {
    const { registerGenerator, getGenerator } = await loadRegistry();
    const replacementPlugin: GeneratorPlugin = {
      ...mockPlugin,
      id: 'terraform',
      displayName: 'Replacement Plugin',
    };

    registerGenerator(mockPlugin);
    registerGenerator(replacementPlugin);

    expect(getGenerator('terraform')).toBe(replacementPlugin);
  });

  it('registry starts empty when freshly imported after resetModules', async () => {
    const { listGenerators, listGeneratorIds } = await loadRegistry();

    expect(listGenerators()).toEqual([]);
    expect(listGeneratorIds()).toEqual([]);
  });
});
