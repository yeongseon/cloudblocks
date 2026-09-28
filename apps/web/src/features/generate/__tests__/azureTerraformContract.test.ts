import { beforeEach, describe, expect, it } from 'vitest';
import type { ResourceBlock } from '@cloudblocks/schema';
import { getAllowedParents } from '@cloudblocks/schema';
import { RESOURCE_DEFINITIONS, type ResourceType } from '../../../shared/hooks/useTechTree';
import { remapSubtype } from '../../../shared/utils/providerMapping';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { resolveTerraformBlockMapping } from '../terraform';
import { azureProviderDefinition } from '../provider';

const supportedPaletteResourceTypes = new Map([
  ['storage', 'azurerm_storage_account'],
  ['sql', 'azurerm_mssql_database'],
  ['function', 'azurerm_linux_function_app'],
  ['queue', 'azurerm_servicebus_namespace'],
  ['monitor', 'azurerm_monitor_workspace'],
  ['app-service', 'azurerm_linux_web_app'],
  ['cosmos-db', 'azurerm_cosmosdb_account'],
  ['managed-identity', 'azurerm_user_assigned_identity'],
  ['vm', 'azurerm_linux_virtual_machine'],
  ['nsg', 'azurerm_network_security_group'],
  ['app-gateway', 'azurerm_application_gateway'],
]);

function makePaletteBlock(
  paletteId: keyof typeof RESOURCE_DEFINITIONS,
  subtype?: string,
): ResourceBlock {
  const definition = RESOURCE_DEFINITIONS[paletteId];
  if (!definition.blockCategory) {
    throw new Error(`${paletteId} is not a resource block`);
  }

  return {
    id: `block-${paletteId}`,
    name: definition.label,
    kind: 'resource',
    layer: 'resource',
    resourceType: definition.schemaResourceType,
    category: definition.blockCategory,
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
    subtype,
  };
}

describe('Azure Terraform palette contract', () => {
  it('resolves every supported palette resource by canonical resourceType', () => {
    for (const [paletteId, expectedTerraformType] of supportedPaletteResourceTypes) {
      const definition = RESOURCE_DEFINITIONS[paletteId as keyof typeof RESOURCE_DEFINITIONS];
      const withoutSubtype = makePaletteBlock(
        paletteId as keyof typeof RESOURCE_DEFINITIONS,
        undefined,
      );
      const misleadingSubtype = makePaletteBlock(
        paletteId as keyof typeof RESOURCE_DEFINITIONS,
        'unknown-or-stale-subtype',
      );

      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, withoutSubtype)?.resourceType,
      ).toBe(expectedTerraformType);
      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, misleadingSubtype)?.resourceType,
      ).toBe(expectedTerraformType);
      expect(definition.schemaResourceType).toBe(withoutSubtype.resourceType);
    }
  });

  it('marks every other palette resource explicitly unsupported', () => {
    for (const definition of Object.values(RESOURCE_DEFINITIONS)) {
      if (
        definition.category === 'foundation' ||
        supportedPaletteResourceTypes.has(definition.id)
      ) {
        continue;
      }

      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, makePaletteBlock(definition.id)),
        definition.label,
      ).toBeUndefined();
    }
  });

  it('never lets subtype change canonical service identity', () => {
    const sql = makePaletteBlock('sql', 'redis-cache');
    const functions = makePaletteBlock('function', 'app-service');

    expect(resolveTerraformBlockMapping(azureProviderDefinition, sql)?.resourceType).toBe(
      'azurerm_mssql_database',
    );
    expect(resolveTerraformBlockMapping(azureProviderDefinition, functions)?.resourceType).toBe(
      'azurerm_linux_function_app',
    );
  });
});

/**
 * Production-path contract.
 *
 * The suite above builds blocks directly from `schemaResourceType`. That is the
 * identity the store is *supposed* to hold, but until #1963 the palette →
 * `addNode` path stored the provider alias instead, so a resolver that only
 * accepted canonical keys reported supported resources as unsupported while
 * these tests stayed green. These cases go through the real store actions.
 */
describe('Azure Terraform palette contract — production path', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
  });

  function createContainers(): { vnetId: string; subnetId: string } {
    const store = useArchitectureStore.getState();
    store.addNode({
      kind: 'container',
      resourceType: 'virtual_network',
      name: 'VNet',
      parentId: null,
      layer: 'region',
    });

    const vnetId = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find(
        (node) => node.kind === 'container' && node.layer === 'region',
      )!.id;

    useArchitectureStore.getState().addNode({
      kind: 'container',
      resourceType: 'subnet',
      name: 'Subnet',
      parentId: vnetId,
      layer: 'subnet',
    });

    const subnetId = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find(
        (node) => node.kind === 'container' && node.layer === 'subnet',
      )!.id;

    return { vnetId, subnetId };
  }

  /** Mirror of SidebarPalette.handleCreate. */
  function createFromPalette(paletteId: ResourceType): ResourceBlock {
    const definition = RESOURCE_DEFINITIONS[paletteId];
    const containers = createContainers();
    const allowedParents = getAllowedParents(definition.schemaResourceType) ?? [];
    const parentId = allowedParents.includes('subnet')
      ? containers.subnetId
      : allowedParents.includes('virtual_network')
        ? containers.vnetId
        : null;

    const before = new Set(
      useArchitectureStore.getState().workspace.architecture.nodes.map((node) => node.id),
    );

    useArchitectureStore.getState().addNode({
      kind: 'resource',
      resourceType: definition.schemaResourceType,
      name: definition.label,
      parentId,
      provider: 'azure',
      subtype: remapSubtype(definition.azureSubtype ?? definition.schemaResourceType, 'azure'),
    });

    const created = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find((node) => !before.has(node.id));

    expect(created, `addNode created no block for "${paletteId}"`).toBeDefined();
    return created as ResourceBlock;
  }

  it.each([...supportedPaletteResourceTypes])(
    'resolves palette-created "%s" to %s',
    (paletteId, expectedTerraformType) => {
      const block = createFromPalette(paletteId as ResourceType);

      expect(resolveTerraformBlockMapping(azureProviderDefinition, block)?.resourceType).toBe(
        expectedTerraformType,
      );
    },
  );

  it('reports every other palette-created resource as unsupported', () => {
    for (const definition of Object.values(RESOURCE_DEFINITIONS)) {
      if (
        definition.category === 'foundation' ||
        supportedPaletteResourceTypes.has(definition.id)
      ) {
        continue;
      }

      const block = createFromPalette(definition.id);

      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, block),
        definition.label,
      ).toBeUndefined();
    }
  });
});

describe('Azure Terraform mapping lookup hardening', () => {
  it('does not resolve inherited object members as supported services', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
      const block: ResourceBlock = {
        id: `block-${name}`,
        name: 'Malformed',
        kind: 'resource',
        layer: 'resource',
        resourceType: name,
        category: 'compute',
        provider: 'azure',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      };

      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, block),
        `"${name}" resolved to a Terraform resource`,
      ).toBeUndefined();
    }
  });

  it('rejects provider aliases so a model that lost canonical identity cannot export', () => {
    for (const alias of ['vm', 'nsg', 'azure-monitor', 'managed-identity', 'app-service']) {
      const block: ResourceBlock = {
        id: `block-${alias}`,
        name: 'Alias',
        kind: 'resource',
        layer: 'resource',
        resourceType: alias,
        category: 'compute',
        provider: 'azure',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
      };

      expect(
        resolveTerraformBlockMapping(azureProviderDefinition, block),
        `alias "${alias}" resolved to a Terraform resource`,
      ).toBeUndefined();
    }
  });
});
