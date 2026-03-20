/**
 * Portrait Panel — Resource Icon Display (StarCraft-style unit portrait)
 *
 * Shows the product icon of the selected resource using provider-aware
 * icon resolution. Shows CloudBlocks logo when nothing is selected.
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.4
 */

import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { getPlateFaceColors } from '../../entities/plate/plateFaceColors';
import { BLOCK_FRIENDLY_NAMES, CONNECTION_TYPE_LABELS, PLATE_COLORS, SUBNET_ACCESS_COLORS } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import { getBlockIconUrl, getPlateIconUrl } from '../../shared/utils/iconResolver';
import './Portrait.css';

interface PortraitProps {
  className?: string;
}

export function Portrait({ className = '' }: PortraitProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  // Find selected item
  const selectedBlock = architecture.blocks.find((b) => b.id === selectedId);
  const selectedPlate = architecture.plates.find((p) => p.id === selectedId);
  const selectedConnection = architecture.connections.find((c) => c.id === selectedId);

  const workerState = useWorkerStore((s) => s.workerState);

  // Worker selected
  if (selectedId === 'worker-default') {
    return (
      <div className={`portrait-panel portrait-panel--worker ${className}`}>
        <div className="portrait-content">
          <span className="portrait-icon">🧑‍🔧</span>
          <span className="portrait-label">Worker</span>
        </div>
        <div className="portrait-badge" style={{ backgroundColor: '#FF9800' }}>
          {workerState}
        </div>
      </div>
    );
  }

  // No selection — show logo
  if (!selectedId || (!selectedBlock && !selectedPlate && !selectedConnection)) {
    return (
      <div className={`portrait-panel portrait-panel--empty ${className}`}>
        <div className="portrait-content">
          <span className="portrait-logo">☁️</span>
          <span className="portrait-label">CloudBlocks</span>
        </div>
      </div>
    );
  }

  // Block selected
  if (selectedBlock) {
    const color = getBlockColor(selectedBlock.provider ?? 'azure', selectedBlock.subtype, selectedBlock.category);
    return (
      <div className={`portrait-panel portrait-panel--block ${className}`}>
        <div className="portrait-content">
          <img src={getBlockIconUrl(selectedBlock.provider ?? 'azure', selectedBlock.category, selectedBlock.subtype)} alt={BLOCK_FRIENDLY_NAMES[selectedBlock.category]} className="portrait-icon-img" />
          <span className="portrait-label">{selectedBlock.name}</span>
        </div>
        <div className="portrait-badge" style={{ backgroundColor: color }}>
          {selectedBlock.category}
        </div>
      </div>
    );
  }

  // Plate selected
  if (selectedPlate) {
    const color = selectedPlate.type === 'subnet' && selectedPlate.subnetAccess
      ? SUBNET_ACCESS_COLORS[selectedPlate.subnetAccess]
      : PLATE_COLORS[selectedPlate.type];

    const faceColors = getPlateFaceColors(selectedPlate);

    const plateIcon = getPlateIconUrl(selectedPlate.type, selectedPlate.subnetAccess);

    const altText = selectedPlate.type === 'subnet'
      ? `${selectedPlate.subnetAccess === 'public' ? 'Public' : 'Private'} Subnet`
      : selectedPlate.type === 'region'
        ? 'Region'
        : selectedPlate.type.charAt(0).toUpperCase() + selectedPlate.type.slice(1);

    const plateStyle: React.CSSProperties = {
      backgroundColor: faceColors.leftSideColor,
      borderColor: faceColors.rightSideColor,
    };

    return (
      <div className={`portrait-panel portrait-panel--plate ${className}`} style={plateStyle}>
        <div className="portrait-content">
          <img src={plateIcon} alt={altText} className="portrait-icon-img" />
          <span className="portrait-label">{selectedPlate.name}</span>
        </div>
        <div className="portrait-badge" style={{ backgroundColor: color }}>
          {selectedPlate.type}
        </div>
      </div>
    );
  }

  // Connection selected
  if (selectedConnection) {
    return (
      <div className={`portrait-panel portrait-panel--connection ${className}`}>
        <div className="portrait-content">
          <span className="portrait-icon" style={{ color: '#42A5F5' }}>🔗</span>
          <span className="portrait-label">{CONNECTION_TYPE_LABELS[selectedConnection.type]}</span>
        </div>
        <div className="portrait-badge" style={{ backgroundColor: '#42A5F5' }}>
          {selectedConnection.type}
        </div>
      </div>
    );
  }

  return null;
}
