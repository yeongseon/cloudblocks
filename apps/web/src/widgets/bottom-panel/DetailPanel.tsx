/**
 * Detail Panel — Resource Properties & Creation Grid
 *
 * Shows resource properties with inline editing capability.
 * States:
 * - Nothing selected: Welcome message with tips
 * - Worker selected: Resource creation grid (build mode)
 * - Single block/plate selected: Editable properties with actions
 * - Connection selected: Connection details
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.3
 */

import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BLOCK_FRIENDLY_NAMES, BLOCK_DESCRIPTIONS, BLOCK_ICONS, CONNECTION_TYPE_LABELS, DEFAULT_PLATE_PROFILE, getPlateProfile, isPlateProfileId, PLATE_PROFILES } from '../../shared/types/index';
import type { PlateProfileId } from '../../shared/types/index';
import type { Block, BlockCategory, Plate } from '@cloudblocks/schema';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockIconUrl, getPlateIconUrl } from '../../shared/utils/iconResolver';
import { BlockSvg } from '../../entities/block/BlockSvg';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
} from './useTechTree';
import { getBlockWorldPosition } from '../../shared/utils/position';
import './DetailPanel.css';

interface DetailPanelProps {
  className?: string;
}

export function DetailPanel({ className = '' }: DetailPanelProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  // Find selected item
  const selectedBlock = architecture.blocks.find((b) => b.id === selectedId);
  const selectedPlate = architecture.plates.find((p) => p.id === selectedId);
  const selectedConnection = architecture.connections.find((c) => c.id === selectedId);

  if (!selectedId) {
    const isEmptyOnboarding = architecture.plates.length === 0 && !showTemplateGallery;
    if (isEmptyOnboarding) {
      return <IdleState className={className} />;
    }
    return <WelcomeState className={className} />;
  }

  if (selectedId === 'worker-default') {
    return <WorkerCreationGrid className={className} />;
  }

  if (selectedBlock) {
    return <BlockDetail block={selectedBlock} className={className} />;
  }

  if (selectedPlate) {
    return <PlateDetail plate={selectedPlate} className={className} />;
  }

  if (selectedConnection) {
    return <ConnectionDetail connectionId={selectedConnection.id} className={className} />;
  }

  return <WelcomeState className={className} />;
}

// ─── Idle State ────────────────────────────────────────────

function IdleState({ className }: { className: string }) {
  return (
    <div className={`detail-panel detail-panel--idle ${className}`}>
      <div className="detail-idle">
        <span className="detail-idle-icon">📋</span>
        <p className="detail-idle-text">No selection</p>
      </div>
    </div>
  );
}

// ─── Welcome State ─────────────────────────────────────────

function WelcomeState({ className }: { className: string }) {
  return (
    <div className={`detail-panel detail-panel--welcome ${className}`}>
      <div className="detail-welcome">
        <h3 className="detail-welcome-title">Welcome to CloudBlocks!</h3>
        <p className="detail-welcome-text">
          Select a resource to view its properties,
          <br />
          or click the minifigure to start building.
        </p>
        <div className="detail-welcome-tip">
          <span className="detail-tip-icon">💡</span>
          <span className="detail-tip-text">Tip: Start with Network</span>
        </div>
      </div>
    </div>
  );
}

// ─── Worker Creation Grid (was WorkerBuildMode in CommandCard) ──

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];

type CreationGroupId = BlockCategory | 'plate';

const CREATION_GROUP_ORDER: CreationGroupId[] = [
  'plate',
  'compute',
  'database',
  'storage',
  'gateway',
  'function',
  'queue',
  'event',
  'analytics',
  'identity',
  'observability',
];

function getCreationGroupMeta(groupId: CreationGroupId): { icon: string; label: string; color: string } {
  if (groupId === 'plate') {
    return {
      icon: '🧭',
      label: 'Network Foundations',
      color: '#2563EB',
    };
  }

  return {
    icon: BLOCK_ICONS[groupId],
    label: BLOCK_FRIENDLY_NAMES[groupId],
    color: getBlockColor('azure', undefined, groupId),
  };
}

function getCreationGroupId(type: ResourceType): CreationGroupId {
  const blockCategory = RESOURCE_DEFINITIONS[type].blockCategory;
  return blockCategory ?? 'plate';
}

function WorkerCreationGrid({ className }: { className: string }) {
  const techTree = useTechTree();
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startBuild = useWorkerStore((s) => s.startBuild);
  const counterRef = useRef(0);

  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((resource) => getCreationGroupId(resource) === groupId)
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));

    return { groupId, resources };
  }).filter((group) => group.resources.length > 0);

  const handleBuild = useCallback((type: ResourceType) => {
    const def = RESOURCE_DEFINITIONS[type];

    // Handle plate creation
    if (def.category === 'plate') {
      if (type === 'network') {
        addPlate('region', 'VNet', null);
      } else if (type === 'public-subnet') {
        const targetId = techTree.getTargetPlateId(type);
        if (targetId) {
          addPlate('subnet', 'Public Subnet', targetId, 'public');
        }
      } else if (type === 'private-subnet') {
        const targetId = techTree.getTargetPlateId(type);
        if (targetId) {
          addPlate('subnet', 'Private Subnet', targetId, 'private');
        }
      }
      return;
    }

    if (!def.blockCategory) return;

    const targetId = techTree.getTargetPlateId(type);
    if (!targetId) {
      toast.error('Please create a Network first.');
      return;
    }

    const knownBlockIds = new Set(architecture.blocks.map((block) => block.id));
    counterRef.current += 1;
    const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
    addBlock(def.blockCategory, name, targetId, activeProvider);

    const nextBlocks = useArchitectureStore.getState().workspace.architecture.blocks;
    const createdBlock = nextBlocks.find(
      (block) => !knownBlockIds.has(block.id) && block.name === name && block.placementId === targetId,
    );

    if (createdBlock) {
      const nextPlates = useArchitectureStore.getState().workspace.architecture.plates;
      const parentPlate = nextPlates.find((p) => p.id === createdBlock.placementId);
      if (parentPlate) {
        startBuild(createdBlock.id, getBlockWorldPosition(createdBlock, parentPlate));
      }
    }
  }, [activeProvider, addPlate, addBlock, architecture.blocks, startBuild, techTree]);

  return (
    <div className={`detail-panel detail-panel--worker ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">🧑‍🔧</span>
        <span className="detail-header-name">Build Order</span>
      </div>

      <div className="detail-creation-grid">
        {groupedResources.map(({ groupId, resources }) => {
          const groupMeta = getCreationGroupMeta(groupId);
          return (
            <section key={groupId} className="detail-category-group" aria-label={`${groupMeta.label} resource group`}>
              <header className="detail-category-header" style={{ '--category-color': groupMeta.color } as CSSProperties}>
                <span className="detail-category-icon" aria-hidden="true">{groupMeta.icon}</span>
                <span className="detail-category-label">{groupMeta.label}</span>
              </header>

              <div className="detail-category-grid">
                {resources.map((type) => {
                  const def = RESOURCE_DEFINITIONS[type];
                  const enabled = techTree.isEnabled(type);
                  const disabledReason = techTree.getDisabledReason(type);

                  return (
                    <button
                      key={type}
                      type="button"
                      className={`detail-resource-btn ${enabled ? '' : 'disabled'}`}
                      data-resource-type={type}
                      onClick={() => enabled && handleBuild(type)}
                      disabled={!enabled}
                      title={enabled ? `Build ${getResourceLabel(type, activeProvider)}` : disabledReason ?? undefined}
                    >
                      <span className="detail-resource-btn-icon">
                        {def.blockCategory ? <BlockSvg category={def.blockCategory} provider={activeProvider} /> : def.icon}
                      </span>
                      <span className="detail-resource-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
                      {!enabled && <span className="detail-resource-btn-lock">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ─── Block Detail ──────────────────────────────────────────

interface InfraSettingsConfig {
  tier?: string;
  vCPUs?: number;
  memoryGb?: number;
  storageSizeGb?: number;
  replication?: string;
}

const CATEGORY_SETTINGS: Partial<Record<BlockCategory, { fields: (keyof InfraSettingsConfig)[]; defaults: InfraSettingsConfig }>> = {
  compute: {
    fields: ['tier', 'vCPUs', 'memoryGb'],
    defaults: { tier: 'standard', vCPUs: 2, memoryGb: 4 },
  },
  database: {
    fields: ['tier', 'storageSizeGb'],
    defaults: { tier: 'standard', storageSizeGb: 32 },
  },
  function: {
    fields: ['tier'],
    defaults: { tier: 'consumption' },
  },
  gateway: {
    fields: ['tier'],
    defaults: { tier: 'standard' },
  },
  storage: {
    fields: ['replication', 'storageSizeGb'],
    defaults: { replication: 'LRS', storageSizeGb: 100 },
  },
};

function buildInfraConfig(
  block: Block,
  categoryConfig: { fields: (keyof InfraSettingsConfig)[]; defaults: InfraSettingsConfig } | undefined,
): InfraSettingsConfig {
  if (!categoryConfig) return {};
  const existing = (block.config ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = {};
  for (const field of categoryConfig.fields) {
    merged[field] = existing[field] ?? categoryConfig.defaults[field];
  }
  return merged as InfraSettingsConfig;
}

function InfraSettingsInner({ block }: { block: Block }) {
  const updateBlockConfig = useArchitectureStore((s) => s.updateBlockConfig);
  const categoryConfig = CATEGORY_SETTINGS[block.category];

  const [localConfig, setLocalConfig] = useState<InfraSettingsConfig>(
    () => buildInfraConfig(block, categoryConfig),
  );

  if (!categoryConfig) return null;

  const handleChange = (field: keyof InfraSettingsConfig, value: string | number) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    updateBlockConfig(block.id, localConfig as Record<string, unknown>);
  };

  return (
    <div className="detail-infra-settings">
      <div className="detail-infra-settings-title">Infrastructure Settings</div>
      {categoryConfig.fields.map((field) => (
        <div key={field} className="detail-property">
          <label className="detail-property-label" htmlFor={`infra-${block.id}-${field}`}>
            {field === 'vCPUs' ? 'vCPUs'
              : field === 'memoryGb' ? 'Memory (GB)'
              : field === 'storageSizeGb' ? 'Storage (GB)'
              : field.charAt(0).toUpperCase() + field.slice(1)}
          </label>
          <span className="detail-property-value">
            {typeof categoryConfig.defaults[field] === 'number' ? (
              <input
                id={`infra-${block.id}-${field}`}
                type="number"
                className="detail-infra-input"
                value={localConfig[field] as number ?? ''}
                onChange={(e) => handleChange(field, Number(e.target.value))}
                min={0}
              />
            ) : (
              <input
                id={`infra-${block.id}-${field}`}
                type="text"
                className="detail-infra-input"
                value={String(localConfig[field] ?? '')}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            )}
          </span>
        </div>
      ))}
      <button type="button" className="detail-action-btn detail-action-btn--apply" onClick={handleApply}>
        Apply
      </button>
    </div>
  );
}

/** Wrapper that resets InfraSettingsInner when block.id or block.config changes */
function InfraSettings({ block }: { block: Block }) {
  const configKey = JSON.stringify(block.config ?? {});
  return <InfraSettingsInner key={`${block.id}-${configKey}`} block={block} />;
}

function BlockDetail({ block, className }: { block: Block; className: string }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(block.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const renameBlock = useArchitectureStore((s) => s.renameBlock);
  const duplicateBlock = useArchitectureStore((s) => s.duplicateBlock);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);


  const parentPlate = architecture.plates.find((p) => p.id === block.placementId);
  const networkPlate = parentPlate?.parentId
    ? architecture.plates.find((p) => p.id === parentPlate.parentId)
    : parentPlate;

  const handleRename = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== block.name) {
      renameBlock(block.id, trimmed);
      setNewName(trimmed);
    }
    setIsRenaming(false);
  }, [newName, block.id, block.name, renameBlock]);

  const handleCopy = useCallback(() => {
    duplicateBlock(block.id);
  }, [duplicateBlock, block.id]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDialog(
      `Delete "${block.name}"? This cannot be undone.`,
      'Delete Block',
    );
    if (confirmed) {
      removeBlock(block.id);
      setSelectedId(null);
    }
  }, [block.id, block.name, removeBlock, setSelectedId]);

  const color = getBlockColor(block.provider ?? 'azure', block.subtype, block.category);
  const providerLabel = block.provider ? block.provider.toUpperCase() : null;
  const typeIdentity = block.provider || block.subtype
    ? [providerLabel, block.subtype].filter(Boolean).join(' / ')
    : BLOCK_FRIENDLY_NAMES[block.category];

  return (
    <div className={`detail-panel detail-panel--block ${className}`}>
      <div className="detail-header">
        <img
          src={getBlockIconUrl(block.provider ?? 'azure', block.category, block.subtype)}
          alt={BLOCK_FRIENDLY_NAMES[block.category]}
          className="detail-header-icon-img"
        />
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            className="detail-header-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        ) : (
          <span className="detail-header-name">{block.name}</span>
        )}
        <button
          type="button"
          className="detail-rename-btn"
          onClick={() => {
            setNewName(block.name);
            setIsRenaming(true);
          }}
          title="Rename"
        >
          Rename
        </button>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">
            {typeIdentity}
            <span className="detail-property-hint" title={BLOCK_DESCRIPTIONS[block.category]}>
              ℹ️
            </span>
          </span>
        </div>

        {block.provider && (
          <div className="detail-property">
            <span className="detail-property-label">Provider</span>
            <span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>
              {providerLabel}
            </span>
          </div>
        )}

        {block.subtype && (
          <div className="detail-property">
            <span className="detail-property-label">Subtype</span>
            <span className="detail-property-value">{block.subtype}</span>
          </div>
        )}

        <div className="detail-property">
          <span className="detail-property-label">Category</span>
          <span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>
            {block.category}
          </span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">Network</span>
          <span className="detail-property-value">
            {networkPlate?.name ?? 'None'}
            {parentPlate && parentPlate !== networkPlate && ` / ${parentPlate.name}`}
          </span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">Position</span>
          <span className="detail-property-value detail-property-mono">
            ({block.position.x.toFixed(1)}, {block.position.y.toFixed(1)}, {block.position.z.toFixed(1)})
          </span>
        </div>

        <InfraSettings block={block} />

        <div className="detail-actions">
          <button type="button" className="detail-action-btn detail-action-btn--copy" onClick={handleCopy}>
            📋 Copy
          </button>
          <button type="button" className="detail-action-btn detail-action-btn--delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plate Detail ──────────────────────────────────────────

function PlateDetail({ plate, className }: { plate: Plate; className: string }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(plate.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);
  const renamePlate = useArchitectureStore((s) => s.renamePlate);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const profileId = plate.profileId && isPlateProfileId(plate.profileId)
    ? plate.profileId
    : DEFAULT_PLATE_PROFILE[plate.type];
  const profile = getPlateProfile(profileId);
  const hasProfileSupport = plate.type === 'region' || plate.type === 'subnet';
  const profileFilterType = plate.type === 'subnet' ? 'subnet' : 'region';
  const profileOptions = hasProfileSupport
    ? Object.values(PLATE_PROFILES).filter((candidate) => candidate.type === profileFilterType)
    : [];

  const parentPlate = plate.parentId
    ? architecture.plates.find((p) => p.id === plate.parentId)
    : null;

  const childBlocks = architecture.blocks.filter((b) => b.placementId === plate.id);
  const childPlates = architecture.plates.filter((p) => p.parentId === plate.id);

  const altText = plate.type === 'subnet'
    ? `${plate.subnetAccess === 'public' ? 'Public' : 'Private'} Subnet`
    : plate.type === 'region'
      ? 'Region'
      : plate.type.charAt(0).toUpperCase() + plate.type.slice(1);

  const handleRename = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== plate.name) {
      renamePlate(plate.id, trimmed);
      setNewName(trimmed);
    }
    setIsRenaming(false);
  }, [newName, plate.id, plate.name, renamePlate]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDialog(
      `Delete "${plate.name}"? All contained blocks will also be removed. This cannot be undone.`,
      'Delete Plate',
    );
    if (confirmed) {
      removePlate(plate.id);
      setSelectedId(null);
    }
  }, [plate.id, plate.name, removePlate, setSelectedId]);

  return (
    <div className={`detail-panel detail-panel--plate ${className}`}>
      <div className="detail-header">
        <img
          src={getPlateIconUrl(plate.type, plate.subnetAccess)}
          alt={altText}
          className="detail-header-icon-img"
        />
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            className="detail-header-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        ) : (
          <span className="detail-header-name">{plate.name}</span>
        )}
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">
            {plate.type === 'subnet' ? 'Subnet' : plate.type.charAt(0).toUpperCase() + plate.type.slice(1)}
            {plate.subnetAccess && ` (${plate.subnetAccess})`}
          </span>
        </div>

        {hasProfileSupport && (
          <>
            <div className="detail-property">
              <label className="detail-property-label" htmlFor={`plate-profile-${plate.id}`}>Profile</label>
              <span className="detail-property-value">
                <select
                  id={`plate-profile-${plate.id}`}
                  className="detail-property-select"
                  value={profileId}
                  onChange={(event) => setPlateProfile(plate.id, event.target.value as PlateProfileId)}
                >
                  {profileOptions.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.displayName} - {candidate.studsX}x{candidate.studsY}
                    </option>
                  ))}
                </select>
              </span>
            </div>

            <div className="detail-property">
              <span className="detail-property-label">Profile Note</span>
              <span className="detail-property-value detail-property-description">{profile.description}</span>
            </div>
          </>
        )}

        {parentPlate && (
          <div className="detail-property">
            <span className="detail-property-label">Parent</span>
            <span className="detail-property-value">{parentPlate.name}</span>
          </div>
        )}

        <div className="detail-property">
          <span className="detail-property-label">Size</span>
          <span className="detail-property-value detail-property-mono">
            {plate.size.width} × {plate.size.depth}
          </span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">Contents</span>
          <span className="detail-property-value">
            {childBlocks.length} block{childBlocks.length !== 1 ? 's' : ''}
            {childPlates.length > 0 && `, ${childPlates.length} subnet${childPlates.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className="detail-action-btn detail-action-btn--rename"
            onClick={() => {
              setNewName(plate.name);
              setIsRenaming(true);
            }}
          >
            📝 Rename
          </button>
          <button type="button" className="detail-action-btn detail-action-btn--delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connection Detail ─────────────────────────────────────

function ConnectionDetail({ connectionId, className }: { connectionId: string; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const connection = architecture.connections.find((c) => c.id === connectionId);

  if (!connection) return null;

  const sourceBlock = architecture.blocks.find((b) => b.id === connection.sourceId);
  const sourceActor = architecture.externalActors.find((a) => a.id === connection.sourceId);
  const targetBlock = architecture.blocks.find((b) => b.id === connection.targetId);

  return (
    <div className={`detail-panel detail-panel--connection ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">🔗</span>
        <span className="detail-header-name">{CONNECTION_TYPE_LABELS[connection.type]} Connection</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">{CONNECTION_TYPE_LABELS[connection.type]}</span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">From</span>
          <span className="detail-property-value">
            {sourceBlock ? (
              <>
                {BLOCK_ICONS[sourceBlock.category]} {sourceBlock.name}
              </>
            ) : sourceActor ? (
              <>
                {sourceActor.type === 'internet' ? '☁️' : '👤'} {sourceActor.name}
              </>
            ) : (
              'Unknown'
            )}
          </span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">To</span>
          <span className="detail-property-value">
            {targetBlock ? (
              <>
                {BLOCK_ICONS[targetBlock.category]} {targetBlock.name}
              </>
            ) : (
              'Unknown'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
