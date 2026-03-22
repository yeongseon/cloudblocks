import { useUIStore } from '../../../entities/store/uiStore';
import { DetailPanel } from '../DetailPanel';
import { Minimap } from '../Minimap';

export function OutputTab() {
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);

  return (
    <div className="bottom-dock-output">
      <Minimap className="bottom-panel-minimap" />
      {showResourceGuide && <DetailPanel className="bottom-panel-detail" />}
    </div>
  );
}
