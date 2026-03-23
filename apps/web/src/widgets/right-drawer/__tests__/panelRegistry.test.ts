import { describe, expect, it } from 'vitest';
import { ALL_DRAWER_PANEL_IDS, PANEL_REGISTRY } from '../panelRegistry';
import type { DrawerPanelId } from '../panelRegistry';

describe('panelRegistry', () => {
  it('has entries for all declared panel IDs', () => {
    const expectedIds: DrawerPanelId[] = [
      'properties',
      'validation',
      'connections',
      'scenarios',
      'learning',
      'code',
    ];

    for (const id of expectedIds) {
      expect(PANEL_REGISTRY[id]).toBeDefined();
      expect(PANEL_REGISTRY[id].id).toBe(id);
    }
  });

  it('ALL_DRAWER_PANEL_IDS matches PANEL_REGISTRY keys', () => {
    expect(ALL_DRAWER_PANEL_IDS.sort()).toEqual(Object.keys(PANEL_REGISTRY).sort());
  });

  it('every entry has required fields', () => {
    for (const entry of Object.values(PANEL_REGISTRY)) {
      expect(entry.label).toBeTruthy();
      expect(entry.Icon).toBeTruthy();
      expect(entry.minWidth).toBeGreaterThan(0);
    }
  });
});
