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
  const showProperties = useUIStore((s) => s.showProperties);

  return (
    <div className={`bottom-panel ${className}`}>
      <Minimap className="bottom-panel-minimap" />
      {showProperties && <DetailPanel className="bottom-panel-detail" />}
      <Portrait className="bottom-panel-portrait" />
      <CommandCard className="bottom-panel-command" />
    </div>
  );
}
