import { Minimap } from './Minimap';
import { DetailPanel } from './DetailPanel';
import { CommandCard } from './CommandCard';
import { useUIStore } from '../../entities/store/uiStore';
import './BottomPanel.css';

interface BottomPanelProps {
  className?: string;
}

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const showProperties = useUIStore((s) => s.showProperties);
  const isBuildOrderOpen = useUIStore((s) => s.isBuildOrderOpen);
  const toggleBuildOrder = useUIStore((s) => s.toggleBuildOrder);

  return (
    <>
      <div className={`bottom-panel ${isBuildOrderOpen ? 'bottom-panel--build-order-open' : ''} ${className}`}>
        <Minimap className="bottom-panel-minimap" />
        {showProperties && <DetailPanel className="bottom-panel-detail" />}
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
