/**
 * Detail Panel — Resource Properties
 *
 * Shows resource properties with inline editing capability.
 * States:
 * - Nothing selected: Workspace dashboard with stats
 * - Single selected: Editable properties
 * - Multi-selected: Wireframe grid of selected items
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { BLOCK_FRIENDLY_NAMES, BLOCK_DESCRIPTIONS, BLOCK_ICONS, CONNECTION_TYPE_LABELS, DEFAULT_PLATE_PROFILE, getPlateProfile, isPlateProfileId, PLATE_PROFILES } from '../../shared/types/index';
import type { PlateProfileId } from '../../shared/types/index';
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
  return (
    <div className={`detail-panel detail-panel--idle ${className}`}>
      <div className="detail-idle">
        <span className="detail-idle-icon">📋</span>
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(block.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const renameBlock = useArchitectureStore((s) => s.renameBlock);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
  const parentPlate = containers.find((p) => p.id === block.parentId);
  const networkPlate = parentPlate?.parentId
    ? containers.find((p) => p.id === parentPlate.parentId)
    : parentPlate;

  const handleRename = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== block.name) {
      renameBlock(block.id, trimmed);
      setNewName(trimmed);
    }
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
      </div>
    </div>
  );
}

// ─── Plate Detail ──────────────────────────────────────────

function PlateDetail({ plate, className }: { plate: ContainerNode; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);
  const containers = architecture.nodes.filter((node): node is ContainerNode => node.kind === 'container');
  const resources = architecture.nodes.filter((node): node is LeafNode => node.kind === 'resource');
  const plateType: ContainerLayer = plate.layer === 'resource' ? 'region' : plate.layer;

  const profileId = plate.profileId && isPlateProfileId(plate.profileId)
    ? plate.profileId
    : DEFAULT_PLATE_PROFILE[plateType];
  const profile = getPlateProfile(profileId);
  const hasProfileSupport = plateType === 'region' || plateType === 'subnet';
  const profileFilterType = plateType === 'subnet' ? 'subnet' : 'region';
  const profileOptions = hasProfileSupport
    ? Object.values(PLATE_PROFILES).filter((candidate) => candidate.type === profileFilterType)
    : [];

  const parentPlate = plate.parentId
    ? containers.find((p) => p.id === plate.parentId)
    : null;

  const childBlocks = resources.filter((b) => b.parentId === plate.id);
  const childPlates = containers.filter((p) => p.parentId === plate.id);

  const altText = plateType === 'subnet'
    ? `${plate.subnetAccess === 'public' ? 'Public' : 'Private'} Subnet`
    : plateType === 'region'
      ? 'Region'
      : plateType.charAt(0).toUpperCase() + plateType.slice(1);

  return (
    <div className={`detail-panel detail-panel--plate ${className}`}>
      <div className="detail-header">
        <img
          src={getPlateIconUrl(plateType, plate.subnetAccess)}
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
