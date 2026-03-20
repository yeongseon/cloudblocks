import { Minimap } from './Minimap';
import { DetailPanel } from './DetailPanel';
import { Portrait } from './Portrait';
import { CommandCard } from './CommandCard';
import { useUIStore } from '../../entities/store/uiStore';
import './BottomPanel.css';

interface BottomPanelProps {
  className?: string;
}

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const isBuildOrderOpen = useUIStore((s) => s.isBuildOrderOpen);
  const toggleBuildOrder = useUIStore((s) => s.toggleBuildOrder);

  return (
    <>
      <div className={`bottom-panel ${isBuildOrderOpen ? 'bottom-panel--worker-mode' : ''} ${className}`}>
        <Minimap className="bottom-panel-minimap" />
        <DetailPanel className="bottom-panel-detail" />
        <Portrait className="bottom-panel-portrait" />
        {isBuildOrderOpen && <CommandCard className="bottom-panel-command" />}
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
