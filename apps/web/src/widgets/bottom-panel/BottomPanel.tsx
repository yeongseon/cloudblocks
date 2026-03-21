import { Minimap } from './Minimap';
import { DetailPanel } from './DetailPanel';
import { Portrait } from './Portrait';
import { CommandCard } from './CommandCard';
import { useUIStore } from '../../entities/store/uiStore';
import './BottomPanel.css';

const WORKER_ID = 'worker-default';

interface BottomPanelProps {
  className?: string;
}

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const showProperties = useUIStore((s) => s.showProperties);
  const isBuildOrderOpen = useUIStore((s) => s.isBuildOrderOpen);
  const toggleBuildOrder = useUIStore((s) => s.toggleBuildOrder);
  const selectedId = useUIStore((s) => s.selectedId);
  const isWorkerSelected = selectedId === WORKER_ID;

  return (
    <>
      <div className={`bottom-panel ${isBuildOrderOpen ? 'bottom-panel--build-order-open' : ''} ${className}`}>
        <Minimap className="bottom-panel-minimap" />
        {showProperties && <DetailPanel className="bottom-panel-detail" />}
        <Portrait className="bottom-panel-portrait" />
        {isBuildOrderOpen && isWorkerSelected && <CommandCard className="bottom-panel-command" />}
      </div>
      {!isBuildOrderOpen && (
        <button
          type="button"
          className="build-order-expand-tab"
          onClick={toggleBuildOrder}
          aria-label="Open Build Order panel"
          title="Build Order"
        >
          «
        </button>
      )}
    </>
  );
}
