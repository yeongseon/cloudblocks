/**
 * Panel registry for the right drawer system.
 *
 * Maps panel IDs to their metadata (label, icon, minimum width).
 * Panels are rendered by the RightDrawer component based on the
 * active panel ID stored in uiStore.
 */

import type { ComponentType } from 'react';
import {
  Settings,
  CheckCircle,
  Link2,
  ClipboardList,
  BookOpen,
  Code,
  LayoutTemplate,
} from 'lucide-react';
import type { DrawerPanelId } from '../../shared/types/drawer';

export type { DrawerPanelId };

export interface PanelRegistryEntry {
  id: DrawerPanelId;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  minWidth: number;
}

export const PANEL_REGISTRY: Record<DrawerPanelId, PanelRegistryEntry> = {
  properties: { id: 'properties', label: 'Properties', Icon: Settings, minWidth: 320 },
  validation: { id: 'validation', label: 'Validation', Icon: CheckCircle, minWidth: 360 },
  connections: { id: 'connections', label: 'Connections', Icon: Link2, minWidth: 320 },
  scenarios: { id: 'scenarios', label: 'Scenarios', Icon: ClipboardList, minWidth: 400 },
  learning: { id: 'learning', label: 'Learning', Icon: BookOpen, minWidth: 360 },
  code: { id: 'code', label: 'Code', Icon: Code, minWidth: 400 },
  templates: { id: 'templates', label: 'Templates', Icon: LayoutTemplate, minWidth: 400 },
};

/** All registered panel IDs, useful for iteration. */
export const ALL_DRAWER_PANEL_IDS: DrawerPanelId[] = Object.keys(PANEL_REGISTRY) as DrawerPanelId[];
