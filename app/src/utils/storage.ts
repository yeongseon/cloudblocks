import type { Workspace } from '../models/types';
import { serialize, deserialize } from '../models/schema';

const STORAGE_KEY = 'cloude-lego:workspaces';

/**
 * Save workspaces to localStorage.
 */
export function saveWorkspaces(workspaces: Workspace[]): void {
  try {
    const json = serialize(workspaces);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('Failed to save workspaces:', error);
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
    console.error('Failed to load workspaces:', error);
    return [];
  }
}

/**
 * Clear all workspaces from localStorage.
 */
export function clearWorkspaces(): void {
  localStorage.removeItem(STORAGE_KEY);
}
