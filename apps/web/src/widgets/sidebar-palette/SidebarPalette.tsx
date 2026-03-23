import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import interact from 'interactjs';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
  CREATION_GROUP_ORDER,
  getCreationGroupMeta,
  getCreationGroupId,
  type CreationGroupId,
  ALL_RESOURCES,
  PROVIDER_RESOURCE_ALLOWLIST,
} from '../bottom-panel/useTechTree';
import './SidebarPalette.css';

const CATEGORY_COLOR_VARS: Record<CreationGroupId, string> = {
  foundation: 'var(--cat-network)',
  network: 'var(--cat-network)',
  compute: 'var(--cat-compute)',
  data: 'var(--cat-data)',
  security: 'var(--cat-security)',
  edge: 'var(--cat-edge)',
  messaging: 'var(--cat-messaging)',
  operations: 'var(--cat-operations)',
};

interface PaletteHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  visibleCount: number;
  totalCount: number;
}

function PaletteHeader({
  searchQuery,
  onSearchChange,
  visibleCount,
  totalCount,
}: PaletteHeaderProps) {
  return (
    <header className="sidebar-palette-header">
      <label className="sidebar-palette-search" htmlFor="sidebar-palette-search">
        <span className="sidebar-palette-search-icon" aria-hidden="true">
          🔎
        </span>
        <input
          id="sidebar-palette-search"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search resources"
        />
      </label>
      <p className="sidebar-palette-stats" aria-live="polite">
        Showing {visibleCount} of {totalCount}
      </p>
    </header>
  );
}

interface PaletteCategoryGroupProps {
  groupId: CreationGroupId;
  resourceTypes: ResourceType[];
  collapsed: boolean;
  onToggle: () => void;
  renderItem: (type: ResourceType) => React.ReactNode;
}

function PaletteCategoryGroup({
  groupId,
  resourceTypes,
  collapsed,
  onToggle,
  renderItem,
}: PaletteCategoryGroupProps) {
  const meta = getCreationGroupMeta(groupId);
  const color = CATEGORY_COLOR_VARS[groupId] ?? meta.color;

  return (
    <section className="sidebar-palette-group" aria-label={`${meta.label} resources`}>
      <button
        type="button"
        className="sidebar-palette-group-toggle"
        style={{ '--category-color': color } as CSSProperties}
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${meta.label}`}
      >
        <span className="sidebar-palette-group-title">
          <span className="sidebar-palette-group-icon" aria-hidden="true">
            {meta.icon}
          </span>
          <span>{meta.label}</span>
        </span>
        <span className="sidebar-palette-group-count">{resourceTypes.length}</span>
      </button>

      {!collapsed && (
        <div className="sidebar-palette-group-list">{resourceTypes.map(renderItem)}</div>
      )}
    </section>
  );
}

interface PaletteResourceItemProps {
  type: ResourceType;
  providerLabel: string;
  providerShortLabel: string;
  enabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
}

function PaletteResourceItem({
  type,
  providerLabel,
  providerShortLabel,
  enabled,
  disabledReason,
  onClick,
}: PaletteResourceItemProps) {
  const def = RESOURCE_DEFINITIONS[type];

  return (
    <button
      key={type}
      type="button"
      className={`sidebar-palette-resource-btn ${enabled ? '' : 'disabled'}`}
      data-resource-type={type}
      onClick={onClick}
      disabled={!enabled}
      title={enabled ? `Create ${providerLabel}` : (disabledReason ?? undefined)}
    >
      <span className="sidebar-palette-resource-icon" aria-hidden="true">
        {def.icon}
      </span>
      <span className="sidebar-palette-resource-text">
        <span className="sidebar-palette-resource-name">{providerShortLabel}</span>
        <span className="sidebar-palette-resource-subtitle">{providerLabel}</span>
      </span>
      {!enabled && (
        <span className="sidebar-palette-resource-lock" aria-hidden="true">
          🔒
        </span>
      )}
    </button>
  );
}

export function SidebarPalette() {
  const techTree = useTechTree();
  const addNode = useArchitectureStore((s) => s.addNode);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startPlacing = useUIStore((s) => s.startPlacing);
  const cancelInteraction = useUIStore((s) => s.cancelInteraction);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<CreationGroupId>>(() => new Set());

  const playSound = useCallback(
    (name: SoundName) => {
      if (!isSoundMuted) {
        audioService.playSound(name);
      }
    },
    [isSoundMuted],
  );

  const counterRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const groupedResources = useMemo(() => {
    return CREATION_GROUP_ORDER.map((groupId) => {
      const meta = getCreationGroupMeta(groupId);
      const resources = ALL_RESOURCES.filter((type) => getCreationGroupId(type) === groupId)
        .filter((type) => providerResources.has(type))
        .filter((type) => {
          if (!normalizedQuery) return true;
          const name = getResourceLabel(type, activeProvider).toLowerCase();
          const shortName = getResourceShortLabel(type, activeProvider).toLowerCase();
          const category = meta.label.toLowerCase();
          return (
            name.includes(normalizedQuery) ||
            shortName.includes(normalizedQuery) ||
            category.includes(normalizedQuery)
          );
        })
        .sort((a, b) =>
          getResourceLabel(a, activeProvider).localeCompare(getResourceLabel(b, activeProvider)),
        );

      return { groupId, resources };
    }).filter((group) => group.resources.length > 0);
  }, [activeProvider, normalizedQuery, providerResources]);

  const totalResourceCount = useMemo(() => {
    return ALL_RESOURCES.filter((type) => providerResources.has(type)).length;
  }, [providerResources]);

  const visibleResourceCount = useMemo(() => {
    return groupedResources.reduce((total, group) => total + group.resources.length, 0);
  }, [groupedResources]);

  useEffect(() => {
    if (!containerRef.current) return;

    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>(
      '.sidebar-palette-resource-btn:not(.disabled):not(:disabled)',
    );
    const interactables = Array.from(buttons).map((button) =>
      interact(button).draggable({
        listeners: {
          start() {
            isDraggingRef.current = false;
          },
          move(event) {
            isDraggingRef.current = true;
            const buttonEl = event.target as HTMLButtonElement;
            buttonEl.classList.add('is-dragging');

            const type = buttonEl.dataset.resourceType as ResourceType | undefined;
            if (!type) return;

            const def = RESOURCE_DEFINITIONS[type];
            if (!def?.blockCategory) return;

            startPlacing(def.blockCategory, getResourceLabel(type, activeProvider));
          },
          end(event) {
            const buttonEl = event.target as HTMLButtonElement;
            buttonEl.classList.remove('is-dragging');
            cancelInteraction();

            if (dragResetTimerRef.current) {
              clearTimeout(dragResetTimerRef.current);
            }
            dragResetTimerRef.current = setTimeout(() => {
              isDraggingRef.current = false;
            }, 50);
          },
        },
        autoScroll: false,
      }),
    );

    return () => {
      if (dragResetTimerRef.current) {
        clearTimeout(dragResetTimerRef.current);
      }
      buttons.forEach((button) => {
        button.classList.remove('is-dragging');
      });
      cancelInteraction();
      interactables.forEach((interactable) => {
        interactable.unset();
      });
    };
  }, [activeProvider, cancelInteraction, startPlacing]);

  const handleCreate = useCallback(
    (type: ResourceType) => {
      if (isDraggingRef.current) return;

      const def = RESOURCE_DEFINITIONS[type];

      if (def.category === 'foundation') {
        if (type === 'network') {
          addNode({
            kind: 'container',
            resourceType: 'virtual_network',
            name: 'VNet',
            parentId: null,
            layer: 'region',
          });
          playSound('block-snap');
        } else if (type === 'subnet') {
          const targetId = techTree.getTargetPlateId(type);
          if (targetId) {
            addNode({
              kind: 'container',
              resourceType: 'subnet',
              name: 'Subnet',
              parentId: targetId,
              layer: 'subnet',
            });
            playSound('block-snap');
          }
        }
        return;
      }

      if (!def.blockCategory) {
        return;
      }

      const targetId = techTree.getTargetPlateId(type);
      if (!targetId) {
        toast.error('Please create a Network first.');
        return;
      }

      counterRef.current += 1;
      const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
      addNode({
        kind: 'resource',
        resourceType: def.schemaResourceType ?? def.blockCategory,
        name,
        parentId: targetId,
        provider: activeProvider,
        subtype: def.schemaResourceType,
      });
      playSound('block-snap');
    },
    [activeProvider, addNode, playSound, techTree],
  );

  const toggleGroup = useCallback((groupId: CreationGroupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  return (
    <div className="sidebar-palette" ref={containerRef}>
      <PaletteHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        visibleCount={visibleResourceCount}
        totalCount={totalResourceCount}
      />

      <div className="sidebar-palette-content">
        {groupedResources.map(({ groupId, resources }) => (
          <PaletteCategoryGroup
            key={groupId}
            groupId={groupId}
            resourceTypes={resources}
            collapsed={collapsedGroups.has(groupId)}
            onToggle={() => toggleGroup(groupId)}
            renderItem={(type) => (
              <PaletteResourceItem
                key={type}
                type={type}
                providerLabel={getResourceLabel(type, activeProvider)}
                providerShortLabel={getResourceShortLabel(type, activeProvider)}
                enabled={techTree.isEnabled(type)}
                disabledReason={techTree.getDisabledReason(type)}
                onClick={() => {
                  if (techTree.isEnabled(type)) {
                    handleCreate(type);
                  }
                }}
              />
            )}
          />
        ))}
      </div>
    </div>
  );
}
