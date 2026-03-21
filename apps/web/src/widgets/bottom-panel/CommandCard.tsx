/**
 * Command Card -- Context-Sensitive Action Panel
 *
 * Displays different controls depending on what is selected:
 * - Minifigure (worker): 2-level Build/Connect/Move/Relocate + creation grid
 * - Block: Rename, Copy, Delete + Tier/Scale/Config + Apply
 * - Plate: Rename, Delete + Profile/Address Space + Apply
 * - Connection: Delete + Type dropdown + Apply
 * - Nothing: empty state or creation grid
 *
 * Part of issue #1035
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BlockSvg } from '../../entities/block/BlockSvg';
import { promptDialog } from '../../shared/ui/PromptDialog';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
} from './useTechTree';
import { BLOCK_FRIENDLY_NAMES, BLOCK_ICONS, CONNECTION_TYPE_LABELS, DEFAULT_PLATE_PROFILE, isPlateProfileId, PLATE_PROFILES } from '../../shared/types/index';
import type { PlateProfileId } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockWorldPosition } from '../../shared/utils/position';
import type { Block, BlockCategory, ConnectionType, Plate } from '@cloudblocks/schema';
import './CommandCard.css';

interface CommandCardProps {
  className?: string;
}

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];

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

const CONNECTION_TYPES: ConnectionType[] = ['dataflow', 'http', 'internal', 'async'];

interface InfraSettingsConfig {
  tier?: string;
  scale?: number;
  config?: string;
}

const CATEGORY_DEFAULTS: Partial<Record<BlockCategory, InfraSettingsConfig>> = {
  compute: { tier: 'standard', scale: 1 },
  database: { tier: 'standard', scale: 1 },
  function: { tier: 'consumption', scale: 1 },
  gateway: { tier: 'standard', scale: 1 },
  storage: { tier: 'standard', scale: 1 },
  queue: { tier: 'standard', scale: 1 },
  event: { tier: 'standard', scale: 1 },
  analytics: { tier: 'standard', scale: 1 },
  identity: { tier: 'standard', scale: 1 },
  observability: { tier: 'standard', scale: 1 },
};

export function CommandCard({ className = '' }: CommandCardProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const isWorkerSelected = selectedId === 'worker-default';

  const selectedBlock = selectedId
    ? architecture.blocks.find((b) => b.id === selectedId) ?? null
    : null;
  const selectedPlate = selectedId
    ? architecture.plates.find((p) => p.id === selectedId) ?? null
    : null;
  const selectedConnection = selectedId
    ? architecture.connections.find((c) => c.id === selectedId) ?? null
    : null;

  if (isWorkerSelected) return <WorkerMode className={className} />;
  if (selectedBlock) return <BlockMode block={selectedBlock} className={className} />;
  if (selectedPlate) return <PlateMode plate={selectedPlate} className={className} />;
  if (selectedConnection) return <ConnectionMode connectionId={selectedConnection.id} className={className} />;
  return <EmptyMode className={className} />;
}

type WorkerLevel = 'actions' | 'build';

function WorkerMode({ className }: { className: string }) {
  const [level, setLevel] = useState<WorkerLevel>('actions');
  const setToolMode = useUIStore((s) => s.setToolMode);

  useEffect(() => {
    if (level !== 'build') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLevel('actions');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level]);

  if (level === 'build') {
    return (
      <div className={`command-card ${className}`}>
        <div className="command-card-header">
          <button type="button" className="command-card-back-btn" onClick={() => setLevel('actions')} aria-label="Back to worker actions">
            Back
          </button>
          <span className="command-card-header-text">Build Resource</span>
        </div>
        <div className="command-card-body">
          <WorkerCreationGrid />
        </div>
      </div>
    );
  }

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header">
        <span className="command-card-header-text">Worker Actions</span>
      </div>
      <div className="command-card-body">
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={() => setLevel('build')} title="Build (Q)">
            <span className="command-btn-label">Build</span><span className="command-btn-hotkey">Q</span>
          </button>
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={() => setToolMode('connect')} title="Connect (W)">
            <span className="command-btn-label">Connect</span><span className="command-btn-hotkey">W</span>
          </button>
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={() => toast('Drag the minifigure to move it.', { icon: '\u{1F9D1}\u200D\u{1F527}' })} title="Move (E)">
            <span className="command-btn-label">Move</span><span className="command-btn-hotkey">E</span>
          </button>
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={() => toast('Drag a block to relocate it.', { icon: '\u{1F4E6}' })} title="Relocate (R)">
            <span className="command-btn-label">Relocate</span><span className="command-btn-hotkey">R</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkerCreationGrid() {
  const techTree = useTechTree();
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startBuild = useWorkerStore((s) => s.startBuild);
  const counterRef = useRef(0);

  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((r) => getCreationGroupId(r) === groupId)
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));
    return { groupId, resources };
  }).filter((g) => g.resources.length > 0);

  const handleBuild = useCallback((type: ResourceType) => {
    const def = RESOURCE_DEFINITIONS[type];
    if (def.category === 'plate') {
      if (type === 'network') addPlate('region', 'VNet', null);
      else if (type === 'public-subnet') { const t = techTree.getTargetPlateId(type); if (t) addPlate('subnet', 'Public Subnet', t, 'public'); }
      else if (type === 'private-subnet') { const t = techTree.getTargetPlateId(type); if (t) addPlate('subnet', 'Private Subnet', t, 'private'); }
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
      const parentPlate = nextPlates.find((p) => p.id === createdBlock.placementId);
      if (parentPlate) startBuild(createdBlock.id, getBlockWorldPosition(createdBlock, parentPlate));
    }
  }, [activeProvider, addPlate, addBlock, architecture.blocks, startBuild, techTree]);

  return (
    <div className="command-card-creation-groups">
      {groupedResources.map(({ groupId, resources }) => {
        const meta = getCreationGroupMeta(groupId);
        return (
          <section key={groupId} className="command-card-category-group" aria-label={`${meta.label} resource group`}>
            <header className="command-card-category-header" style={{ '--category-color': meta.color } as React.CSSProperties}>
              <span className="command-card-category-icon" aria-hidden="true">{meta.icon}</span>
              <span className="command-card-category-label">{meta.label}</span>
            </header>
            <div className="command-card-category-grid">
              {resources.map((type) => {
                const def = RESOURCE_DEFINITIONS[type];
                const enabled = techTree.isEnabled(type);
                const reason = techTree.getDisabledReason(type);
                return (
                  <button key={type} type="button" className={`command-card-btn command-card-resource-btn ${enabled ? '' : 'disabled'}`}
                    data-resource-type={type} onClick={() => enabled && handleBuild(type)} disabled={!enabled}
                    title={enabled ? `Build ${getResourceLabel(type, activeProvider)}` : reason ?? undefined}>
                    <span className="command-btn-icon">{def.blockCategory ? <BlockSvg category={def.blockCategory} provider={activeProvider} /> : def.icon}</span>
                    <span className="command-btn-label">{getResourceShortLabel(type, activeProvider)}</span>
                    {!enabled && <span className="command-btn-lock">{'\u{1F512}'}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BlockMode({ block, className }: { block: Block; className: string }) {
  const renameBlock = useArchitectureStore((s) => s.renameBlock);
  const duplicateBlock = useArchitectureStore((s) => s.duplicateBlock);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const updateBlockConfig = useArchitectureStore((s) => s.updateBlockConfig);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const triggerUpgradeAnimation = useUIStore((s) => s.triggerUpgradeAnimation);
  const categoryDefaults = CATEGORY_DEFAULTS[block.category] ?? { tier: 'standard', scale: 1 };
  const existingConfig = (block.config ?? {}) as Record<string, unknown>;
  const [tier, setTier] = useState<string>((existingConfig.tier as string) ?? categoryDefaults.tier ?? 'standard');
  const [scale, setScale] = useState<number>((existingConfig.scale as number) ?? categoryDefaults.scale ?? 1);
  const [configText, setConfigText] = useState<string>((existingConfig.config as string) ?? '');

  const handleRename = useCallback(async () => {
    const newName = await promptDialog('Rename block:', 'Rename', block.name);
    if (newName !== null && newName.trim() !== '') renameBlock(block.id, newName.trim());
  }, [block.id, block.name, renameBlock]);
  const handleCopy = useCallback(() => duplicateBlock(block.id), [duplicateBlock, block.id]);
  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDialog(`Delete "${block.name}"? This cannot be undone.`, 'Delete Block');
    if (confirmed) { removeBlock(block.id); setSelectedId(null); }
  }, [block.id, block.name, removeBlock, setSelectedId]);
  const handleApply = useCallback(() => {
    const config: Record<string, unknown> = { tier, scale };
    if (configText.trim()) config.config = configText.trim();
    updateBlockConfig(block.id, config);
    triggerUpgradeAnimation(block.id);
  }, [block.id, tier, scale, configText, updateBlockConfig, triggerUpgradeAnimation]);

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header"><span className="command-card-header-text">Block: {block.name}</span></div>
      <div className="command-card-body">
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={handleRename} title="Rename (Q)">
            <span className="command-btn-label">Rename</span><span className="command-btn-hotkey">Q</span>
          </button>
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={handleCopy} title="Copy (W)">
            <span className="command-btn-label">Copy</span><span className="command-btn-hotkey">W</span>
          </button>
          <button type="button" className="command-card-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
            <span className="command-btn-label">Delete</span><span className="command-btn-hotkey">E</span>
          </button>
        </div>
        <div className="command-card-row command-card-row--inputs">
          <label className="command-card-input-group"><span className="command-card-input-label">Tier</span>
            <select className="command-card-select" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="free">Free</option><option value="basic">Basic</option><option value="standard">Standard</option>
              <option value="premium">Premium</option><option value="consumption">Consumption</option>
            </select>
          </label>
          <label className="command-card-input-group"><span className="command-card-input-label">Scale</span>
            <input type="number" className="command-card-input" value={scale} onChange={(e) => setScale(Number(e.target.value))} min={1} max={100} />
          </label>
          <label className="command-card-input-group"><span className="command-card-input-label">Config</span>
            <input type="text" className="command-card-input" value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
            <span className="command-btn-label">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PlateMode({ plate, className }: { plate: Plate; className: string }) {
  const renamePlate = useArchitectureStore((s) => s.renamePlate);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const hasProfileSupport = plate.type === 'region' || plate.type === 'subnet';
  const profileFilterType = plate.type === 'subnet' ? 'subnet' : 'region';
  const profileOptions = hasProfileSupport ? Object.values(PLATE_PROFILES).filter((c) => c.type === profileFilterType) : [];
  const currentProfileId = plate.profileId && isPlateProfileId(plate.profileId) ? plate.profileId : DEFAULT_PLATE_PROFILE[plate.type];
  const [profileId, setProfileIdLocal] = useState<PlateProfileId>(currentProfileId);
  const [addressSpace, setAddressSpace] = useState<string>(
    ((plate as unknown as Record<string, unknown>).addressSpace as string) ?? '10.0.0.0/16',
  );

  const handleRename = useCallback(async () => {
    const newName = await promptDialog('Rename plate:', 'Rename', plate.name);
    if (newName !== null && newName.trim() !== '') renamePlate(plate.id, newName.trim());
  }, [plate.id, plate.name, renamePlate]);
  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDialog(`Delete "${plate.name}"? All contained blocks will also be removed.`, 'Delete Plate');
    if (confirmed) { removePlate(plate.id); setSelectedId(null); }
  }, [plate.id, plate.name, removePlate, setSelectedId]);
  const handleApply = useCallback(() => {
    if (hasProfileSupport) setPlateProfile(plate.id, profileId);
  }, [plate.id, profileId, hasProfileSupport, setPlateProfile]);

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header"><span className="command-card-header-text">Plate: {plate.name}</span></div>
      <div className="command-card-body">
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--yellow" onClick={handleRename} title="Rename (Q)">
            <span className="command-btn-label">Rename</span><span className="command-btn-hotkey">Q</span>
          </button>
          <div className="command-card-btn command-card-btn--empty" />
          <button type="button" className="command-card-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
            <span className="command-btn-label">Delete</span><span className="command-btn-hotkey">E</span>
          </button>
        </div>
        <div className="command-card-row command-card-row--inputs">
          {hasProfileSupport ? (
            <label className="command-card-input-group"><span className="command-card-input-label">Profile</span>
              <select className="command-card-select" value={profileId} onChange={(e) => setProfileIdLocal(e.target.value as PlateProfileId)}>
                {profileOptions.map((o) => <option key={o.id} value={o.id}>{o.displayName}</option>)}
              </select>
            </label>
          ) : <div className="command-card-input-group" />}
          <label className="command-card-input-group"><span className="command-card-input-label">Address Space</span>
            <input type="text" className="command-card-input" value={addressSpace} onChange={(e) => setAddressSpace(e.target.value)} placeholder="10.0.0.0/16" />
          </label>
        </div>
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
            <span className="command-btn-label">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectionMode({ connectionId, className }: { connectionId: string; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const updateConnectionType = useArchitectureStore((s) => s.updateConnectionType);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const connection = architecture.connections.find((c) => c.id === connectionId);
  const [connType, setConnType] = useState<ConnectionType>(connection?.type ?? 'dataflow');
  if (!connection) return null;
  const handleDelete = () => { removeConnection(connectionId); setSelectedId(null); };
  const handleApply = () => { updateConnectionType(connectionId, connType); };

  return (
    <div className={`command-card ${className}`}>
      <div className="command-card-header"><span className="command-card-header-text">Connection</span></div>
      <div className="command-card-body">
        <div className="command-card-row">
          <div className="command-card-btn command-card-btn--empty" />
          <div className="command-card-btn command-card-btn--empty" />
          <button type="button" className="command-card-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
            <span className="command-btn-label">Delete</span><span className="command-btn-hotkey">E</span>
          </button>
        </div>
        <div className="command-card-row command-card-row--inputs">
          <label className="command-card-input-group command-card-input-group--wide"><span className="command-card-input-label">Type</span>
            <select className="command-card-select" value={connType} onChange={(e) => setConnType(e.target.value as ConnectionType)}>
              {CONNECTION_TYPES.map((t) => <option key={t} value={t}>{CONNECTION_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
        </div>
        <div className="command-card-row">
          <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
            <span className="command-btn-label">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyMode({ className }: { className: string }) {
  return (
    <div className={`command-card command-card--empty ${className}`}>
      <div className="command-card-header"><span className="command-card-header-text">Command Card</span></div>
      <div className="command-card-body">
        <p className="command-card-empty-text">Select an element to see actions, or click the minifigure to build.</p>
      </div>
    </div>
  );
}
