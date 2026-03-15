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
}

const PALETTE_ITEMS: PaletteItem[] = [
  { category: 'gateway', label: 'Gateway', icon: '🚪' },
  { category: 'compute', label: 'Compute', icon: '🖥️' },
  { category: 'database', label: 'Database', icon: '🗄️' },
  { category: 'storage', label: 'Storage', icon: '📦' },
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
  const targetPlateId = explicitTarget && subnetPlates.find((p) => p.id === explicitTarget)
    ? explicitTarget
    : subnetPlates.find((p) => p.id === selectedId)?.id ?? subnetPlates[0]?.id;

  const handleAddBlock = (category: BlockCategory) => {
    if (!targetPlateId) {
      alert('Please create a Subnet Plate first before adding blocks.');
      return;
    }
    counterRef.current += 1;
    const name = `${category.charAt(0).toUpperCase() + category.slice(1)} ${counterRef.current}`;
    addBlock(category, name, targetPlateId);
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
            value={targetPlateId ?? ''}
            onChange={(e) => setExplicitTarget(e.target.value)}
          >
            {subnetPlates.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="palette-items">
        {PALETTE_ITEMS.map((item) => (
          <button
            key={item.category}
            className="palette-item"
            style={{ borderLeftColor: BLOCK_COLORS[item.category] }}
            onClick={() => handleAddBlock(item.category)}
            title={`Add ${item.label} block`}
          >
            <span className="palette-icon">{item.icon}</span>
            <span className="palette-label">{item.label}</span>
          </button>
        ))}
      </div>

      {targetPlateId && (
        <div className="palette-hint">
          Target: {plates.find((p) => p.id === targetPlateId)?.name ?? 'Unknown'}
        </div>
      )}
      {!targetPlateId && subnetPlates.length === 0 && (
        <div className="palette-hint palette-hint-warning">
          ⚠️ No subnet plates. Create one first.
        </div>
      )}
    </div>
  );
}
