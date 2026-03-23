import './BottomDockTabs.css';

/** @deprecated Bottom dock is removed from layout. This component is retained for potential LEGO theme mode. */
type BottomDockTab = 'output' | 'validation' | 'logs' | 'diff';

const TABS: Array<{ id: BottomDockTab; label: string }> = [
  { id: 'output', label: 'Output' },
  { id: 'validation', label: 'Validation' },
  { id: 'logs', label: 'Logs' },
  { id: 'diff', label: 'Diff' },
];

interface BottomDockTabsProps {
  activeTab: BottomDockTab;
  onTabChange: (tab: BottomDockTab) => void;
}

export function BottomDockTabs({ activeTab, onTabChange }: BottomDockTabsProps) {
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
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
