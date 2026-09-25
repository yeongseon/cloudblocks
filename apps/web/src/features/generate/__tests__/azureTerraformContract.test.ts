import { describe, expect, it } from 'vitest';
import type { ResourceBlock } from '@cloudblocks/schema';
import { RESOURCE_DEFINITIONS } from '../../../shared/hooks/useTechTree';
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
