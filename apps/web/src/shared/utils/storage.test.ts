import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workspace } from '../types/index';
import { SCHEMA_VERSION } from '../types/schema';
import { clearWorkspaces, loadWorkspaces, saveWorkspaces } from './storage';

function createWorkspace(id: string): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    provider: 'azure' as const,
    architecture: {
      id: `arch-${id}`,
      name: `Architecture ${id}`,
      version: '1',
      nodes: [],
      connections: [],
      endpoints: [],
      externalActors: [
        { id: 'ext-internet', name: 'Internet', type: 'internet', position: { x: -3, y: 0, z: 5 } },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('storage utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saveWorkspaces serializes and stores workspaces', () => {
    const workspaces = [createWorkspace('w1')];
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    saveWorkspaces(workspaces);

    // serialize() materializes externalActors into nodes and strips the key
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const storedJson = setItemSpy.mock.calls[0][1] as string;
    const parsed = JSON.parse(storedJson);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.workspaces[0].architecture.externalActors).toBeUndefined();
    // ext-internet materialized as a node
    expect(parsed.workspaces[0].architecture.nodes).toHaveLength(1);
    expect(parsed.workspaces[0].architecture.nodes[0].id).toBe('ext-internet');
    // Endpoints generated for the materialized block
    expect(parsed.workspaces[0].architecture.endpoints.length).toBeGreaterThan(0);
  });

  it('saveWorkspaces logs an error when localStorage throws', () => {
    const workspaces = [createWorkspace('w1')];
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('setItem failed');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    saveWorkspaces(workspaces);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Failed to save workspaces:', expect.any(Error));
  });

  it('loadWorkspaces returns parsed workspaces when data exists', () => {
    const workspaces = [createWorkspace('w1')];
    localStorage.setItem(
      'cloudblocks:workspaces',
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, workspaces }),
    );

    const loaded = loadWorkspaces();

    // deserialize migrates externalActors into nodes and generates endpoints
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('w1');
    // The migrated internet actor should now be a node
    expect(loaded[0].architecture.nodes).toHaveLength(1);
    expect(loaded[0].architecture.nodes[0].id).toBe('ext-internet');
  });

  it('loadWorkspaces returns empty array when storage key is missing', () => {
    const loaded = loadWorkspaces();

    expect(loaded).toEqual([]);
  });

  it('loadWorkspaces returns empty array and logs error on malformed json', () => {
    localStorage.setItem('cloudblocks:workspaces', '{ malformed json }');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const loaded = loadWorkspaces();

    expect(loaded).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('Failed to load workspaces:', expect.any(Error));
  });

  it('loadWorkspaces returns empty array and logs error when getItem throws', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('getItem failed');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const loaded = loadWorkspaces();

    expect(getItemSpy).toHaveBeenCalledWith('cloudblocks:workspaces');
    expect(loaded).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('Failed to load workspaces:', expect.any(Error));
  });

  it('clearWorkspaces removes persisted workspaces key', () => {
    localStorage.setItem('cloudblocks:workspaces', 'value');
    const removeItemSpy = vi.spyOn(localStorage, 'removeItem');

    clearWorkspaces();

    expect(removeItemSpy).toHaveBeenCalledWith('cloudblocks:workspaces');
    expect(localStorage.getItem('cloudblocks:workspaces')).toBeNull();
  });
});
