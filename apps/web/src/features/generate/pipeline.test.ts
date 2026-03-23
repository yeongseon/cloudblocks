import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel, ContainerNode, LeafNode } from '@cloudblocks/schema';
import type { GeneratedOutput, GeneratedFile, GenerationOptions, GeneratorPlugin } from './types';
import { GenerationError, generateCode } from './pipeline';
import { registerGenerator } from './registry';

describe('pipeline', () => {
  const containerResourceTypeByLayer: Record<
    Exclude<ContainerNode['layer'], 'resource'>,
    ContainerNode['resourceType']
  > = {
    global: 'virtual_network',
    edge: 'virtual_network',
    region: 'virtual_network',
    zone: 'virtual_network',
    subnet: 'subnet',
  };

  function createContainer(
    overrides: Partial<ContainerNode> & { type?: ContainerNode['layer'] },
  ): ContainerNode {
    const layer = overrides.layer ?? overrides.type ?? 'subnet';
    return {
      id: 'container-1',
      name: 'Container',
      kind: 'container',
      layer,
      resourceType:
        containerResourceTypeByLayer[layer as Exclude<ContainerNode['layer'], 'resource'>],
      category: 'network',
      provider: 'azure',
      parentId: null,
      position: { x: 0, y: 0, z: 0 },
      size: { width: 8, height: 1, depth: 6 },
      metadata: {},
      ...overrides,
    };
  }

  function createResource(overrides: Partial<LeafNode>): LeafNode {
    return {
      id: 'resource-1',
      name: 'Resource',
      kind: 'resource',
      layer: 'resource',
      resourceType: 'web_compute',
      category: 'compute',
      provider: 'azure',
      parentId: 'sub-1',
      position: { x: 0, y: 0.5, z: 0 },
      metadata: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GenerationError', () => {
    it('should be an Error subclass', () => {
      const error = new GenerationError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have name "GenerationError"', () => {
      const error = new GenerationError('test message');
      expect(error.name).toBe('GenerationError');
    });

    it('should preserve message', () => {
      const message = 'test error message';
      const error = new GenerationError(message);
      expect(error.message).toBe(message);
    });
  });

  describe('generateCode (terraform)', () => {
    const validModel: ArchitectureModel = {
      id: 'arch-1',
      name: 'Test',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'VNet',
          layer: 'region',
          resourceType: 'virtual_network',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
        }),
        createContainer({
          id: 'sub-1',
          name: 'Public',
          layer: 'subnet',
          resourceType: 'subnet',
          parentId: 'net-1',
          position: { x: 0, y: 0.3, z: 0 },
          size: { width: 5, height: 0.2, depth: 8 },
        }),
        createResource({
          id: 'blk-1',
          name: 'WebApp',
          category: 'compute',
          resourceType: 'web_compute',
          parentId: 'sub-1',
          position: { x: 0, y: 0.5, z: 0 },
        }),
      ],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const validOptions: GenerationOptions = {
      provider: 'azure',
      mode: 'draft',
      projectName: 'test',
      region: 'eastus',
    };

    it('should return 3 files (main.tf, variables.tf, outputs.tf)', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      expect(result.files).toHaveLength(3);
      expect(result.files.map((f) => f.path)).toEqual(['main.tf', 'variables.tf', 'outputs.tf']);
    });

    it('should have all files with language "hcl"', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      result.files.forEach((file) => {
        expect(file.language).toBe('hcl');
      });
    });

    it('should set metadata.generator to "terraform"', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      expect(result.metadata.generator).toBe('terraform');
    });

    it('should set metadata.version to "1.0.0"', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      expect(result.metadata.version).toBe('1.0.0');
    });

    it('should set metadata.provider from options', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      expect(result.metadata.provider).toBe('azure');
    });

    it('should set metadata.generatedAt to current time in ISO format', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      expect(result.metadata.generatedAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should have content in all files', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });
      result.files.forEach((file) => {
        expect(file.content).toBeTruthy();
        expect(typeof file.content).toBe('string');
      });
    });

    it('should throw GenerationError with invalid model (edge on region without subnet)', () => {
      const invalidModel: ArchitectureModel = {
        id: 'arch-2',
        name: 'Invalid',
        version: '1',
        nodes: [
          createContainer({
            id: 'net-2',
            name: 'VNet',
            layer: 'region',
            resourceType: 'virtual_network',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
          }),
          createResource({
            id: 'blk-2',
            name: 'Gateway',
            category: 'edge',
            resourceType: 'load_balancer',
            parentId: 'net-2',
            position: { x: 0, y: 0.5, z: 0 },
          }),
        ],
        connections: [],
        endpoints: [],
        externalActors: [
          { id: 'ext-2', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(() => generateCode(invalidModel, { ...validOptions, generator: 'terraform' })).toThrow(
        GenerationError,
      );
    });

    it('should throw GenerationError with unknown provider', () => {
      const badOptions = JSON.parse(
        '{"provider":"oracle-cloud","mode":"draft","projectName":"test","region":"eastus"}',
      ) as GenerationOptions;

      expect(() => generateCode(validModel, { ...badOptions, generator: 'terraform' })).toThrow(
        GenerationError,
      );
      expect(() => generateCode(validModel, { ...badOptions, generator: 'terraform' })).toThrow(
        /Unknown provider/,
      );
    });
  });

  describe('generateCode', () => {
    const validModel: ArchitectureModel = {
      id: 'arch-generate-code-1',
      name: 'Test GenerateCode',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'VNet',
          layer: 'region',
          resourceType: 'virtual_network',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
        }),
        createContainer({
          id: 'sub-1',
          name: 'Public',
          layer: 'subnet',
          resourceType: 'subnet',
          parentId: 'net-1',
          position: { x: 0, y: 0.3, z: 0 },
          size: { width: 5, height: 0.2, depth: 8 },
        }),
        createResource({
          id: 'blk-1',
          name: 'WebApp',
          category: 'compute',
          resourceType: 'web_compute',
          parentId: 'sub-1',
          position: { x: 0, y: 0.5, z: 0 },
        }),
      ],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const validOptions: GenerationOptions = {
      provider: 'azure',
      mode: 'draft',
      projectName: 'test',
      region: 'eastus',
    };

    it('returns terraform files when generator is terraform', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'terraform' });

      expect(result.files.map((file) => file.path)).toEqual([
        'main.tf',
        'variables.tf',
        'outputs.tf',
      ]);
    });

    it('returns bicep files when generator is bicep', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'bicep' });

      expect(result.files.map((file) => file.path)).toEqual([
        'main.bicep',
        'parameters.bicepparam',
      ]);
    });

    it('returns pulumi files when generator is pulumi', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'pulumi' });

      expect(result.files.map((file) => file.path)).toEqual(['index.ts', 'Pulumi.yaml']);
    });

    it('throws GenerationError for unknown generator', () => {
      const badGeneratorOptions = JSON.parse(
        '{"provider":"azure","mode":"draft","projectName":"test","region":"eastus","generator":"cdk"}',
      ) as GenerationOptions;

      expect(() => generateCode(validModel, badGeneratorOptions)).toThrow(GenerationError);
      expect(() => generateCode(validModel, badGeneratorOptions)).toThrow(/Unknown generator/);
    });

    it('throws GenerationError for invalid architecture', () => {
      const invalidModel: ArchitectureModel = {
        id: 'arch-generate-code-2',
        name: 'Invalid Architecture',
        version: '1',
        nodes: [
          createContainer({
            id: 'net-2',
            name: 'VNet',
            layer: 'region',
            resourceType: 'virtual_network',
            parentId: null,
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
          }),
          createResource({
            id: 'db-1',
            name: 'Gateway',
            category: 'edge',
            resourceType: 'load_balancer',
            parentId: 'net-2',
            position: { x: 0, y: 0.5, z: 0 },
          }),
        ],
        connections: [],
        endpoints: [],
        externalActors: [
          { id: 'ext-2', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(() => generateCode(invalidModel, validOptions)).toThrow(GenerationError);
      expect(() => generateCode(invalidModel, validOptions)).toThrow(
        /Architecture has validation errors/,
      );
    });

    it('defaults to terraform when generator is undefined', () => {
      const result = generateCode(validModel, validOptions);

      expect(result.files.map((file) => file.path)).toEqual([
        'main.tf',
        'variables.tf',
        'outputs.tf',
      ]);
    });

    it('still validates Azure regions against Azure allowlist', () => {
      expect(() =>
        generateCode(validModel, {
          ...validOptions,
          provider: 'azure',
          region: 'not-an-azure-region',
          generator: 'terraform',
        }),
      ).toThrow(/Invalid Azure region/);
    });

    it('allows AWS region values outside Azure allowlist when generator is terraform', () => {
      const result = generateCode(validModel, {
        ...validOptions,
        provider: 'aws',
        region: 'moon-base-1',
        generator: 'terraform',
      });

      expect(result.metadata.provider).toBe('aws');
    });

    it('allows GCP region values outside Azure allowlist when generator is terraform', () => {
      const result = generateCode(validModel, {
        ...validOptions,
        provider: 'gcp',
        region: 'custom-gcp-region-1',
        generator: 'terraform',
      });

      expect(result.metadata.provider).toBe('gcp');
    });

    it('throws GenerationError when provider is not supported by selected generator', () => {
      expect(() =>
        generateCode(validModel, {
          ...validOptions,
          provider: 'aws',
          generator: 'bicep',
        }),
      ).toThrow(/does not support provider/);
    });
  });

  describe('generateCode plugin pipeline behavior', () => {
    const model: ArchitectureModel = {
      id: 'arch-plugin-1',
      name: 'Plugin Test',
      version: '1',
      nodes: [
        createContainer({
          id: 'net-1',
          name: 'VNet',
          layer: 'region',
          resourceType: 'virtual_network',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
        }),
      ],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-1', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const options: GenerationOptions = {
      provider: 'azure',
      mode: 'draft',
      projectName: 'plugin-test',
      region: 'eastus',
      generator: 'terraform',
    };

    function buildPlugin(overrides: Partial<GeneratorPlugin>): GeneratorPlugin {
      return {
        id: 'terraform',
        displayName: 'Test Terraform',
        supportedProviders: ['azure'],
        normalize: (arch) => ({ architecture: arch, resourceNames: new Map() }),
        generate: () => ({
          files: [{ path: 'main.tf', content: 'raw', language: 'hcl' }],
          metadata: {
            generator: 'test-generator',
            version: '1.0.0',
            provider: 'azure',
            generatedAt: '2025-01-01T00:00:00.000Z',
          },
        }),
        ...overrides,
      };
    }

    it('throws GenerationError when plugin.validate returns errors', () => {
      const plugin = buildPlugin({
        validate: () => [{ severity: 'error', message: 'plugin validation failed' }],
      });
      registerGenerator(plugin);

      expect(() => generateCode(model, options)).toThrow(GenerationError);
      expect(() => generateCode(model, options)).toThrow(/Generator validation failed/);
    });

    it('does not throw when plugin.validate returns warnings only', () => {
      const normalize = vi.fn((arch: ArchitectureModel) => ({
        architecture: arch,
        resourceNames: new Map(),
      }));
      const generate = vi.fn<() => GeneratedOutput>(() => ({
        files: [{ path: 'main.tf', content: 'ok', language: 'hcl' }],
        metadata: {
          generator: 'test-generator',
          version: '1.0.0',
          provider: 'azure',
          generatedAt: '2025-01-01T00:00:00.000Z',
        },
      }));
      const plugin = buildPlugin({
        validate: () => [{ severity: 'warning', message: 'warning only' }],
        normalize,
        generate,
      });
      registerGenerator(plugin);

      const result = generateCode(model, options);

      expect(result.files).toHaveLength(1);
      expect(normalize).toHaveBeenCalledTimes(1);
      expect(generate).toHaveBeenCalledTimes(1);
    });

    it('calls plugin.format when available', () => {
      const format = vi.fn((files: GeneratedFile[]) =>
        files.map((file) => ({ ...file, content: `${file.content}-formatted` })),
      );
      const plugin = buildPlugin({
        format,
        generate: () => ({
          files: [{ path: 'main.tf', content: 'content', language: 'hcl' }],
          metadata: {
            generator: 'test-generator',
            version: '1.0.0',
            provider: 'azure',
            generatedAt: '2025-01-01T00:00:00.000Z',
          },
        }),
      });
      registerGenerator(plugin);

      const result = generateCode(model, options);

      expect(format).toHaveBeenCalledTimes(1);
      expect(result.files[0].content).toBe('content-formatted');
    });

    it('returns raw output when plugin.format is not provided', () => {
      const plugin = buildPlugin({
        format: undefined,
        generate: () => ({
          files: [{ path: 'main.tf', content: 'raw-output', language: 'hcl' }],
          metadata: {
            generator: 'test-generator',
            version: '1.0.0',
            provider: 'azure',
            generatedAt: '2025-01-01T00:00:00.000Z',
          },
        }),
      });
      registerGenerator(plugin);

      const result = generateCode(model, options);

      expect(result.files[0].content).toBe('raw-output');
    });
  });
});
