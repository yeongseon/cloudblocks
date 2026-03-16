import { useRef, useState } from 'react';
import type { BlockCategory } from '../../shared/types/index';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ToolMode } from '../../entities/store/uiStore';
import { useDraggable } from '../../shared/hooks/useDraggable';
import gatewaySvg from '../../shared/assets/block-sprites/gateway.svg';
import computeSvg from '../../shared/assets/block-sprites/compute.svg';
import databaseSvg from '../../shared/assets/block-sprites/database.svg';
import storageSvg from '../../shared/assets/block-sprites/storage.svg';
import functionSvg from '../../shared/assets/block-sprites/function.svg';
import queueSvg from '../../shared/assets/block-sprites/queue.svg';
import eventSvg from '../../shared/assets/block-sprites/event.svg';
import timerSvg from '../../shared/assets/block-sprites/timer.svg';
import networkPlateSvg from '../../shared/assets/plate-sprites/network.svg';
import publicSubnetSvg from '../../shared/assets/plate-sprites/public-subnet.svg';
import privateSubnetSvg from '../../shared/assets/plate-sprites/private-subnet.svg';
import './BlockPalette.css';

interface PaletteItem {
  category: BlockCategory;
  label: string;
  /** Which plate type this block requires */
  plateType: 'subnet' | 'network';
}

/** Blocks placed on subnet plates */
const SUBNET_PALETTE_ITEMS: PaletteItem[] = [
  { category: 'gateway', label: 'App Gateway', plateType: 'subnet' },
  { category: 'compute', label: 'Virtual Machine', plateType: 'subnet' },
  { category: 'database', label: 'SQL Database', plateType: 'subnet' },
  { category: 'storage', label: 'Blob Storage', plateType: 'subnet' },
];

/** Serverless blocks placed on network plates (v1.0) */
const SERVERLESS_PALETTE_ITEMS: PaletteItem[] = [
  { category: 'function', label: 'App Service', plateType: 'network' },
  { category: 'queue', label: 'Message Queue', plateType: 'network' },
  { category: 'event', label: 'Event Hub', plateType: 'network' },
  { category: 'timer', label: 'Timer', plateType: 'network' },
];

const BLOCK_SPRITES: Record<BlockCategory, string> = {
  gateway: gatewaySvg,
  compute: computeSvg,
  database: databaseSvg,
  storage: storageSvg,
  function: functionSvg,
  queue: queueSvg,
  event: eventSvg,
  timer: timerSvg,
};

const ALL_PALETTE_ITEMS: PaletteItem[] = [
  ...SUBNET_PALETTE_ITEMS,
  ...SERVERLESS_PALETTE_ITEMS,
];

export function BlockPalette() {
  const showBlockPalette = useUIStore((s) => s.showBlockPalette);
  const toolMode = useUIStore((s) => s.toolMode);
  const setToolMode = useUIStore((s) => s.setToolMode);
  const selectedId = useUIStore((s) => s.selectedId);
  
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const addPlate = useArchitectureStore((s) => s.addPlate);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const [explicitTarget] = useState<string | null>(null);
  const counterRef = useRef(0);
  const { position, handleMouseDown, isDragging } = useDraggable();

  if (!showBlockPalette) return null;

  const subnetPlates = architecture.plates.filter((p) => p.type === 'subnet');
  const networkPlates = architecture.plates.filter((p) => p.type === 'network');

  const targetSubnetId = explicitTarget && subnetPlates.find((p) => p.id === explicitTarget)
    ? explicitTarget
    : subnetPlates.find((p) => p.id === selectedId)?.id ?? subnetPlates[0]?.id;

  const targetNetworkId = networkPlates[0]?.id;

  const handleAddBlock = (item: PaletteItem) => {
    const targetPlateId = item.plateType === 'network' ? targetNetworkId : targetSubnetId;
    if (!targetPlateId) {
      const msg = item.plateType === 'network'
        ? 'Please create a Network Plate first before adding serverless blocks.'
        : 'Please create a Subnet Plate first before adding blocks.';
      alert(msg);
      return;
    }
    counterRef.current += 1;
    const name = `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} ${counterRef.current}`;
    addBlock(item.category, name, targetPlateId);
  };

  const handleAddNetwork = () => {
    addPlate('network', 'VNet', null);
  };

  const handleAddPublicSubnet = () => {
    const network = architecture.plates.find((p) => p.type === 'network');
    if (!network) {
      alert('Please create a Network Plate first.');
      return;
    }
    addPlate('subnet', 'Public Subnet', network.id, 'public');
  };

  const handleAddPrivateSubnet = () => {
    const network = architecture.plates.find((p) => p.type === 'network');
    if (!network) {
      alert('Please create a Network Plate first.');
      return;
    }
    addPlate('subnet', 'Private Subnet', network.id, 'private');
  };

  const tools: { mode: ToolMode; icon: string; label: string }[] = [
    { mode: 'select', icon: '👆', label: 'Select' },
    { mode: 'connect', icon: '🔗', label: 'Connect' },
    { mode: 'delete', icon: '❌', label: 'Delete' },
  ];

  return (
    <div 
      className="block-palette"
      style={{ transform: `translateX(-50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <button 
        type="button"
        className="palette-drag-grip"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', background: 'none', border: 'none', padding: 0 }}
        title="Drag tray"
      >
        <div className="grip-lines">
          <span />
          <span />
          <span />
        </div>
      </button>

      <div className="build-shelf-section">
        <div className="build-shelf-label">TOOLS</div>
        <div className="build-shelf-tools">
          {tools.map((t) => (
            <button
              key={t.mode}
              type="button"
              className={`build-shelf-tool-btn ${toolMode === t.mode ? 'active' : ''}`}
              onClick={() => setToolMode(t.mode)}
              title={t.label}
            >
              <span className="tool-icon">{t.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="build-shelf-divider" />

      <div className="build-shelf-section">
        <div className="build-shelf-label">PLATES</div>
        <div className="build-shelf-plates">
          <button type="button" className="build-shelf-plate-btn" onClick={handleAddNetwork}>
            <img src={networkPlateSvg} alt="Network" className="plate-sprite" draggable={false} />
            <span className="plate-label">Network</span>
          </button>
          <button type="button" className="build-shelf-plate-btn plate-public" onClick={handleAddPublicSubnet}>
            <img src={publicSubnetSvg} alt="Public Subnet" className="plate-sprite" draggable={false} />
            <span className="plate-label">Public</span>
          </button>
          <button type="button" className="build-shelf-plate-btn plate-private" onClick={handleAddPrivateSubnet}>
            <img src={privateSubnetSvg} alt="Private Subnet" className="plate-sprite" draggable={false} />
            <span className="plate-label">Private</span>
          </button>
        </div>
      </div>

      <div className="build-shelf-divider" />

      <div className="build-shelf-section">
        <div className="build-shelf-label">BLOCKS</div>
        <div className="palette-items">
          {ALL_PALETTE_ITEMS.map((item) => (
            <button
              key={item.category}
              type="button"
              className="palette-item"
              onClick={() => handleAddBlock(item)}
              title={`Add ${item.label} block${item.plateType === 'network' ? ' (on Network)' : ''}`}
            >
              <img
                src={BLOCK_SPRITES[item.category]}
                alt={item.label}
                className="palette-sprite"
                draggable={false}
              />
              <span className="palette-label">{item.label}</span>
            </button>
          ))}
        </div>

        {targetSubnetId && (
          <div className="palette-hint">
            Subnet: {architecture.plates.find((p) => p.id === targetSubnetId)?.name ?? 'Unknown'}
          </div>
        )}
        {targetNetworkId && !targetSubnetId && (
          <div className="palette-hint">
            Network: {architecture.plates.find((p) => p.id === targetNetworkId)?.name ?? 'Unknown'}
          </div>
        )}
        {!targetSubnetId && subnetPlates.length === 0 && (
          <div className="palette-hint palette-hint-warning">
            ⚠️ No subnet plates. Create one first.
          </div>
        )}
      </div>
    </div>
  );
}
