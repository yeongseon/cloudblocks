import { CommandCard } from './CommandCard';
import { useUIStore } from '../../entities/store/uiStore';
import { BottomDockTabs } from './tabs/BottomDockTabs';
import { DiffTab } from './tabs/DiffTab';
import { LogsTab } from './tabs/LogsTab';
import { OutputTab } from './tabs/OutputTab';
import { ValidationTab } from './tabs/ValidationTab';
import './BottomPanel.css';

interface BottomPanelProps {
  className?: string;
}

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const bottomDock = useUIStore((s) => s.bottomDock);
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);

  const tabId = `bottom-dock-tab-${bottomDock.activeTab}`;

  const renderActiveTab = () => {
    if (bottomDock.activeTab === 'validation') {
      return <ValidationTab />;
    }
    if (bottomDock.activeTab === 'logs') {
      return <LogsTab />;
    }
    if (bottomDock.activeTab === 'diff') {
      return <DiffTab />;
    }
    return <OutputTab />;
  };

  return (
    <div className={`bottom-panel ${className}`} data-resource-guide={showResourceGuide}>
      <div className="bottom-panel-main">
        <BottomDockTabs />
        <div
          id="bottom-dock-tabpanel"
          className="bottom-panel-tab-content"
          role="tabpanel"
          aria-labelledby={tabId}
        >
          {renderActiveTab()}
        </div>
      </div>
      <aside className="bottom-panel-command">
        <CommandCard />
      </aside>
    </div>
  );
}
