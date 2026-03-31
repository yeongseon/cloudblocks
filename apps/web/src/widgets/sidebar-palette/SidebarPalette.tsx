import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Search, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import interact from 'interactjs';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  type ResourceType,
  CREATION_GROUP_ORDER,
  getCreationGroupMeta,
  getCreationGroupId,
  type CreationGroupId,
  ALL_RESOURCES,
} from '../../shared/hooks/useTechTree';
import {
  resolveResourcePresentation,
  resolveExternalPresentation,
} from '../../shared/presentation/blockPresentation';
import { getContainerLabel, remapSubtype } from '../../shared/utils/providerMapping';
import './SidebarPalette.css';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

const CATEGORY_COLOR_VARS: Record<CreationGroupId, string> = {
  network: 'var(--cat-network)',
  delivery: 'var(--cat-delivery)',
  compute: 'var(--cat-compute)',
  data: 'var(--cat-data)',
  messaging: 'var(--cat-messaging)',
  security: 'var(--cat-security)',
  identity: 'var(--cat-identity)',
  operations: 'var(--cat-operations)',
};

/** External block types rendered in the palette. */
const EXTERNAL_TYPES = ['internet', 'browser'] as const;

interface HighlightMatchProps {
  text: string;
  query: string;
}

function HighlightMatch({ text, query }: HighlightMatchProps) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="sidebar-palette-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

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
          <Search size={12} />
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
  searchQuery: string;
  iconUrl: string | null;
}

function PaletteResourceItem({
  type,
  providerLabel,
  providerShortLabel,
  enabled,
  disabledReason,
  onClick,
  searchQuery,
  iconUrl,
}: PaletteResourceItemProps) {
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
        {iconUrl ? (
          <img src={iconUrl} alt="" width={18} height={18} />
        ) : (
          <span className="sidebar-palette-icon-placeholder" />
        )}
      </span>
      <span className="sidebar-palette-resource-text">
        <span className="sidebar-palette-resource-name">
          <HighlightMatch text={providerShortLabel} query={searchQuery} />
        </span>
        <span className="sidebar-palette-resource-subtitle">
          <HighlightMatch text={providerLabel} query={searchQuery} />
        </span>
      </span>
      {!enabled && (
        <span className="sidebar-palette-resource-lock" aria-hidden="true">
          <Lock size={11} />
        </span>
      )}
    </button>
  );
}

/** External actors group rendered as a dedicated section using unified PaletteResourceItem layout. */
interface PaletteExternalGroupProps {
  collapsed: boolean;
  onToggle: () => void;
  searchQuery: string;
  onAdd: (type: 'internet' | 'browser') => void;
  activeProvider: 'azure' | 'aws' | 'gcp';
}

function PaletteExternalGroup({
  collapsed,
  onToggle,
  searchQuery,
  onAdd,
  activeProvider,
}: PaletteExternalGroupProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleTypes = useMemo(() => {
    return EXTERNAL_TYPES.filter((type) => {
      if (!normalizedQuery) return true;
      const pres = resolveExternalPresentation(type, { provider: activeProvider });
      return (
        pres.displayLabel.toLowerCase().includes(normalizedQuery) ||
        pres.shortLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, activeProvider]);

  if (visibleTypes.length === 0) return null;

  return (
    <section className="sidebar-palette-group" aria-label="External resources">
      <button
        type="button"
        className="sidebar-palette-group-toggle"
        style={{ '--category-color': 'var(--cat-network)' } as CSSProperties}
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} External`}
      >
        <span className="sidebar-palette-group-title">
          <span className="sidebar-palette-group-icon" aria-hidden="true">
            🔌
          </span>
          <span>External</span>
        </span>
        <span className="sidebar-palette-group-count">{visibleTypes.length}</span>
      </button>

      {!collapsed && (
        <div className="sidebar-palette-group-list">
          {visibleTypes.map((type) => {
            const pres = resolveExternalPresentation(type, { provider: activeProvider });
            return (
              <button
                key={type}
                type="button"
                className="sidebar-palette-resource-btn"
                onClick={() => onAdd(type)}
                title={`Add ${pres.displayLabel}`}
              >
                <span className="sidebar-palette-resource-icon" aria-hidden="true">
                  {pres.iconUrl ? (
                    <img src={pres.iconUrl} alt="" width={18} height={18} />
                  ) : (
                    <span className="sidebar-palette-icon-placeholder" />
                  )}
                </span>
                <span className="sidebar-palette-resource-text">
                  <span className="sidebar-palette-resource-name">
                    <HighlightMatch text={pres.shortLabel} query={searchQuery} />
                  </span>
                  <span className="sidebar-palette-resource-subtitle">
                    <HighlightMatch text={pres.displayLabel} query={searchQuery} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function SidebarPalette() {
  const techTree = useTechTree();
  const addNode = useArchitectureStore((s) => s.addNode);
  const addExternalBlock = useArchitectureStore((s) => s.addExternalBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startPlacing = useUIStore((s) => s.startPlacing);
  const cancelInteraction = useUIStore((s) => s.cancelInteraction);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<CreationGroupId | 'external'>>(
    () => new Set(),
  );

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const groupedResources = useMemo(() => {
    const isSearching = normalizedQuery.length > 0;
    return CREATION_GROUP_ORDER.map((groupId) => {
      const meta = getCreationGroupMeta(groupId);
      const resources = ALL_RESOURCES.filter((type) => getCreationGroupId(type) === groupId)
        .filter((type) => {
          // When searching, ignore tier filter so users can discover advanced resources
          if (!isSearching && !showAdvanced) {
            const def = RESOURCE_DEFINITIONS[type];
            if (def.tier === 'advanced') return false;
          }
          if (!normalizedQuery) return true;
          // Use blockPresentation resolver for search to match displayed labels
          const pres = resolveResourcePresentation(type, { provider: activeProvider });
          const category = meta.label.toLowerCase();
          return (
            pres.displayLabel.toLowerCase().includes(normalizedQuery) ||
            pres.shortLabel.toLowerCase().includes(normalizedQuery) ||
            category.includes(normalizedQuery)
          );
        })
        .sort((a, b) => {
          const labelA = resolveResourcePresentation(a, { provider: activeProvider }).displayLabel;
          const labelB = resolveResourcePresentation(b, { provider: activeProvider }).displayLabel;
          return labelA.localeCompare(labelB);
        });

      return { groupId, resources };
    }).filter((group) => group.resources.length > 0);
  }, [activeProvider, normalizedQuery, showAdvanced]);

  const totalResourceCount = ALL_RESOURCES.length;

  const visibleResourceCount = useMemo(() => {
    const resourceCount = groupedResources.reduce(
      (total, group) => total + group.resources.length,
      0,
    );
    // Include external types in visible count when they match search
    const externalCount = EXTERNAL_TYPES.filter((type) => {
      if (!normalizedQuery) return true;
      const pres = resolveExternalPresentation(type, { provider: activeProvider });
      return (
        pres.displayLabel.toLowerCase().includes(normalizedQuery) ||
        pres.shortLabel.toLowerCase().includes(normalizedQuery)
      );
    }).length;
    return resourceCount + externalCount;
  }, [groupedResources, normalizedQuery, activeProvider]);

  const totalCount = totalResourceCount + EXTERNAL_TYPES.length;

  useEffect(() => {
    if (isMobile) return;
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

            const pres = resolveResourcePresentation(type, { provider: activeProvider });

            startPlacing(
              def.blockCategory,
              pres.displayLabel,
              def.schemaResourceType ?? def.blockCategory,
              remapSubtype(def.azureSubtype ?? def.schemaResourceType, activeProvider),
            );
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
  }, [activeProvider, cancelInteraction, startPlacing, isMobile]);

  const handleCreate = useCallback(
    (type: ResourceType) => {
      if (isDraggingRef.current) return;

      const def = RESOURCE_DEFINITIONS[type];

      if (def.category === 'foundation') {
        if (type === 'network') {
          addNode({
            kind: 'container',
            resourceType: 'virtual_network',
            name: getContainerLabel('region', activeProvider) ?? 'VNet',
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
              name: getContainerLabel('subnet', activeProvider) ?? 'Subnet',
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
      const pres = resolveResourcePresentation(type, { provider: activeProvider });
      const name = `${pres.displayLabel} ${counterRef.current}`;
      addNode({
        kind: 'resource',
        resourceType: def.schemaResourceType ?? def.blockCategory,
        name,
        parentId: targetId,
        provider: activeProvider,
        subtype: remapSubtype(def.azureSubtype ?? def.schemaResourceType, activeProvider),
      });
      playSound('block-snap');
    },
    [activeProvider, addNode, playSound, techTree],
  );

  const handleAddExternal = useCallback(
    (type: 'internet' | 'browser') => {
      addExternalBlock(type);
      playSound('block-snap');
    },
    [addExternalBlock, playSound],
  );

  const toggleGroup = useCallback((groupId: CreationGroupId | 'external') => {
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
        totalCount={totalCount}
      />

      <label className="sidebar-palette-advanced-toggle">
        <input
          type="checkbox"
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
        />
        <span>Show Advanced</span>
      </label>

      <div className="sidebar-palette-content">
        <PaletteExternalGroup
          collapsed={collapsedGroups.has('external')}
          onToggle={() => toggleGroup('external')}
          searchQuery={normalizedQuery}
          onAdd={handleAddExternal}
          activeProvider={activeProvider}
        />

        {groupedResources.map(({ groupId, resources }) => (
          <PaletteCategoryGroup
            key={groupId}
            groupId={groupId}
            resourceTypes={resources}
            collapsed={collapsedGroups.has(groupId)}
            onToggle={() => toggleGroup(groupId)}
            renderItem={(type) => {
              const pres = resolveResourcePresentation(type, { provider: activeProvider });
              return (
                <PaletteResourceItem
                  key={type}
                  type={type}
                  providerLabel={pres.displayLabel}
                  providerShortLabel={pres.shortLabel}
                  enabled={techTree.isEnabled(type)}
                  disabledReason={techTree.getDisabledReason(type)}
                  searchQuery={normalizedQuery}
                  iconUrl={pres.iconUrl}
                  onClick={() => {
                    if (techTree.isEnabled(type)) {
                      handleCreate(type);
                    }
                  }}
                />
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
