import { useRef, useState } from 'react';
import type { BlockCategory } from '../../shared/types/index';
import { BLOCK_COLORS, BLOCK_ICONS, BLOCK_SHORT_NAMES } from '../../shared/types/index';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ToolMode } from '../../entities/store/uiStore';
import { useDraggable } from '../../shared/hooks/useDraggable';
import './BlockPalette.css';

interface PaletteItem {
  category: BlockCategory;
  label: string;
  icon: string;
  /** Which plate type this block requires */
  plateType: 'subnet' | 'network';
}

/** Blocks placed on subnet plates */
const SUBNET_PALETTE_ITEMS: PaletteItem[] = [
  { category: 'gateway', label: 'App Gateway', icon: BLOCK_ICONS.gateway, plateType: 'subnet' },
  { category: 'compute', label: 'Virtual Machine', icon: BLOCK_ICONS.compute, plateType: 'subnet' },
  { category: 'database', label: 'SQL Database', icon: BLOCK_ICONS.database, plateType: 'subnet' },
  { category: 'storage', label: 'Blob Storage', icon: BLOCK_ICONS.storage, plateType: 'subnet' },
];

/** Serverless blocks placed on network plates (v1.0) */
const SERVERLESS_PALETTE_ITEMS: PaletteItem[] = [
  { category: 'function', label: 'App Service', icon: BLOCK_ICONS.function, plateType: 'network' },
  { category: 'queue', label: 'Message Queue', icon: BLOCK_ICONS.queue, plateType: 'network' },
  { category: 'event', label: 'Event Hub', icon: BLOCK_ICONS.event, plateType: 'network' },
  { category: 'timer', label: 'Timer', icon: BLOCK_ICONS.timer, plateType: 'network' },
];

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

  const [explicitTarget, setExplicitTarget] = useState<string | null>(null);
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
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <h3 
        className="palette-title"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        🧱 Build
      </h3>

      <div className="build-shelf-section">
        <div className="build-shelf-label">TOOLS</div>
        <div className="build-shelf-tools">
          {tools.map((t) => (
            <button
              key={t.mode}
              className={`build-shelf-tool-btn ${toolMode === t.mode ? 'active' : ''}`}
              onClick={() => setToolMode(t.mode)}
              title={t.label}
            >
              <span className="tool-icon">{t.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="build-shelf-section">
        <div className="build-shelf-label">PLATES</div>
        <div className="build-shelf-plates">
          <button className="build-shelf-plate-btn" onClick={handleAddNetwork}>
            <span className="plate-icon">🌐</span> Network
          </button>
          <button className="build-shelf-plate-btn plate-public" onClick={handleAddPublicSubnet}>
            <span className="plate-icon">🟢</span> Public Subnet
          </button>
          <button className="build-shelf-plate-btn plate-private" onClick={handleAddPrivateSubnet}>
            <span className="plate-icon">🔴</span> Private Subnet
          </button>
        </div>
      </div>

      <div className="build-shelf-divider" />

      <div className="build-shelf-section">
        <div className="build-shelf-label">BLOCKS</div>

        {subnetPlates.length > 1 && (
          <div className="palette-target-selector">
            <label htmlFor="target-select" className="palette-target-label">
              Target Plate:
            </label>
            <select
              id="target-select"
              className="palette-select"
              value={targetSubnetId ?? ''}
              onChange={(e) => setExplicitTarget(e.target.value)}
            >
              {subnetPlates.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="palette-items">
          {ALL_PALETTE_ITEMS.map((item) => (
            <button
              key={item.category}
              type="button"
              className="palette-item"
              style={{ '--block-color': BLOCK_COLORS[item.category] } as React.CSSProperties}
              onClick={() => handleAddBlock(item)}
              title={`Add ${item.label} block${item.plateType === 'network' ? ' (on Network)' : ''}`}
            >
              <div className="palette-block-wrapper">
                <div className="palette-studs">
                  <span className="palette-stud" />
                  <span className="palette-stud" />
                  <span className="palette-stud" />
                  <span className="palette-stud" />
                </div>
                <div className="palette-block-face">
                  <span className="palette-icon">{BLOCK_SHORT_NAMES[item.category]}</span>
                </div>
              </div>
              <span className="palette-label">{item.label}</span>
            </button>
          ))}
        </div>

        {targetSubnetId && (
          <div className="palette-hint">
            Subnet: {architecture.plates.find((p) => p.id === targetSubnetId)?.name ?? 'Unknown'}
          </div>
        )}
        {targetNetworkId && (
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
