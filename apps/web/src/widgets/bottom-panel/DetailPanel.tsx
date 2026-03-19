/**
 * Detail Panel — Resource Properties
 *
 * Shows resource properties with inline editing capability.
 * States:
 * - Nothing selected: Welcome message with tips
 * - Single selected: Editable properties
 * - Multi-selected: Wireframe grid of selected items
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import {
  BLOCK_FRIENDLY_NAMES,
  BLOCK_DESCRIPTIONS,
  BLOCK_ICONS,
  BLOCK_COLORS,
  DEFAULT_PLATE_PROFILE,
  getPlateProfile,
  PLATE_COLORS,
  PLATE_PROFILES,
  SUBNET_ACCESS_COLORS,
} from '../../shared/types/index';
import type { Block, Plate, PlateProfileId } from '../../shared/types/index';
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
          or use the Command Card to create new ones.
        </p>
        <div className="detail-welcome-tip">
          <span className="detail-tip-icon">💡</span>
          <span className="detail-tip-text">Tip: Start with Network</span>
        </div>
      </div>
    </div>
  );
}

// ─── Block Detail ──────────────────────────────────────────

function BlockDetail({ block, className }: { block: Block; className: string }) {
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

  const color = BLOCK_COLORS[block.category];

  return (
    <div className={`detail-panel detail-panel--block ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon" style={{ color }}>
          {BLOCK_ICONS[block.category]}
        </span>
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
            {BLOCK_FRIENDLY_NAMES[block.category]}
            <span className="detail-property-hint" title={BLOCK_DESCRIPTIONS[block.category]}>
              ℹ️
            </span>
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

        <div className="detail-property">
          <span className="detail-property-label">Position</span>
          <span className="detail-property-value detail-property-mono">
            ({block.position.x.toFixed(1)}, {block.position.y.toFixed(1)})
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Plate Detail ──────────────────────────────────────────

function PlateDetail({ plate, className }: { plate: Plate; className: string }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setPlateProfile = useArchitectureStore((s) => s.setPlateProfile);

  const profileId = plate.profileId ?? DEFAULT_PLATE_PROFILE[plate.type];
  const profile = getPlateProfile(profileId);
  const profileFilterType = plate.type === 'subnet' ? 'subnet' : 'region';
  const profileOptions = Object.values(PLATE_PROFILES).filter(
    (candidate) => candidate.type === profileFilterType
  );

  const parentPlate = plate.parentId
    ? architecture.plates.find((p) => p.id === plate.parentId)
    : null;

  const childBlocks = architecture.blocks.filter((b) => b.placementId === plate.id);
  const childPlates = architecture.plates.filter((p) => p.parentId === plate.id);

  const color = plate.type === 'subnet' && plate.subnetAccess
    ? SUBNET_ACCESS_COLORS[plate.subnetAccess]
    : PLATE_COLORS[plate.type];

  const icon = plate.type === 'subnet'
    ? plate.subnetAccess === 'public' ? '🌍' : '🔒'
    : plate.type === 'global'
      ? '🌎'
      : plate.type === 'edge'
        ? '🛰️'
        : plate.type === 'zone'
          ? '🧭'
          : '🌐';

  return (
    <div className={`detail-panel detail-panel--plate ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon" style={{ color }}>{icon}</span>
        <span className="detail-header-name">{plate.name}</span>
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
                  {candidate.displayName} ({candidate.displayNameKo}) - {candidate.studsX}x{candidate.studsY}
                </option>
              ))}
            </select>
          </span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">Profile Note</span>
          <span className="detail-property-value detail-property-description">{profile.description}</span>
        </div>

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

  if (!connection) return null;

  const sourceBlock = architecture.blocks.find((b) => b.id === connection.sourceId);
  const targetBlock = architecture.blocks.find((b) => b.id === connection.targetId);

  return (
    <div className={`detail-panel detail-panel--connection ${className}`}>
      <div className="detail-header">
        <span className="detail-header-icon">🔗</span>
        <span className="detail-header-name">Connection</span>
      </div>

      <div className="detail-divider" />

      <div className="detail-properties">
        <div className="detail-property">
          <span className="detail-property-label">Type</span>
          <span className="detail-property-value">Data Flow</span>
        </div>

        <div className="detail-property">
          <span className="detail-property-label">From</span>
          <span className="detail-property-value">
            {sourceBlock ? (
              <>
                {BLOCK_ICONS[sourceBlock.category]} {sourceBlock.name}
              </>
            ) : (
              '☁️ Internet'
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
