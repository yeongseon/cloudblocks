import { describe, it, expect, beforeEach } from 'vitest';
import { RESOURCE_RULES, getAllowedParents } from '@cloudblocks/schema';
import type { ProviderType } from '@cloudblocks/schema';

import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { RESOURCE_DEFINITIONS, type ResourceType } from '../../../shared/hooks/useTechTree';
import { remapSubtype } from '../../../shared/utils/providerMapping';
import { resolveBlockPresentation } from '../../../shared/presentation/blockPresentation';
import { serialize, deserialize } from '../../../shared/types/schema';
import { validateArchitecture } from '../../../entities/validation/engine';

/**
 * Production-path contract for #1963.
 *
 * Earlier tests built blocks by hand with a canonical `resourceType`, which hid
 * the fact that the real palette → `addNode` → store path stored the provider
 * alias instead. Every assertion here goes through the same store actions the
 * editor uses.
 */

const PALETTE_RESOURCES = (Object.keys(RESOURCE_DEFINITIONS) as ResourceType[]).filter(
  (type) => RESOURCE_DEFINITIONS[type].category !== 'foundation',
);

const PROVIDERS: ProviderType[] = ['azure', 'aws', 'gcp'];

function resetStore(): void {
  useArchitectureStore.getState().resetWorkspace();
}

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

/** Mirror of useTechTree.getTargetPlateId — rule-driven parent selection. */
function targetParentFor(
  type: ResourceType,
  containers: { vnetId: string; subnetId: string },
): string | null {
  const allowedParents = getAllowedParents(RESOURCE_DEFINITIONS[type].schemaResourceType) ?? [];
  if (allowedParents.includes('subnet')) return containers.subnetId;
  if (allowedParents.includes('virtual_network')) return containers.vnetId;
  return null;
}

/** Mirror of SidebarPalette.handleCreate — the only supported creation entry point. */
function createFromPalette(
  type: ResourceType,
  parentId: string | null,
  provider: ProviderType,
): string {
  const definition = RESOURCE_DEFINITIONS[type];
  const before = new Set(
    useArchitectureStore.getState().workspace.architecture.nodes.map((n) => n.id),
  );

  useArchitectureStore.getState().addNode({
    kind: 'resource',
    resourceType: definition.schemaResourceType,
    name: definition.label,
    parentId,
    provider,
    subtype: remapSubtype(definition.azureSubtype ?? definition.schemaResourceType, provider),
  });

  const created = useArchitectureStore
    .getState()
    .workspace.architecture.nodes.find((node) => !before.has(node.id));

  expect(created, `addNode created no block for palette type "${type}"`).toBeDefined();
  return created!.id;
}

describe('#1963 canonical resource identity — palette production path', () => {
  beforeEach(() => {
    resetStore();
  });

  it('covers every non-foundation palette resource', () => {
    expect(PALETTE_RESOURCES).toHaveLength(26);
  });

  it.each(PALETTE_RESOURCES)('stores canonical resourceType for "%s"', (type) => {
    const definition = RESOURCE_DEFINITIONS[type];
    const containers = createContainers();
    const blockId = createFromPalette(type, targetParentFor(type, containers), 'azure');
    const block = useArchitectureStore.getState().nodeById.get(blockId)!;

    expect(block.resourceType).toBe(definition.schemaResourceType);
    expect(block.resourceType in RESOURCE_RULES).toBe(true);
    expect(block.subtype).toBe(definition.azureSubtype ?? definition.schemaResourceType);
  });

  it.each(PROVIDERS)(
    'keeps resourceType canonical and only remaps subtype for provider "%s"',
    (provider) => {
      const containers = createContainers();

      for (const type of PALETTE_RESOURCES) {
        const definition = RESOURCE_DEFINITIONS[type];
        const blockId = createFromPalette(type, targetParentFor(type, containers), provider);
        const block = useArchitectureStore.getState().nodeById.get(blockId)!;

        expect(block.resourceType).toBe(definition.schemaResourceType);
        expect(block.subtype).toBe(
          remapSubtype(definition.azureSubtype ?? definition.schemaResourceType, provider),
        );
      }
    },
  );

  it('generates endpoints for every palette-created block', () => {
    const containers = createContainers();

    for (const type of PALETTE_RESOURCES) {
      const blockId = createFromPalette(type, targetParentFor(type, containers), 'azure');

      const endpoints = useArchitectureStore
        .getState()
        .workspace.architecture.endpoints.filter((endpoint) => endpoint.blockId === blockId);

      expect(endpoints, `no endpoints generated for "${type}"`).toHaveLength(6);
    }
  });

  it('generates endpoints and keeps canonical identity when duplicating a block', () => {
    const containers = createContainers();
    const sourceId = createFromPalette('vm', targetParentFor('vm', containers), 'azure');

    const before = new Set(
      useArchitectureStore.getState().workspace.architecture.nodes.map((n) => n.id),
    );
    useArchitectureStore.getState().duplicateBlock(sourceId);

    const duplicate = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find((node) => !before.has(node.id));

    expect(duplicate).toBeDefined();
    expect(duplicate!.resourceType).toBe('virtual_machine');
    expect(duplicate!.subtype).toBe('vm');
    expect(
      useArchitectureStore
        .getState()
        .workspace.architecture.endpoints.filter((endpoint) => endpoint.blockId === duplicate!.id),
    ).toHaveLength(6);
  });

  it('survives a save → load round trip without identity loss', () => {
    const containers = createContainers();

    const expected = new Map<string, { resourceType: string; subtype: string | undefined }>();
    for (const type of PALETTE_RESOURCES) {
      const blockId = createFromPalette(type, targetParentFor(type, containers), 'azure');
      const block = useArchitectureStore.getState().nodeById.get(blockId)!;
      expected.set(blockId, { resourceType: block.resourceType, subtype: block.subtype });
    }

    const restored = deserialize(serialize([useArchitectureStore.getState().workspace]));
    const restoredNodes = new Map(restored[0].architecture.nodes.map((node) => [node.id, node]));

    for (const [blockId, identity] of expected) {
      expect(restoredNodes.get(blockId)?.resourceType).toBe(identity.resourceType);
      expect(restoredNodes.get(blockId)?.subtype).toBe(identity.subtype);
    }
  });

  it('reports no placement errors for palette-created blocks', () => {
    const containers = createContainers();

    for (const type of PALETTE_RESOURCES) {
      createFromPalette(type, targetParentFor(type, containers), 'azure');
    }

    const result = validateArchitecture(useArchitectureStore.getState().workspace.architecture);
    const placementErrors = result.errors.filter((error) => error.ruleId !== 'rule-no-overlap');

    expect(placementErrors).toEqual([]);
  });

  it('resolves identical presentation before and after the canonical fix', () => {
    const containers = createContainers();

    for (const type of PALETTE_RESOURCES) {
      const definition = RESOURCE_DEFINITIONS[type];
      const blockId = createFromPalette(type, targetParentFor(type, containers), 'azure');
      const block = useArchitectureStore.getState().nodeById.get(blockId)!;

      const fromBlock = resolveBlockPresentation(block.subtype ?? block.resourceType, {
        provider: 'azure',
      });
      const fromPalette = resolveBlockPresentation(
        definition.azureSubtype ?? definition.schemaResourceType,
        { provider: 'azure' },
      );

      expect(fromBlock).toEqual(fromPalette);
    }
  });
});

describe('#1963 legacy alias migration', () => {
  beforeEach(() => {
    resetStore();
  });

  it('imports a legacy payload whose root resource uses an alias resourceType', () => {
    const legacyExport = JSON.stringify({
      id: 'arch-import',
      name: 'Imported',
      version: '1',
      nodes: [
        {
          id: 'block-import-storage',
          name: 'Storage',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'blob-storage',
          category: 'data',
          provider: 'azure',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        },
      ],
      endpoints: [],
      connections: [],
    });

    const error = useArchitectureStore.getState().importArchitecture(legacyExport, 'azure');

    expect(error).toBeNull();
    const imported = useArchitectureStore
      .getState()
      .workspace.architecture.nodes.find((node) => node.id === 'block-import-storage');
    expect(imported?.resourceType).toBe('blob_storage');
    expect(imported?.subtype).toBe('blob-storage');
  });

  it('leaves an unrecognised provider unresolved instead of failing the load', () => {
    const payload = JSON.stringify({
      schemaVersion: '4.1.0',
      workspaces: [
        {
          id: 'ws-bad-provider',
          name: 'Bad Provider',
          provider: 'not-a-cloud',
          architecture: {
            id: 'arch-bad-provider',
            name: 'Bad Provider',
            version: '1',
            nodes: [
              {
                id: 'block-bad-provider',
                name: 'Mystery',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'some-unmapped-subtype',
                category: 'compute',
                provider: 'not-a-cloud',
                parentId: null,
                position: { x: 0, y: 0, z: 0 },
                metadata: {},
              },
            ],
            endpoints: [],
            connections: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const [workspace] = deserialize(payload);

    expect(workspace.architecture.nodes[0].resourceType).toBe('some-unmapped-subtype');
  });

  it('resolves a category-only legacy block to that category default', () => {
    const legacy = JSON.stringify({
      schemaVersion: '3.0.0',
      workspaces: [
        {
          id: 'ws-category-only',
          name: 'Category Only',
          provider: 'azure',
          architecture: {
            id: 'arch-category-only',
            name: 'Category Only',
            version: '1',
            plates: [
              {
                id: 'container-1',
                name: 'VNet',
                type: 'region',
                parentId: null,
                position: { x: 0, y: 0, z: 0 },
                size: { width: 16, height: 0.3, depth: 20 },
              },
            ],
            blocks: [
              {
                id: 'block-category-only',
                name: 'Queue',
                category: 'messaging',
                placementId: 'container-1',
                position: { x: 1, y: 0.5, z: 1 },
              },
            ],
            connections: [],
            endpoints: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const [workspace] = deserialize(legacy);
    const block = workspace.architecture.nodes.find((n) => n.id === 'block-category-only');

    expect(block?.resourceType).toBe('message_queue');
  });

  it('canonicalizes alias-typed resourceType from a persisted payload', () => {
    const legacy = JSON.stringify({
      schemaVersion: '4.1.0',
      workspaces: [
        {
          id: 'ws-legacy',
          name: 'Legacy',
          provider: 'azure',
          architecture: {
            id: 'arch-legacy',
            name: 'Legacy',
            version: '1',
            nodes: [
              {
                id: 'block-legacy-vm',
                name: 'VM',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'vm',
                category: 'compute',
                provider: 'azure',
                parentId: null,
                position: { x: 0, y: 0, z: 0 },
                metadata: {},
              },
              {
                id: 'block-legacy-nsg',
                name: 'NSG',
                kind: 'resource',
                layer: 'resource',
                resourceType: 'nsg',
                category: 'security',
                provider: 'azure',
                parentId: null,
                position: { x: 4, y: 0, z: 0 },
                metadata: {},
              },
            ],
            endpoints: [],
            connections: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const [workspace] = deserialize(legacy);
    const byId = new Map(workspace.architecture.nodes.map((node) => [node.id, node]));

    expect(byId.get('block-legacy-vm')?.resourceType).toBe('virtual_machine');
    expect(byId.get('block-legacy-vm')?.subtype).toBe('vm');
    expect(byId.get('block-legacy-nsg')?.resourceType).toBe('network_security_group');
    expect(byId.get('block-legacy-nsg')?.subtype).toBe('nsg');
  });
});
