import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Workspace } from '../types/index';
import { SCHEMA_VERSION } from '../types/schema';
import { clearWorkspaces, loadWorkspaces, saveWorkspaces } from './storage';

function createWorkspace(id: string): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    architecture: {
      id: `arch-${id}`,
      name: `Architecture ${id}`,
      version: '1',
      plates: [],
      blocks: [],
      connections: [],
      externalActors: [{ id: 'ext-internet', name: 'Internet', type: 'internet' , position: { x: -3, y: 0, z: 5 } }],
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

    const expectedJson = JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        workspaces,
      },
      null,
      2
    );

    expect(setItemSpy).toHaveBeenCalledWith('cloudblocks:workspaces', expectedJson);
  });

  it('saveWorkspaces logs an error when localStorage throws', () => {
    const workspaces = [createWorkspace('w1')];
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('setItem failed');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    saveWorkspaces(workspaces);

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to save workspaces:',
      expect.any(Error)
    );
  });

  it('loadWorkspaces returns parsed workspaces when data exists', () => {
    const workspaces = [createWorkspace('w1')];
    localStorage.setItem(
      'cloudblocks:workspaces',
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, workspaces })
    );

    const loaded = loadWorkspaces();

    expect(loaded).toEqual(workspaces);
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
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load workspaces:',
      expect.any(Error)
    );
  });

  it('loadWorkspaces returns empty array and logs error when getItem throws', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('getItem failed');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const loaded = loadWorkspaces();

    expect(getItemSpy).toHaveBeenCalledWith('cloudblocks:workspaces');
    expect(loaded).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load workspaces:',
      expect.any(Error)
    );
  });

  it('clearWorkspaces removes persisted workspaces key', () => {
    localStorage.setItem('cloudblocks:workspaces', 'value');
    const removeItemSpy = vi.spyOn(localStorage, 'removeItem');

    clearWorkspaces();

    expect(removeItemSpy).toHaveBeenCalledWith('cloudblocks:workspaces');
    expect(localStorage.getItem('cloudblocks:workspaces')).toBeNull();
  });
});
