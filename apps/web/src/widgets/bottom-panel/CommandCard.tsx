/**
 * Command Card -- Context-Sensitive Action Grid
 *
 * Modes:
 * - Worker selected: 2-level (Build/Connect/Move/Relocate -> resource grid)
 * - Block selected: Rename, Copy, Delete + config form (tier, scale, config, Apply)
 * - Plate selected: Rename, Delete + profile/address form + Apply
 * - Connection selected: Delete + type dropdown + Apply
 * - Nothing selected: empty hint
 *
 * Based on VISUAL_DESIGN_SPEC.md SS7.5
 */

import { useRef, useCallback, useState, type CSSProperties } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BlockSvg } from '../../entities/block/BlockSvg';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import { promptDialog } from '../../shared/ui/PromptDialog';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import {
  useTechTree,
  RESOURCE_DEFINITIONS,
  getResourceLabel,
  getResourceShortLabel,
  type ResourceType,
} from './useTechTree';
import { BLOCK_FRIENDLY_NAMES, BLOCK_ICONS, CONNECTION_TYPE_LABELS } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockWorldPosition } from '../../shared/utils/position';
import type { BlockCategory, ConnectionType, ProviderType } from '@cloudblocks/schema';
import type { PlateProfileId } from '../../shared/types/index';
import './CommandCard.css';

interface CommandCardProps {
  className?: string;
}

// ---- Helpers ----------------------------------------------------------------

const ALL_RESOURCES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];
const PROVIDER_RESOURCE_ALLOWLIST: Record<ProviderType, ReadonlySet<ResourceType>> = {
  azure: new Set(ALL_RESOURCES),
  aws: new Set(ALL_RESOURCES),
  gcp: new Set(ALL_RESOURCES),
};

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

const CONNECTION_TYPES: ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];
const TIER_OPTIONS = ['Free', 'Basic', 'Standard', 'Premium'] as const;

function usePlaySound() {
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  return useCallback((name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); }, [isSoundMuted]);
}

// ---- Root Component ---------------------------------------------------------

export function CommandCard({ className = '' }: CommandCardProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const isWorkerSelected = selectedId === 'worker-default';
  const selectedBlock = selectedId ? architecture.blocks.find((b) => b.id === selectedId) ?? null : null;
  const selectedPlate = selectedId ? architecture.plates.find((p) => p.id === selectedId) ?? null : null;
  const selectedConnection = selectedId ? architecture.connections.find((c) => c.id === selectedId) ?? null : null;

  const isBuildOrderOpen = useUIStore((s) => s.isBuildOrderOpen);
  const toggleBuildOrder = useUIStore((s) => s.toggleBuildOrder);

  const headerText = isWorkerSelected
    ? 'Worker Actions'
    : selectedBlock
      ? 'Block Actions'
      : selectedPlate
        ? 'Plate Actions'
        : selectedConnection
          ? 'Connection Actions'
          : 'Command Card';

  const modeContent = isWorkerSelected
    ? <WorkerMode />
    : selectedBlock
      ? <BlockMode />
      : selectedPlate
        ? <PlateMode />
        : selectedConnection
          ? <ConnectionMode />
          : <EmptyHint />;

  return (
    <div className={`command-card ${isWorkerSelected ? 'command-card--worker-mode' : ''} ${className}`}>
      <div className="command-card-header">
        <span className="command-card-header-text">{headerText}</span>
        {isBuildOrderOpen && (
          <button
            type="button"
            className="command-card-collapse-btn"
            onClick={toggleBuildOrder}
            aria-label="Collapse Build Order panel"
            title="Collapse"
          >
            &raquo;
          </button>
        )}
      </div>
      <div className="command-card-grid">
        {modeContent}
      </div>
    </div>
  );
}

// ---- Empty Hint -------------------------------------------------------------

function EmptyHint() {
  return (
    <div className="command-card-empty-hint">
      <span className="command-card-empty-icon">{'\u{1F4CB}'}</span>
      <p className="command-card-empty-text">Select a worker, block, plate, or connection to see available actions.</p>
    </div>
  );
}

// ---- Worker Mode (2-level) --------------------------------------------------

type WorkerLevel = 'actions' | 'build';

function WorkerMode() {
  const [level, setLevel] = useState<WorkerLevel>('actions');
  const setToolMode = useUIStore((s) => s.setToolMode);
  const playSound = usePlaySound();

  if (level === 'build') {
    return <WorkerBuildGrid onBack={() => setLevel('actions')} />;
  }

  return (
    <div className="command-card-actions-list">
      <button
        type="button"
        className="command-card-btn command-card-action-btn"
        onClick={() => { setLevel('build'); playSound('block-snap'); }}
        title="Build (Q)"
      >
        <span className="command-btn-icon">{'\u{1F3D7}\uFE0F'}</span>
        <span className="command-btn-label">Build</span>
        <span className="command-btn-hotkey">Q</span>
      </button>

      <button
        type="button"
        className="command-card-btn command-card-action-btn command-card-btn--connect"
        onClick={() => { setToolMode('connect'); playSound('block-snap'); }}
        title="Connect (W)"
      >
        <span className="command-btn-icon">{'\u{1F517}'}</span>
        <span className="command-btn-label">Connect</span>
        <span className="command-btn-hotkey">W</span>
      </button>

      <button type="button" className="command-card-btn command-card-action-btn" disabled title="Move (E) - coming soon">
        <span className="command-btn-icon">{'\u{1F4E6}'}</span>
        <span className="command-btn-label">Move</span>
        <span className="command-btn-hotkey">E</span>
      </button>

      <button type="button" className="command-card-btn command-card-action-btn" disabled title="Relocate (R) - coming soon">
        <span className="command-btn-icon">{'\u{1F69A}'}</span>
        <span className="command-btn-label">Relocate</span>
        <span className="command-btn-hotkey">R</span>
      </button>
    </div>
  );
}

function WorkerBuildGrid({ onBack }: { onBack: () => void }) {
  const techTree = useTechTree();
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const startBuild = useWorkerStore((s) => s.startBuild);
  const counterRef = useRef(0);
  const providerResources = PROVIDER_RESOURCE_ALLOWLIST[activeProvider];

  const groupedResources = CREATION_GROUP_ORDER.map((groupId) => {
    const resources = ALL_RESOURCES
      .filter((resource) => getCreationGroupId(resource) === groupId)
      .filter((resource) => providerResources.has(resource))
      .filter((resource) => Boolean(RESOURCE_DEFINITIONS[resource].blockCategory))
      .sort((a, b) => RESOURCE_DEFINITIONS[a].label.localeCompare(RESOURCE_DEFINITIONS[b].label));
    return { groupId, resources };
  }).filter((group) => group.resources.length > 0);

  const handleBuild = useCallback((type: ResourceType) => {
    const def = RESOURCE_DEFINITIONS[type];
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
  }, [activeProvider, addBlock, architecture.blocks, startBuild, techTree]);

  return (
    <div className="command-card-creation-groups">
      <button
        type="button"
        className="command-card-back-btn"
        onClick={onBack}
        aria-label="Back to worker actions"
      >
        {'\u2190 Back'}
      </button>

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
                  <button
                    key={type}
                    type="button"
                    className={`command-card-btn command-card-resource-btn ${enabled ? '' : 'disabled'}`}
                    data-resource-type={type}
                    onClick={() => enabled && handleBuild(type)}
                    disabled={!enabled}
                    title={enabled ? `Build ${getResourceLabel(type, activeProvider)}` : disabledReason ?? undefined}
                  >
                    <span className="command-btn-icon">
                      {def.blockCategory && <BlockSvg category={def.blockCategory} provider={activeProvider} />}
                    </span>
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
  );
}

// ---- Block Mode -------------------------------------------------------------

function BlockMode() {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const duplicateBlock = useArchitectureStore((s) => s.duplicateBlock);
  const renameBlock = useArchitectureStore((s) => s.renameBlock);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const updateBlockConfig = useArchitectureStore((s) => s.updateBlockConfig);
  const triggerUpgradeAnimation = useUIStore((s) => s.triggerUpgradeAnimation);
  const playSound = usePlaySound();

  const block = selectedId ? architecture.blocks.find((b) => b.id === selectedId) : null;

  const [tier, setTier] = useState<string>(block?.config?.tier as string ?? 'Standard');
  const [scale, setScale] = useState<string>(String(block?.config?.scale ?? '1'));
  const [config, setConfig] = useState<string>(block?.config?.notes as string ?? '');

  const handleRename = useCallback(async () => {
    if (!block) return;
    const newName = await promptDialog('Rename block:', 'Rename', block.name);
    if (newName !== null && newName.trim() !== '') {
      renameBlock(block.id, newName.trim());
    }
  }, [block, renameBlock]);

  const handleCopy = useCallback(() => {
    if (!selectedId) return;
    duplicateBlock(selectedId);
    playSound('block-snap');
  }, [selectedId, duplicateBlock, playSound]);

  const handleDelete = useCallback(async () => {
    if (!selectedId || !block) return;
    const confirmed = await confirmDialog(`Delete "${block.name}"?`, 'Delete Block');
    if (!confirmed) return;
    removeBlock(selectedId);
    setSelectedId(null);
    playSound('delete');
  }, [selectedId, block, removeBlock, setSelectedId, playSound]);

  const handleApply = useCallback(() => {
    if (!selectedId) return;
    const scaleNum = Number.parseInt(scale, 10);
    updateBlockConfig(selectedId, {
      tier,
      scale: Number.isFinite(scaleNum) && scaleNum > 0 ? scaleNum : 1,
      notes: config,
    });
    triggerUpgradeAnimation(selectedId);
    playSound('block-snap');
  }, [selectedId, tier, scale, config, updateBlockConfig, triggerUpgradeAnimation, playSound]);

  if (!block) return null;

  return (
    <div className="command-card-mode-content">
      <div className="command-card-actions-row">
        <button type="button" className="command-card-btn command-card-action-btn" onClick={handleRename} title="Rename (Q)">
          <span className="command-btn-icon">{'\u{1F4DD}'}</span>
          <span className="command-btn-label">Rename</span>
          <span className="command-btn-hotkey">Q</span>
        </button>

        <button type="button" className="command-card-btn command-card-action-btn" onClick={handleCopy} title="Copy (W)">
          <span className="command-btn-icon">{'\u{1F4CB}'}</span>
          <span className="command-btn-label">Copy</span>
          <span className="command-btn-hotkey">W</span>
        </button>

        <button type="button" className="command-card-btn command-card-action-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
          <span className="command-btn-icon">{'\u{1F5D1}\uFE0F'}</span>
          <span className="command-btn-label">Delete</span>
          <span className="command-btn-hotkey">E</span>
        </button>
      </div>

      <div className="command-card-form">
        <label className="command-card-form-label">
          Tier
          <select className="command-card-form-select" value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="command-card-form-label">
          Scale
          <input
            type="number"
            className="command-card-form-input"
            value={scale}
            min={1}
            onChange={(e) => setScale(e.target.value)}
          />
        </label>

        <label className="command-card-form-label">
          Config
          <input
            type="text"
            className="command-card-form-input"
            value={config}
            placeholder="notes..."
            onChange={(e) => setConfig(e.target.value)}
          />
        </label>

        <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
          <span className="command-btn-label">Apply</span>
        </button>
      </div>
    </div>
  );
}

// ---- Plate Mode -------------------------------------------------------------

function PlateMode() {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const renamePlate = useArchitectureStore((s) => s.renamePlate);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);
  const playSound = usePlaySound();

  const plate = selectedId ? architecture.plates.find((p) => p.id === selectedId) : null;

  const [addressSpace, setAddressSpace] = useState<string>(plate?.metadata?.addressSpace as string ?? '10.0.0.0/16');

  const handleRename = useCallback(async () => {
    if (!plate) return;
    const newName = await promptDialog('Rename plate:', 'Rename', plate.name);
    if (newName !== null && newName.trim() !== '') {
      renamePlate(plate.id, newName.trim());
    }
  }, [plate, renamePlate]);

  const handleDelete = useCallback(async () => {
    if (!selectedId || !plate) return;
    const confirmed = await confirmDialog(`Delete "${plate.name}"?`, 'Delete Plate');
    if (!confirmed) return;
    removePlate(selectedId);
    setSelectedId(null);
    playSound('delete');
  }, [selectedId, plate, removePlate, setSelectedId, playSound]);

  const handleApply = useCallback(() => {
    if (!plate) return;
    // Address space is stored in metadata -- for now just toast confirmation
    toast.success(`Plate "${plate.name}" updated.`);
    playSound('block-snap');
  }, [plate, playSound]);

  if (!plate) return null;

  const hasProfileSupport = plate.type === 'region' || plate.type === 'subnet';

  return (
    <div className="command-card-mode-content">
      <div className="command-card-actions-row">
        <button type="button" className="command-card-btn command-card-action-btn" onClick={handleRename} title="Rename (Q)">
          <span className="command-btn-icon">{'\u{1F4DD}'}</span>
          <span className="command-btn-label">Rename</span>
          <span className="command-btn-hotkey">Q</span>
        </button>

        <button type="button" className="command-card-btn command-card-action-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
          <span className="command-btn-icon">{'\u{1F5D1}\uFE0F'}</span>
          <span className="command-btn-label">Delete</span>
          <span className="command-btn-hotkey">E</span>
        </button>
      </div>

      <div className="command-card-form">
        {hasProfileSupport && (
          <label className="command-card-form-label">
            Profile
            <select
              className="command-card-form-select"
              value={plate.profileId ?? ''}
              onChange={(e) => {
                if (e.target.value) {
                  setPlateProfile(plate.id, e.target.value as PlateProfileId);
                }
              }}
            >
              <option value="">Default</option>
            </select>
          </label>
        )}

        <label className="command-card-form-label">
          Address Space
          <input
            type="text"
            className="command-card-form-input"
            value={addressSpace}
            onChange={(e) => setAddressSpace(e.target.value)}
          />
        </label>

        <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
          <span className="command-btn-label">Apply</span>
        </button>
      </div>
    </div>
  );
}

// ---- Connection Mode --------------------------------------------------------

function ConnectionMode() {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const updateConnectionType = useArchitectureStore((s) => s.updateConnectionType);
  const playSound = usePlaySound();

  const connection = selectedId ? architecture.connections.find((c) => c.id === selectedId) : null;
  const [connType, setConnType] = useState<ConnectionType>(connection?.type ?? 'dataflow');

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    removeConnection(selectedId);
    setSelectedId(null);
    playSound('delete');
  }, [selectedId, removeConnection, setSelectedId, playSound]);

  const handleApply = useCallback(() => {
    if (!selectedId) return;
    updateConnectionType(selectedId, connType);
    playSound('block-snap');
  }, [selectedId, connType, updateConnectionType, playSound]);

  if (!connection) return null;

  return (
    <div className="command-card-mode-content">
      <div className="command-card-actions-row">
        <button type="button" className="command-card-btn command-card-action-btn command-card-btn--delete" onClick={handleDelete} title="Delete (E)">
          <span className="command-btn-icon">{'\u{1F5D1}\uFE0F'}</span>
          <span className="command-btn-label">Delete</span>
          <span className="command-btn-hotkey">E</span>
        </button>
      </div>

      <div className="command-card-form">
        <label className="command-card-form-label">
          Type
          <select className="command-card-form-select" value={connType} onChange={(e) => setConnType(e.target.value as ConnectionType)}>
            {CONNECTION_TYPES.map((t) => (
              <option key={t} value={t}>{CONNECTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>

        <button type="button" className="command-card-btn command-card-btn--apply" onClick={handleApply} title="Apply changes">
          <span className="command-btn-label">Apply</span>
        </button>
      </div>
    </div>
  );
}
