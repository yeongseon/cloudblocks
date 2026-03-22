import type { BottomDockTab } from '../../../entities/store/uiStore';
import { useUIStore } from '../../../entities/store/uiStore';
import './BottomDockTabs.css';

const TABS: Array<{ id: BottomDockTab; label: string }> = [
  { id: 'output', label: 'Output' },
  { id: 'validation', label: 'Validation' },
  { id: 'logs', label: 'Logs' },
  { id: 'diff', label: 'Diff' },
];

export function BottomDockTabs() {
  const activeTab = useUIStore((s) => s.bottomDock.activeTab);
  const setBottomTab = useUIStore((s) => s.setBottomTab);

  return (
    <div className="bottom-dock-tabs" role="tablist" aria-label="Bottom dock panels">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`bottom-dock-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="bottom-dock-tabpanel"
          className={`bottom-dock-tab${activeTab === tab.id ? ' is-active' : ''}`}
          onClick={() => setBottomTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
