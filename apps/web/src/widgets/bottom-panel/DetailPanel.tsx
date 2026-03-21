/**
 * Detail Panel -- Read-Only Resource Properties
 *
 * Shows resource properties as read-only text.
 * States:
 * - Nothing selected: Welcome message with tips
 * - Worker selected: Worker state info
 * - Block selected: Read-only properties + description
 * - Plate selected: Read-only properties
 * - Connection selected: Read-only connection details
 *
 * Based on VISUAL_DESIGN_SPEC.md section 7.3
 */

import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { BLOCK_FRIENDLY_NAMES, BLOCK_DESCRIPTIONS, BLOCK_ICONS, CONNECTION_TYPE_LABELS, DEFAULT_PLATE_PROFILE, getPlateProfile, isPlateProfileId } from '../../shared/types/index';
import type { Block, Plate } from '@cloudblocks/schema';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockIconUrl, getPlateIconUrl } from '../../shared/utils/iconResolver';
import './DetailPanel.css';

interface DetailPanelProps {
  className?: string;
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

  if (selectedId === 'worker-default') return <WorkerDetail className={className} />;
  if (selectedBlock) return <BlockDetail block={selectedBlock} className={className} />;
  if (selectedPlate) return <PlateDetail plate={selectedPlate} className={className} />;
  if (selectedConnection) return <ConnectionDetail connectionId={selectedConnection.id} className={className} />;
  return <WelcomeState className={className} />;
}

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

function WorkerDetail({ className }: { className: string }) {
  const workerState = useWorkerStore((s) => s.workerState);
  const workerPosition = useWorkerStore((s) => s.workerPosition);
  const activeBuild = useWorkerStore((s) => s.activeBuild);
  const buildQueue = useWorkerStore((s) => s.buildQueue);

  return (
    <div className={`detail-panel detail-panel--worker ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">🧑‍🔧</span>
        <span className="detail-header-name">Worker</span>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property"><span className="detail-property-label">State</span><span className="detail-property-value">{workerState}</span></div>
        <div className="detail-property"><span className="detail-property-label">Position</span><span className="detail-property-value detail-property-mono">({workerPosition[0].toFixed(1)}, {workerPosition[1].toFixed(1)}, {workerPosition[2].toFixed(1)})</span></div>
        <div className="detail-property"><span className="detail-property-label">Active Build</span><span className="detail-property-value">{activeBuild ? `${activeBuild.blockId} (${Math.round(activeBuild.progress * 100)}%)` : 'None'}</span></div>
        <div className="detail-property"><span className="detail-property-label">Queued</span><span className="detail-property-value">{buildQueue.length} task(s)</span></div>
      </div>
    </div>
  );
}

function BlockDetail({ block, className }: { block: Block; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const parentPlate = architecture.plates.find((p) => p.id === block.placementId);
  const networkPlate = parentPlate?.parentId ? architecture.plates.find((p) => p.id === parentPlate.parentId) : parentPlate;
  const color = getBlockColor(block.provider ?? 'azure', block.subtype, block.category);
  const providerLabel = block.provider ? block.provider.toUpperCase() : null;
  const typeIdentity = block.provider || block.subtype
    ? [providerLabel, block.subtype].filter(Boolean).join(' / ')
    : BLOCK_FRIENDLY_NAMES[block.category];
  const description = BLOCK_DESCRIPTIONS[block.category];

  return (
    <div className={`detail-panel detail-panel--block ${className}`}>
      <div className="detail-header">
        <img src={getBlockIconUrl(block.provider ?? 'azure', block.category, block.subtype)} alt={BLOCK_FRIENDLY_NAMES[block.category]} className="detail-header-icon-img" />
        <span className="detail-header-name">{block.name}</span>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property"><span className="detail-property-label">Type</span><span className="detail-property-value">{typeIdentity}</span></div>
        {description && <div className="detail-property"><span className="detail-property-label">Description</span><span className="detail-property-value detail-property-description">{description}</span></div>}
        {block.provider && <div className="detail-property"><span className="detail-property-label">Provider</span><span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>{providerLabel}</span></div>}
        {block.subtype && <div className="detail-property"><span className="detail-property-label">Subtype</span><span className="detail-property-value">{block.subtype}</span></div>}
        <div className="detail-property"><span className="detail-property-label">Category</span><span className="detail-property-value detail-property-tag" style={{ backgroundColor: `${color}20`, color }}>{block.category}</span></div>
        <div className="detail-property"><span className="detail-property-label">Network</span><span className="detail-property-value">{networkPlate?.name ?? 'None'}{parentPlate && parentPlate !== networkPlate && ` / ${parentPlate.name}`}</span></div>
        <div className="detail-property"><span className="detail-property-label">Position</span><span className="detail-property-value detail-property-mono">({block.position.x.toFixed(1)}, {block.position.y.toFixed(1)}, {block.position.z.toFixed(1)})</span></div>
        {block.config && Object.keys(block.config).length > 0 && <div className="detail-property"><span className="detail-property-label">Config</span><span className="detail-property-value detail-property-mono">{Object.entries(block.config).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}</span></div>}
      </div>
    </div>
  );
}

function PlateDetail({ plate, className }: { plate: Plate; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const profileId = plate.profileId && isPlateProfileId(plate.profileId) ? plate.profileId : DEFAULT_PLATE_PROFILE[plate.type];
  const profile = getPlateProfile(profileId);
  const hasProfileSupport = plate.type === 'region' || plate.type === 'subnet';
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
        {hasProfileSupport && <div className="detail-property"><span className="detail-property-label">Profile</span><span className="detail-property-value">{profile.displayName}</span></div>}
        {parentPlate && <div className="detail-property"><span className="detail-property-label">Parent</span><span className="detail-property-value">{parentPlate.name}</span></div>}
        <div className="detail-property"><span className="detail-property-label">Size</span><span className="detail-property-value detail-property-mono">{plate.size.width} × {plate.size.depth}</span></div>
        <div className="detail-property"><span className="detail-property-label">Contents</span><span className="detail-property-value">{childBlocks.length} block{childBlocks.length !== 1 ? 's' : ''}{childPlates.length > 0 && `, ${childPlates.length} subnet${childPlates.length !== 1 ? 's' : ''}`}</span></div>
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
        <span className="detail-header-icon">🔗</span>
        <span className="detail-header-name">{CONNECTION_TYPE_LABELS[connection.type]} Connection</span>
      </div>
      <div className="detail-divider" />
      <div className="detail-properties">
        <div className="detail-property"><span className="detail-property-label">Type</span><span className="detail-property-value">{CONNECTION_TYPE_LABELS[connection.type]}</span></div>
        <div className="detail-property"><span className="detail-property-label">From</span><span className="detail-property-value">{sourceBlock ? <>{BLOCK_ICONS[sourceBlock.category]} {sourceBlock.name}</> : sourceActor ? <>{sourceActor.type === 'internet' ? '☁️' : '👤'} {sourceActor.name}</> : 'Unknown'}</span></div>
        <div className="detail-property"><span className="detail-property-label">To</span><span className="detail-property-value">{targetBlock ? <>{BLOCK_ICONS[targetBlock.category]} {targetBlock.name}</> : 'Unknown'}</span></div>
      </div>
    </div>
  );
}
