/**
 * Detail Panel — Resource Properties & Creation
 *
 * Shows resource properties with inline editing capability,
 * and resource creation grid when the worker is selected.
 * States:
 * - Nothing selected: Welcome message with tips
 * - Worker selected: Resource creation grid (Build Order)
 * - Single block/plate/connection selected: Editable properties
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.3
 */

import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BlockSvg } from '../../entities/block/BlockSvg';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import { BLOCK_FRIENDLY_NAMES, BLOCK_DESCRIPTIONS, BLOCK_ICONS, CONNECTION_TYPE_LABELS, DEFAULT_PLATE_PROFILE, getPlateProfile, isPlateProfileId, PLATE_PROFILES } from '../../shared/types/index';
import type { PlateProfileId } from '../../shared/types/index';
import type { Block, BlockCategory, Plate, ProviderType } from '@cloudblocks/schema';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockIconUrl, getPlateIconUrl } from '../../shared/utils/iconResolver';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
} from './useTechTree';
import { getBlockWorldPosition } from '../../shared/utils/position';
import './DetailPanel.css';
import './CommandCard.css';

interface DetailPanelProps {
  className?: string;
}

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];
const PROVIDER_RESOURCE_ALLOWLIST: Record<ProviderType, ReadonlySet<ResourceType>> = {
  azure: new Set(ALL_RESOURCES),
  aws: new Set(ALL_RESOURCES),
  gcp: new Set(ALL_RESOURCES),
};

type CreationGroupId = BlockCategory | 'plate';

const CREATION_GROUP_ORDER: CreationGroupId[] = [
  'plate', 'compute', 'database', 'storage', 'gateway',
  'function', 'queue', 'event', 'analytics', 'identity', 'observability',
];

function getCreationGroupMeta(groupId: CreationGroupId): { icon: string; label: string; color: string } {
  if (groupId === 'plate') {
    return { icon: '\u{1F9ED}', label: 'Network Foundations', color: '#2563EB' };
  }
  return {
    icon: BLOCK_ICONS[groupId],
    label: BLOCK_FRIENDLY_NAMES[groupId],
    color: getBlockColor('azure', undefined, groupId),
  };
}

function getCreationGroupId(type: ResourceType): CreationGroupId {
  return RESOURCE_DEFINITIONS[type].blockCategory ?? 'plate';
}

export function DetailPanel({ className = '' }: DetailPanelProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const selectedBlock = architecture.blocks.find((b) => b.id === selectedId);
  const selectedPlate = architecture.plates.find((p) => p.id === selectedId);
  const selectedConnection = architecture.connections.find((c) => c.id === selectedId);

  if (!selectedId) {
    const isEmptyOnboarding = architecture.plates.length === 0 && !showTemplateGallery;
    if (isEmptyOnboarding) return <IdleState className={className} />;
    return <WelcomeState className={className} />;
  }

  if (selectedId === 'worker-default') return <WorkerCreationPanel className={className} />;
  if (selectedBlock) return <BlockDetail block={selectedBlock} className={className} />;
  if (selectedPlate) return <PlateDetail plate={selectedPlate} className={className} />;
  if (selectedConnection) return <ConnectionDetail connectionId={selectedConnection.id} className={className} />;

  return <WelcomeState className={className} />;
}

function IdleState({ className }: { className: string }) {
  return (
    <div className={`detail-panel detail-panel--idle ${className}`}>
      <div className="detail-idle">
        <span className="detail-idle-icon">{'\u{1F4CB}'}</span>
        <p className="detail-idle-text">No selection</p>
      </div>
    </div>
  );
}

function WelcomeState({ className }: { className: string }) {
  return (
    <div className={`detail-panel detail-panel--welcome ${className}`}>
      <div className="detail-welcome">
        <h3 className="detail-welcome-title">Welcome to CloudBlocks!</h3>
        <p className="detail-welcome-text">
          Select the minifigure to open the Build Order,
          <br />
          or click a resource to view its properties.
        </p>
        <div className="detail-welcome-tip">
          <span className="detail-tip-icon">{'\u{1F4A1}'}</span>
          <span className="detail-tip-text">Tip: Start with Network</span>
        </div>
      </div>
    </div>
  );
}

function BlockDetail({ block, className }: { block: Block; className: string }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(block.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const renameBlock = useArchitectureStore((s) => s.renameBlock);

  useEffect(() => {
    if (isRenaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [isRenaming]);

  const parentPlate = architecture.plates.find((p) => p.id === block.placementId);
  const networkPlate = parentPlate?.parentId ? architecture.plates.find((p) => p.id === parentPlate.parentId) : parentPlate;

  const handleRename = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== block.name) { renameBlock(block.id, trimmed); setNewName(trimmed); }
    setIsRenaming(false);
  }, [newName, block.id, block.name, renameBlock]);

  const color = getBlockColor(block.provider ?? 'azure', block.subtype, block.category);
  const providerLabel = block.provider ? block.provider.toUpperCase() : null;
  const typeIdentity = block.provider || block.subtype
    ? [providerLabel, block.subtype].filter(Boolean).join(' / ')
    : BLOCK_FRIENDLY_NAMES[block.category];

  return (
    <div className={`detail-panel detail-panel--block ${className}`}>
      <div className="detail-header">
        <img src={getBlockIconUrl(block.provider ?? 'azure', block.category, block.subtype)} alt={BLOCK_FRIENDLY_NAMES[block.category]} className="detail-header-icon-img" />
        {isRenaming ? (
          <input ref={inputRef} type="text" className="detail-header-input" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()} />
        ) : (
          <span className="detail-header-name">{block.name}</span>
        )}
        <button type="button" className="detail-rename-btn" onClick={() => { setNewName(block.name); setIsRenaming(true); }} title="Rename">Rename</button>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">{typeIdentity}<span className="detail-property-hint" title={BLOCK_DESCRIPTIONS[block.category]}>{'\u2139\uFE0F'}</span></span>
        </div>
        {block.provider && (<div className="detail-property"><span className="detail-property-label">Provider</span><span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>{providerLabel}</span></div>)}
        {block.subtype && (<div className="detail-property"><span className="detail-property-label">Subtype</span><span className="detail-property-value">{block.subtype}</span></div>)}
        <div className="detail-property"><span className="detail-property-label">Category</span><span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>{block.category}</span></div>
        <div className="detail-property"><span className="detail-property-label">Network</span><span className="detail-property-value">{networkPlate?.name ?? 'None'}{parentPlate && parentPlate !== networkPlate && ` / ${parentPlate.name}`}</span></div>
        <div className="detail-property"><span className="detail-property-label">Position</span><span className="detail-property-value detail-property-mono">({block.position.x.toFixed(1)}, {block.position.y.toFixed(1)}, {block.position.z.toFixed(1)})</span></div>
      </div>
    </div>
  );
}

function PlateDetail({ plate, className }: { plate: Plate; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);
  const profileId = plate.profileId && isPlateProfileId(plate.profileId) ? plate.profileId : DEFAULT_PLATE_PROFILE[plate.type];
  const profile = getPlateProfile(profileId);
  const hasProfileSupport = plate.type === 'region' || plate.type === 'subnet';
  const profileFilterType = plate.type === 'subnet' ? 'subnet' : 'region';
  const profileOptions = hasProfileSupport ? Object.values(PLATE_PROFILES).filter((c) => c.type === profileFilterType) : [];
  const parentPlate = plate.parentId ? architecture.plates.find((p) => p.id === plate.parentId) : null;
  const childBlocks = architecture.blocks.filter((b) => b.placementId === plate.id);
  const childPlates = architecture.plates.filter((p) => p.parentId === plate.id);
  const altText = plate.type === 'subnet' ? `${plate.subnetAccess === 'public' ? 'Public' : 'Private'} Subnet` : plate.type === 'region' ? 'Region' : plate.type.charAt(0).toUpperCase() + plate.type.slice(1);

  return (
    <div className={`detail-panel detail-panel--plate ${className}`}>
      <div className="detail-header">
        <img src={getPlateIconUrl(plate.type, plate.subnetAccess)} alt={altText} className="detail-header-icon-img" />
        <span className="detail-header-name">{plate.name}</span>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property"><span className="detail-property-label">Type</span><span className="detail-property-value">{plate.type === 'subnet' ? 'Subnet' : plate.type.charAt(0).toUpperCase() + plate.type.slice(1)}{plate.subnetAccess && ` (${plate.subnetAccess})`}</span></div>
        {hasProfileSupport && (<>
          <div className="detail-property">
            <label className="detail-property-label" htmlFor={`plate-profile-${plate.id}`}>Profile</label>
            <span className="detail-property-value"><select id={`plate-profile-${plate.id}`} className="detail-property-select" value={profileId} onChange={(event) => setPlateProfile(plate.id, event.target.value as PlateProfileId)}>{profileOptions.map((c) => (<option key={c.id} value={c.id}>{c.displayName} - {c.studsX}x{c.studsY}</option>))}</select></span>
          </div>
          <div className="detail-property"><span className="detail-property-label">Profile Note</span><span className="detail-property-value detail-property-description">{profile.description}</span></div>
        </>)}
        {parentPlate && (<div className="detail-property"><span className="detail-property-label">Parent</span><span className="detail-property-value">{parentPlate.name}</span></div>)}
        <div className="detail-property"><span className="detail-property-label">Size</span><span className="detail-property-value detail-property-mono">{plate.size.width} &times; {plate.size.depth}</span></div>
        <div className="detail-property"><span className="detail-property-label">Contents</span><span className="detail-property-value">{childBlocks.length} block{childBlocks.length !== 1 ? 's' : ''}{childPlates.length > 0 && `, ${childPlates.length} subnet${childPlates.length !== 1 ? 's' : ''}`}</span></div>
      </div>
    </div>
  );
}

function WorkerCreationPanel({ className }: { className: string }) {
  const techTree = useTechTree();
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startBuild = useWorkerStore((s) => s.startBuild);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback((name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); }, [isSoundMuted]);
  const counterRef = useRef(0);
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];
  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((r) => getCreationGroupId(r) === groupId)
      .filter((r) => providerResources.has(r))
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));
    return { groupId, resources };
  }).filter((g) => g.resources.length > 0);

  const handleBuild = useCallback((type: ResourceType) => {
    const def = RESOURCE_DEFINITIONS[type];
    if (def.category === 'plate') {
      if (type === 'network') { addPlate('region', 'VNet', null); playSound('block-snap'); }
      else if (type === 'public-subnet') { const t = techTree.getTargetPlateId(type); if (t) { addPlate('subnet', 'Public Subnet', t, 'public'); playSound('block-snap'); } }
      else if (type === 'private-subnet') { const t = techTree.getTargetPlateId(type); if (t) { addPlate('subnet', 'Private Subnet', t, 'private'); playSound('block-snap'); } }
      return;
    }
    if (!def.blockCategory) return;
    const targetId = techTree.getTargetPlateId(type);
    if (!targetId) { toast.error('Please create a Network first.'); return; }
    const knownBlockIds = new Set(architecture.blocks.map((b) => b.id));
    counterRef.current += 1;
    const name = `${getResourceLabel(type, activeProvider)} ${counterRef.current}`;
    addBlock(def.blockCategory, name, targetId, activeProvider);
    const nextBlocks = useArchitectureStore.getState().workspace.architecture.blocks;
    const createdBlock = nextBlocks.find((b) => !knownBlockIds.has(b.id) && b.name === name && b.placementId === targetId);
    if (createdBlock) {
      const nextPlates = useArchitectureStore.getState().workspace.architecture.plates;
      const pp = nextPlates.find((p) => p.id === createdBlock.placementId);
      if (pp) startBuild(createdBlock.id, getBlockWorldPosition(createdBlock, pp));
    }
  }, [activeProvider, addBlock, addPlate, architecture.blocks, startBuild, techTree, playSound]);

  return (
    <div className={`detail-panel detail-panel--worker ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">{'\u{1F9D1}\u200D\u{1F527}'}</span>
        <span className="detail-header-name">Build Order</span>
      </div>
      <div className="command-card-grid">
        <div className="command-card-creation-groups">
          {groupedResources.map(({ groupId, resources }) => {
            const groupMeta = getCreationGroupMeta(groupId);
            return (
              <section key={groupId} className="command-card-category-group" aria-label={`${groupMeta.label} resource group`}>
                <header className="command-card-category-header" style={{ '--category-color': groupMeta.color } as CSSProperties}>
                  <span className="command-card-category-icon" aria-hidden="true">{groupMeta.icon}</span>
                  <span className="command-card-category-label">{groupMeta.label}</span>
                </header>
                <div className="command-card-category-grid">
                  {resources.map((type) => {
                    const def = RESOURCE_DEFINITIONS[type];
                    const enabled = techTree.isEnabled(type);
                    const disabledReason = techTree.getDisabledReason(type);
                    return (
                      <button key={type} type="button" className={`command-card-btn command-card-resource-btn ${enabled ? '' : 'disabled'}`} data-resource-type={type} onClick={() => enabled && handleBuild(type)} disabled={!enabled} title={enabled ? `Build ${getResourceLabel(type, activeProvider)}` : disabledReason ?? undefined}>
                        <span className="command-btn-icon">{def.blockCategory && <BlockSvg category={def.blockCategory} provider={activeProvider} />}{!def.blockCategory && def.icon}</span>
                        <span className="command-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
                        {!enabled && disabledReason && <span className="command-btn-requirement">Needs: {disabledReason}</span>}
                        {!enabled && <span className="command-btn-lock">{'\u{1F512}'}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
        <span className="detail-header-icon">{'\u{1F517}'}</span>
        <span className="detail-header-name">{CONNECTION_TYPE_LABELS[connection.type]} Connection</span>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property"><span className="detail-property-label">Type</span><span className="detail-property-value">{CONNECTION_TYPE_LABELS[connection.type]}</span></div>
        <div className="detail-property"><span className="detail-property-label">From</span><span className="detail-property-value">{sourceBlock ? (<>{BLOCK_ICONS[sourceBlock.category]} {sourceBlock.name}</>) : sourceActor ? (<>{sourceActor.type === 'internet' ? '\u2601\uFE0F' : '\u{1F464}'} {sourceActor.name}</>) : 'Unknown'}</span></div>
        <div className="detail-property"><span className="detail-property-label">To</span><span className="detail-property-value">{targetBlock ? (<>{BLOCK_ICONS[targetBlock.category]} {targetBlock.name}</>) : 'Unknown'}</span></div>
      </div>
    </div>
  );
}
