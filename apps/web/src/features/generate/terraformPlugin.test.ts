import { describe, expect, it } from 'vitest';

import { terraformPlugin } from './terraformPlugin';
import { azureProviderDefinition } from './provider';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { GenerationOptions } from './types';

const testArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test Architecture',
  version: '1',
  plates: [
    {
      id: 'plate-network',
      name: 'Core Network',
      type: 'region',
      parentId: null,
      children: ['plate-subnet'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 1, height: 1, depth: 1 },
      metadata: {},
    },
    {
      id: 'plate-subnet',
      name: 'Public Subnet',
      type: 'subnet',
      subnetAccess: 'public',
      parentId: 'plate-network',
      children: ['block-compute'],
      position: { x: 0, y: 0, z: 0 },
      size: { width: 1, height: 1, depth: 1 },
      metadata: {},
    },
  ],
  blocks: [
    {
      id: 'block-compute',
      name: 'Frontend',
      category: 'compute',
      placementId: 'plate-subnet',
      position: { x: 0, y: 0, z: 0 },
      metadata: {},
    },
  ],
  connections: [],
  externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const defaultOptions: GenerationOptions = {
  provider: 'azure',
  mode: 'draft',
  projectName: 'testproject',
  region: 'eastus',
};

describe('terraformPlugin', () => {
  it('has id terraform', () => {
    expect(terraformPlugin.id).toBe('terraform');
  });

  it('has display name Terraform (HCL)', () => {
    expect(terraformPlugin.displayName).toBe('Terraform (HCL)');
  });

  it('supports azure provider', () => {
    expect(terraformPlugin.supportedProviders).toEqual(['azure']);
  });

  it('filePlan returns main.tf, variables.tf, outputs.tf with hcl language', () => {
    const plan = terraformPlugin.filePlan?.(defaultOptions) ?? [];

    expect(plan).toEqual([
      { path: 'main.tf', language: 'hcl' },
      { path: 'variables.tf', language: 'hcl' },
      { path: 'outputs.tf', language: 'hcl' },
    ]);
  });

  it('normalize with simple architecture produces resourceNames map', () => {
    const normalized = terraformPlugin.normalize(testArchitecture, {
      provider: azureProviderDefinition,
      mode: 'draft',
    });

    expect(normalized.architecture).toBe(testArchitecture);
    expect(normalized.resourceNames.get('plate-network')).toBe('vnet_core_network');
    expect(normalized.resourceNames.get('plate-subnet')).toBe('subnet_public_subnet');
    expect(normalized.resourceNames.get('block-compute')).toBe('webapp_frontend');
  });

  it('generate produces 3 hcl files and terraform metadata', () => {
    const normalized = terraformPlugin.normalize(testArchitecture, {
      provider: azureProviderDefinition,
      mode: 'draft',
    });
    const output = terraformPlugin.generate(normalized, {
      provider: azureProviderDefinition,
      mode: 'draft',
      options: defaultOptions,
    });

    expect(output.files).toHaveLength(3);
    expect(output.files).toEqual([
      expect.objectContaining({ path: 'main.tf', language: 'hcl' }),
      expect.objectContaining({ path: 'variables.tf', language: 'hcl' }),
      expect.objectContaining({ path: 'outputs.tf', language: 'hcl' }),
    ]);
    expect(output.metadata.generator).toBe('terraform');
    expect(output.metadata.version).toBe('1.0.0');
    expect(output.metadata.provider).toBe('azure');
    expect(output.metadata.generatedAt).toEqual(expect.any(String));
  });

  it('main.tf content contains provider and resource blocks', () => {
    const normalized = terraformPlugin.normalize(testArchitecture, {
      provider: azureProviderDefinition,
      mode: 'draft',
    });
    const output = terraformPlugin.generate(normalized, {
      provider: azureProviderDefinition,
      mode: 'draft',
      options: defaultOptions,
    });
    const mainTf = output.files.find((file) => file.path === 'main.tf')?.content;

    expect(mainTf).toContain('terraform {');
    expect(mainTf).toContain('provider "azurerm" {');
    expect(mainTf).toContain('resource "azurerm_resource_group" "main"');
    expect(mainTf).toContain('resource "azurerm_virtual_network" "vnet_core_network"');
    expect(mainTf).toContain('resource "azurerm_subnet" "subnet_public_subnet"');
    expect(mainTf).toContain('resource "azurerm_linux_web_app" "webapp_frontend"');
  });
});
