import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArchitectureModel, Plate, Block } from '@cloudblocks/schema';
import type { GeneratedOutput, GeneratedFile, GenerationOptions, GeneratorPlugin } from './types';
import { GenerationError, generateTerraform, terraformPipeline, generateCode } from './pipeline';
import { registerGenerator } from './registry';

describe('pipeline', () => {
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

  describe('generateTerraform', () => {
    const validModel: ArchitectureModel = {
      id: 'arch-1',
      name: 'Test',
      version: '1',
      plates: [
        {
          id: 'net-1',
          name: 'VNet',
          type: 'region',
          parentId: null,
          children: ['sub-1'],
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
          metadata: {},
        },
        {
          id: 'sub-1',
          name: 'Public',
          type: 'subnet',
          subnetAccess: 'public',
          parentId: 'net-1',
          children: ['blk-1'],
          position: { x: 0, y: 0.3, z: 0 },
          size: { width: 5, height: 0.2, depth: 8 },
          metadata: {},
        },
      ] as Plate[],
      blocks: [
        {
          id: 'blk-1',
          name: 'WebApp',
          category: 'compute',
          placementId: 'sub-1',
          position: { x: 0, y: 0.5, z: 0 },
          metadata: {},
        },
      ] as Block[],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
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
      const result = generateTerraform(validModel, validOptions);
      expect(result.files).toHaveLength(3);
      expect(result.files.map((f) => f.path)).toEqual([
        'main.tf',
        'variables.tf',
        'outputs.tf',
      ]);
    });

    it('should have all files with language "hcl"', () => {
      const result = generateTerraform(validModel, validOptions);
      result.files.forEach((file) => {
        expect(file.language).toBe('hcl');
      });
    });

    it('should set metadata.generator to "cloudblocks"', () => {
      const result = generateTerraform(validModel, validOptions);
      expect(result.metadata.generator).toBe('cloudblocks');
    });

    it('should set metadata.version to "1.0.0"', () => {
      const result = generateTerraform(validModel, validOptions);
      expect(result.metadata.version).toBe('1.0.0');
    });

    it('should set metadata.provider from options', () => {
      const result = generateTerraform(validModel, validOptions);
      expect(result.metadata.provider).toBe('azure');
    });

    it('should set metadata.generatedAt to current time in ISO format', () => {
      const result = generateTerraform(validModel, validOptions);
      expect(result.metadata.generatedAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should have content in all files', () => {
      const result = generateTerraform(validModel, validOptions);
      result.files.forEach((file) => {
        expect(file.content).toBeTruthy();
        expect(typeof file.content).toBe('string');
      });
    });

    it('should throw GenerationError with invalid model (database on public subnet)', () => {
      const invalidModel: ArchitectureModel = {
        id: 'arch-2',
        name: 'Invalid',
        version: '1',
        plates: [
          {
            id: 'net-2',
            name: 'VNet',
            type: 'region',
            parentId: null,
            children: ['sub-2'],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
          {
            id: 'sub-2',
            name: 'Public',
            type: 'subnet',
            subnetAccess: 'public',
            parentId: 'net-2',
            children: ['blk-2'],
            position: { x: 0, y: 0.3, z: 0 },
            size: { width: 5, height: 0.2, depth: 8 },
            metadata: {},
          },
        ] as Plate[],
        blocks: [
          {
            id: 'blk-2',
            name: 'Database',
            category: 'database',
            placementId: 'sub-2',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ] as Block[],
        connections: [],
        externalActors: [{ id: 'ext-2', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(() => generateTerraform(invalidModel, validOptions)).toThrow(
        GenerationError
      );
    });

    it('should throw GenerationError with unknown provider', () => {
      const badOptions = JSON.parse(
        '{"provider":"oracle-cloud","mode":"draft","projectName":"test","region":"eastus"}'
      ) as GenerationOptions;

      expect(() => generateTerraform(validModel, badOptions)).toThrow(
        GenerationError
      );
      expect(() => generateTerraform(validModel, badOptions)).toThrow(
        /Unknown provider/
      );
    });
  });

  describe('terraformPipeline', () => {
    it('should export a pipeline object', () => {
      expect(terraformPipeline).toBeDefined();
      expect(terraformPipeline).toHaveProperty('generate');
    });

    it('should have generate method that is a function', () => {
      expect(typeof terraformPipeline.generate).toBe('function');
    });

    it('generate method should be the same as generateTerraform', () => {
      const validModel: ArchitectureModel = {
        id: 'arch-1',
        name: 'Test',
        version: '1',
        plates: [
          {
            id: 'net-1',
            name: 'VNet',
            type: 'region',
            parentId: null,
            children: ['sub-1'],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
          {
            id: 'sub-1',
            name: 'Public',
            type: 'subnet',
            subnetAccess: 'public',
            parentId: 'net-1',
            children: ['blk-1'],
            position: { x: 0, y: 0.3, z: 0 },
            size: { width: 5, height: 0.2, depth: 8 },
            metadata: {},
          },
        ] as Plate[],
        blocks: [
          {
            id: 'blk-1',
            name: 'WebApp',
            category: 'compute',
            placementId: 'sub-1',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ] as Block[],
        connections: [],
        externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const validOptions: GenerationOptions = {
        provider: 'azure',
        mode: 'draft',
        projectName: 'test',
        region: 'eastus',
      };

      const pipelineResult = terraformPipeline.generate(validModel, validOptions);
      const functionResult = generateTerraform(validModel, validOptions);

      expect(pipelineResult.files).toEqual(functionResult.files);
      expect(pipelineResult.metadata).toEqual(functionResult.metadata);
    });
  });

  describe('generateCode', () => {
    const validModel: ArchitectureModel = {
      id: 'arch-generate-code-1',
      name: 'Test GenerateCode',
      version: '1',
      plates: [
        {
          id: 'net-1',
          name: 'VNet',
          type: 'region',
          parentId: null,
          children: ['sub-1'],
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
          metadata: {},
        },
        {
          id: 'sub-1',
          name: 'Public',
          type: 'subnet',
          subnetAccess: 'public',
          parentId: 'net-1',
          children: ['blk-1'],
          position: { x: 0, y: 0.3, z: 0 },
          size: { width: 5, height: 0.2, depth: 8 },
          metadata: {},
        },
      ] as Plate[],
      blocks: [
        {
          id: 'blk-1',
          name: 'WebApp',
          category: 'compute',
          placementId: 'sub-1',
          position: { x: 0, y: 0.5, z: 0 },
          metadata: {},
        },
      ] as Block[],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
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

      expect(result.files.map((file) => file.path)).toEqual(['main.tf', 'variables.tf', 'outputs.tf']);
    });

    it('returns bicep files when generator is bicep', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'bicep' });

      expect(result.files.map((file) => file.path)).toEqual(['main.bicep', 'parameters.bicepparam']);
    });

    it('returns pulumi files when generator is pulumi', () => {
      const result = generateCode(validModel, { ...validOptions, generator: 'pulumi' });

      expect(result.files.map((file) => file.path)).toEqual(['index.ts', 'Pulumi.yaml']);
    });

    it('throws GenerationError for unknown generator', () => {
      const badGeneratorOptions = JSON.parse(
        '{"provider":"azure","mode":"draft","projectName":"test","region":"eastus","generator":"cdk"}'
      ) as GenerationOptions;

      expect(() => generateCode(validModel, badGeneratorOptions)).toThrow(GenerationError);
      expect(() => generateCode(validModel, badGeneratorOptions)).toThrow(/Unknown generator/);
    });

    it('throws GenerationError for invalid architecture', () => {
      const invalidModel: ArchitectureModel = {
        id: 'arch-generate-code-2',
        name: 'Invalid Architecture',
        version: '1',
        plates: [
          {
            id: 'net-2',
            name: 'VNet',
            type: 'region',
            parentId: null,
            children: ['sub-2'],
            position: { x: 0, y: 0, z: 0 },
            size: { width: 12, height: 0.3, depth: 10 },
            metadata: {},
          },
          {
            id: 'sub-2',
            name: 'Public',
            type: 'subnet',
            subnetAccess: 'public',
            parentId: 'net-2',
            children: ['db-1'],
            position: { x: 0, y: 0.3, z: 0 },
            size: { width: 5, height: 0.2, depth: 8 },
            metadata: {},
          },
        ] as Plate[],
        blocks: [
          {
            id: 'db-1',
            name: 'Database',
            category: 'database',
            placementId: 'sub-2',
            position: { x: 0, y: 0.5, z: 0 },
            metadata: {},
          },
        ] as Block[],
        connections: [],
        externalActors: [{ id: 'ext-2', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(() => generateCode(invalidModel, validOptions)).toThrow(GenerationError);
      expect(() => generateCode(invalidModel, validOptions)).toThrow(/Architecture has validation errors/);
    });

    it('defaults to terraform when generator is undefined', () => {
      const result = generateCode(validModel, validOptions);

      expect(result.files.map((file) => file.path)).toEqual(['main.tf', 'variables.tf', 'outputs.tf']);
    });

    it('still validates Azure regions against Azure allowlist', () => {
      expect(() =>
        generateCode(validModel, {
          ...validOptions,
          provider: 'azure',
          region: 'not-an-azure-region',
          generator: 'terraform',
        })
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
        })
      ).toThrow(/does not support provider/);
    });
  });

  describe('generateCode plugin pipeline behavior', () => {
    const model: ArchitectureModel = {
      id: 'arch-plugin-1',
      name: 'Plugin Test',
      version: '1',
      plates: [
        {
          id: 'net-1',
          name: 'VNet',
          type: 'region',
          parentId: null,
          children: [],
          position: { x: 0, y: 0, z: 0 },
          size: { width: 12, height: 0.3, depth: 10 },
          metadata: {},
        },
      ] as Plate[],
      blocks: [],
      connections: [],
      externalActors: [{ id: 'ext-1', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
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
        files.map((file) => ({ ...file, content: `${file.content}-formatted` }))
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
