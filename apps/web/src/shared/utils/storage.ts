import type { Workspace } from '../types/index';
import { serialize, deserialize } from '../types/schema';
import logger from './logger';

const STORAGE_KEY = 'cloudblocks:workspaces';
const ACTIVE_WORKSPACE_KEY = 'cloudblocks:activeWorkspaceId';

/**
 * Save workspaces to localStorage.
 * Returns true on success, false on failure.
 */
export function saveWorkspaces(workspaces: Workspace[]): boolean {
  try {
    const json = serialize(workspaces);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (error) {
    logger.error('Failed to save workspaces:', error);
    return false;
  }
}

/**
 * Save the active workspace ID to localStorage.
 */
export function saveActiveWorkspaceId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // Best-effort — active ID is non-critical
  }
}

/**
 * Load the active workspace ID from localStorage.
 */
export function loadActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

/**
 * Load workspaces from localStorage.
 */
export function loadWorkspaces(): Workspace[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return deserialize(json);
  } catch (error) {
    logger.error('Failed to load workspaces:', error);
    return [];
  }
}

/**
 * Clear all workspaces from localStorage.
 */
export function clearWorkspaces(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}
