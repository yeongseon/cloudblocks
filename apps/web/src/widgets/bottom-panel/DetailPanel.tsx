/**
 * Detail Panel — Resource Guide (read-only)
 *
 * Shows educational encyclopedia content for selected resources.
 * States:
 * - Nothing selected: Workspace dashboard with stats
 * - Single selected: Read-only encyclopedia (what, placement, connections)
 * - Multi-selected: Wireframe grid of selected items
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.3
 */

import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { BLOCK_FRIENDLY_NAMES, BLOCK_ICONS, BLOCK_ENCYCLOPEDIA, CONNECTION_TYPE_LABELS, CONNECTION_ENCYCLOPEDIA, PLATE_ENCYCLOPEDIA } from '../../shared/types/index';
import type { ContainerNode, LeafNode } from '@cloudblocks/schema';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockIconUrl, getPlateIconUrl } from '../../shared/utils/iconResolver';
import './DetailPanel.css';

interface DetailPanelProps {
  className?: string;
}

type ContainerLayer = 'global' | 'edge' | 'region' | 'zone' | 'subnet';

export function DetailPanel({ className = '' }: DetailPanelProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const showTemplateGallery = useUIStore((s) => s.showTemplateGallery);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
  const resources = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');

  // Find selected item
  const selectedBlock = resources.find((b) => b.id === selectedId);
  const selectedPlate = containers.find((p) => p.id === selectedId);
  const selectedConnection = architecture.connections.find((c) => c.id === selectedId);

  if (!selectedId) {
    const isEmptyOnboarding = containers.length === 0 && !showTemplateGallery;
    if (isEmptyOnboarding) {
      return <IdleState className={className} />;
    }
    return <WorkspaceDashboard className={className} />;
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

  return <WorkspaceDashboard className={className} />;
}

// ─── Idle State ────────────────────────────────────────────

function IdleState({ className }: { className: string }) {
  const persona = useUIStore((s) => s.persona);
  const setShowScenarioGallery = useUIStore((s) => s.setShowScenarioGallery);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  const handleStartLearning = () => {
    setShowScenarioGallery(true);
    setEditorMode('learn');
  };

  if (persona === 'student') {
    return (
      <div className={`detail-panel detail-panel--idle ${className}`}>
        <div className="detail-idle">
          <span className="detail-idle-icon">{'\u{1F393}'}</span>
          <p className="detail-idle-text">Ready to learn cloud architecture?</p>
          <button
            type="button"
            className="detail-idle-cta"
            onClick={handleStartLearning}
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`detail-panel detail-panel--idle ${className}`}>
      <div className="detail-idle">
        <span className="detail-idle-icon">{'\u{1F4CB}'}</span>
        <p className="detail-idle-text">No selection</p>
      </div>
    </div>
  );
}

// ─── Workspace Dashboard ───────────────────────────────────

function WorkspaceDashboard({ className }: { className: string }) {
  const workspaceName = useArchitectureStore((s) => s.workspace.name);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const activeProvider = useUIStore((s) => s.activeProvider);

  const containers = architecture.nodes.filter((n): n is ContainerNode => n.kind === 'container');
  const resources = architecture.nodes.filter((n): n is LeafNode => n.kind === 'resource');
  const connectionCount = architecture.connections.length;
  const actorCount = architecture.externalActors.length;

  return (
    <div className={`detail-panel detail-panel--dashboard ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">📊</span>
        <span className="detail-header-name">{workspaceName}</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-dashboard">
        <div className="detail-dashboard-stat">
          <span className="detail-dashboard-value">{activeProvider.toUpperCase()}</span>
          <span className="detail-dashboard-label">Provider</span>
        </div>
        <div className="detail-dashboard-stat">
          <span className="detail-dashboard-value">{containers.length}</span>
          <span className="detail-dashboard-label">{containers.length === 1 ? 'Plate' : 'Plates'}</span>
        </div>
        <div className="detail-dashboard-stat">
          <span className="detail-dashboard-value">{resources.length}</span>
          <span className="detail-dashboard-label">{resources.length === 1 ? 'Block' : 'Blocks'}</span>
        </div>
        <div className="detail-dashboard-stat">
          <span className="detail-dashboard-value">{connectionCount}</span>
          <span className="detail-dashboard-label">{connectionCount === 1 ? 'Connection' : 'Connections'}</span>
        </div>
        {actorCount > 0 && (
          <div className="detail-dashboard-stat">
            <span className="detail-dashboard-value">{actorCount}</span>
            <span className="detail-dashboard-label">{actorCount === 1 ? 'Actor' : 'Actors'}</span>
          </div>
        )}
      </div>

      <div className="detail-dashboard-tip">
        Select a resource to learn more in the Resource Guide.
      </div>
    </div>
  );
}

// ─── Block Detail ──────────────────────────────────────────

function BlockDetail({ block, className }: { block: LeafNode; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
  const parentPlate = containers.find((p) => p.id === block.parentId);
  const networkPlate = parentPlate?.parentId
    ? containers.find((p) => p.id === parentPlate.parentId)
    : parentPlate;

  const color = getBlockColor(block.provider ?? 'azure', block.subtype, block.category);
  const providerLabel = block.provider ? block.provider.toUpperCase() : null;
  const typeIdentity = block.provider || block.subtype
    ? [providerLabel, block.subtype].filter(Boolean).join(' / ')
    : BLOCK_FRIENDLY_NAMES[block.category];

  const encyclopedia = BLOCK_ENCYCLOPEDIA[block.category];

  return (
    <div className={`detail-panel detail-panel--block ${className}`}>
      <div className="detail-header">
        <img
          src={getBlockIconUrl(block.provider ?? 'azure', block.category, block.subtype)}
          alt={BLOCK_FRIENDLY_NAMES[block.category]}
          className="detail-header-icon-img"
        />
        <span className="detail-header-name">{block.name}</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">
            {typeIdentity}
          </span>
        </div>

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

        <div className="detail-encyclopedia">
          <div className="detail-encyclopedia-section">
            <span className="detail-encyclopedia-heading">What is this?</span>
            <p className="detail-encyclopedia-text">{encyclopedia.what}</p>
          </div>
          <div className="detail-encyclopedia-section">
            <span className="detail-encyclopedia-heading">Placement Rules</span>
            <p className="detail-encyclopedia-text">{encyclopedia.placement}</p>
          </div>
          <div className="detail-encyclopedia-section">
            <span className="detail-encyclopedia-heading">Connections</span>
            <p className="detail-encyclopedia-text">{encyclopedia.connections}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Plate Detail ──────────────────────────────────────────

function PlateDetail({ plate, className }: { plate: ContainerNode; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
  const resources = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');
  const plateType: ContainerLayer = plate.layer === 'resource' ? 'region' : plate.layer;

  const parentPlate = plate.parentId
    ? containers.find((p) => p.id === plate.parentId)
    : null;

  const childBlocks = resources.filter((b) => b.parentId === plate.id);
  const childPlates = containers.filter((p) => p.parentId === plate.id);

  const altText = plateType === 'subnet'
    ? 'Subnet'
    : plateType === 'region'
      ? 'Region'
      : plateType.charAt(0).toUpperCase() + plateType.slice(1);

  const encyclopedia = PLATE_ENCYCLOPEDIA[plateType];

  return (
    <div className={`detail-panel detail-panel--plate ${className}`}>
      <div className="detail-header">
        <img
          src={getPlateIconUrl(plateType)}
          alt={altText}
          className="detail-header-icon-img"
        />
        <span className="detail-header-name">{plate.name}</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">
            {plateType === 'subnet' ? 'Subnet' : plateType.charAt(0).toUpperCase() + plateType.slice(1)}
          </span>
        </div>

        {parentPlate && (
          <div className="detail-property">
            <span className="detail-property-label">Parent</span>
            <span className="detail-property-value">{parentPlate.name}</span>
          </div>
        )}

        <div className="detail-property">
          <span className="detail-property-label">Contents</span>
          <span className="detail-property-value">
            {childBlocks.length} block{childBlocks.length !== 1 ? 's' : ''}
            {childPlates.length > 0 && `, ${childPlates.length} subnet${childPlates.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="detail-encyclopedia">
          <div className="detail-encyclopedia-section">
            <span className="detail-encyclopedia-heading">What is this?</span>
            <p className="detail-encyclopedia-text">{encyclopedia.what}</p>
          </div>
          <div className="detail-encyclopedia-section">
            <span className="detail-encyclopedia-heading">Nesting Rules</span>
            <p className="detail-encyclopedia-text">{encyclopedia.rules}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Connection Detail ─────────────────────────────────────

function ConnectionDetail({ connectionId, className }: { connectionId: string; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const connection = architecture.connections.find((c) => c.id === connectionId);
  const resources = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');

  if (!connection) return null;

  const sourceBlock = resources.find((b) => b.id === connection.sourceId);
  const sourceActor = architecture.externalActors.find((a) => a.id === connection.sourceId);
  const targetBlock = resources.find((b) => b.id === connection.targetId);
  const encyclopedia = CONNECTION_ENCYCLOPEDIA[connection.type];

  return (
    <div className={`detail-panel detail-panel--connection ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">🔗</span>
        <span className="detail-header-name">{CONNECTION_TYPE_LABELS[connection.type]} Connection</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
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

        {encyclopedia && (
          <div className="detail-encyclopedia">
            <div className="detail-encyclopedia-section">
              <span className="detail-encyclopedia-heading">What is this?</span>
              <p className="detail-encyclopedia-text">{encyclopedia.what}</p>
            </div>
            <div className="detail-encyclopedia-section">
              <span className="detail-encyclopedia-heading">When to use</span>
              <p className="detail-encyclopedia-text">{encyclopedia.usage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
