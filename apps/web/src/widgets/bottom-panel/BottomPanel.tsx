import { Minimap } from './Minimap';
import { DetailPanel } from './DetailPanel';
import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { BLOCK_DESCRIPTIONS } from '../../shared/types/index';
import './BottomPanel.css';

interface BottomPanelProps {
  className?: string;
}

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const selectedBlock = selectedId
    ? architecture.blocks.find((b) => b.id === selectedId) ?? null
    : null;
  const selectedPlate = selectedId
    ? architecture.plates.find((p) => p.id === selectedId) ?? null
    : null;
  const isWorkerSelected = selectedId === 'worker-default';

  let contextText: string;
  if (selectedBlock) {
    contextText = BLOCK_DESCRIPTIONS[selectedBlock.category];
  } else if (selectedPlate) {
    const typeLabel = selectedPlate.type === 'subnet'
      ? `${selectedPlate.subnetAccess === 'public' ? 'Public' : 'Private'} Subnet`
      : selectedPlate.type === 'region'
        ? 'Network (VNet)'
        : selectedPlate.type.charAt(0).toUpperCase() + selectedPlate.type.slice(1);
    contextText = `${typeLabel} — ${selectedPlate.name}`;
  } else if (isWorkerSelected) {
    contextText = 'Select a resource from the panel to build';
  } else {
    contextText = 'Select the minifigure to start building';
  }

  return (
    <div className={`bottom-panel ${className}`}>
      <Minimap className="bottom-panel-minimap" />
      <div className="bottom-panel-context">
        <p className="bottom-panel-context-text">{contextText}</p>
      </div>
      <DetailPanel className="bottom-panel-detail" />
    </div>
  );
}
