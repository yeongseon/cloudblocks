/**
 * Portrait Panel — Azure Resource Icon Display (StarCraft-style unit portrait)
 *
 * Shows the Azure product icon of the selected resource,
 * like a character face in StarCraft's unit wireframe panel.
 * Shows CloudBlocks logo when nothing is selected.
 *
 * Based on VISUAL_DESIGN_SPEC.md §7.4
 */

import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import { getPlateFaceColors } from '../../entities/plate/plateFaceColors';
import { BLOCK_FRIENDLY_NAMES, CONNECTION_TYPE_LABELS, PLATE_COLORS, SUBNET_ACCESS_COLORS } from '../../shared/types/index';
import { getBlockColor } from '../../entities/block/blockFaceColors';
import type { ProviderType } from '@cloudblocks/schema';
import vmIcon from '../../shared/assets/azure-icons/virtual-machine.svg';
import sqlIcon from '../../shared/assets/azure-icons/sql-database.svg';
import storageIcon from '../../shared/assets/azure-icons/storage-account.svg';
import gatewayIcon from '../../shared/assets/azure-icons/application-gateway.svg';
import functionIcon from '../../shared/assets/azure-icons/logic-apps.svg';
import queueIcon from '../../shared/assets/azure-icons/service-bus.svg';
import eventIcon from '../../shared/assets/azure-icons/event-hub.svg';
import vnetIcon from '../../shared/assets/azure-icons/virtual-network.svg';
import subnetIcon from '../../shared/assets/azure-icons/subnet.svg';
import './Portrait.css';

interface PortraitProps {
  className?: string;
}

const BLOCK_ICONS: Record<string, string> = {
  compute: vmIcon,
  database: sqlIcon,
  storage: storageIcon,
  gateway: gatewayIcon,
  function: functionIcon,
  queue: queueIcon,
  event: eventIcon,
  analytics: vmIcon,
  identity: storageIcon,
  observability: eventIcon,
};

const PROVIDER_LABELS: Record<ProviderType, string> = {
  azure: 'AZURE',
  aws: 'AWS',
  gcp: 'GCP',
};

const PLATE_ICONS: Record<string, Record<string, string>> = {
  global: { default: vnetIcon },
  edge: { default: vnetIcon },
  region: { default: vnetIcon },
  zone: { default: vnetIcon },
  subnet: { public: subnetIcon, private: subnetIcon },
};

export function Portrait({ className = '' }: PortraitProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const activeProvider = useUIStore((s) => s.activeProvider);
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
    const provider = selectedBlock.provider ?? activeProvider;
    const color = getBlockColor(provider, selectedBlock.subtype, selectedBlock.category);
    const isAzureProvider = provider === 'azure';

    return (
      <div className={`portrait-panel portrait-panel--block ${className}`}>
        <div className="portrait-content">
          {isAzureProvider ? (
            <img src={BLOCK_ICONS[selectedBlock.category]} alt={BLOCK_FRIENDLY_NAMES[selectedBlock.category]} className="portrait-icon-img" />
          ) : (
            <span className="portrait-provider-glyph" data-provider={provider} aria-label={`${PROVIDER_LABELS[provider]} ${BLOCK_FRIENDLY_NAMES[selectedBlock.category]}`}>
              {`${PROVIDER_LABELS[provider]} ${selectedBlock.category.toUpperCase()}`}
            </span>
          )}
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

    const plateIcon = selectedPlate.type === 'subnet'
      ? PLATE_ICONS.subnet[selectedPlate.subnetAccess ?? 'private']
      : PLATE_ICONS[selectedPlate.type].default;

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
