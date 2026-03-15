import { useRef, useState } from 'react';
import type { BlockCategory } from '../../shared/types/index';
import { BLOCK_COLORS } from '../../shared/types/index';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
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
  { category: 'gateway', label: 'Gateway', icon: '🚪', plateType: 'subnet' },
  { category: 'compute', label: 'Compute', icon: '🖥️', plateType: 'subnet' },
  { category: 'database', label: 'Database', icon: '🗄️', plateType: 'subnet' },
  { category: 'storage', label: 'Storage', icon: '📦', plateType: 'subnet' },
];

/** Serverless blocks placed on network plates (v1.0) */
const SERVERLESS_PALETTE_ITEMS: PaletteItem[] = [
  { category: 'function', label: 'Function', icon: '⚡', plateType: 'network' },
  { category: 'queue', label: 'Queue', icon: '📨', plateType: 'network' },
  { category: 'event', label: 'Event', icon: '🔔', plateType: 'network' },
  { category: 'timer', label: 'Timer', icon: '⏰', plateType: 'network' },
];

const ALL_PALETTE_ITEMS: PaletteItem[] = [
  ...SUBNET_PALETTE_ITEMS,
  ...SERVERLESS_PALETTE_ITEMS,
];

export function BlockPalette() {
  const showBlockPalette = useUIStore((s) => s.showBlockPalette);
  const addBlock = useArchitectureStore((s) => s.addBlock);
  const plates = useArchitectureStore((s) => s.workspace.architecture.plates);
  const selectedId = useUIStore((s) => s.selectedId);
  const [explicitTarget, setExplicitTarget] = useState<string | null>(null);
  const counterRef = useRef(0);

  if (!showBlockPalette) return null;

  const subnetPlates = plates.filter((p) => p.type === 'subnet');
  const networkPlates = plates.filter((p) => p.type === 'network');

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

  return (
    <div className="block-palette">
      <h3 className="palette-title">🧱 Blocks</h3>

      {subnetPlates.length > 1 && (
        <div className="palette-target-selector">
          <label className="palette-target-label">
            Target Plate:
          </label>
          <select
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
            className="palette-item"
            style={{ borderLeftColor: BLOCK_COLORS[item.category] }}
            onClick={() => handleAddBlock(item)}
            title={`Add ${item.label} block${item.plateType === 'network' ? ' (on Network)' : ''}`}
          >
            <span className="palette-icon">{item.icon}</span>
            <span className="palette-label">{item.label}</span>
          </button>
        ))}
      </div>

      {targetSubnetId && (
        <div className="palette-hint">
          Subnet: {plates.find((p) => p.id === targetSubnetId)?.name ?? 'Unknown'}
        </div>
      )}
      {targetNetworkId && (
        <div className="palette-hint">
          Network: {plates.find((p) => p.id === targetNetworkId)?.name ?? 'Unknown'}
        </div>
      )}
      {!targetSubnetId && subnetPlates.length === 0 && (
        <div className="palette-hint palette-hint-warning">
          ⚠️ No subnet plates. Create one first.
        </div>
      )}
    </div>
  );
}
