import { CommandCard } from './CommandCard';
import React from 'react';
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

export type BottomDockTab = 'output' | 'validation' | 'logs' | 'diff';

export function BottomPanel({ className = '' }: BottomPanelProps) {
  const [activeTab, setActiveTab] = React.useState<BottomDockTab>('output');
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);

  const tabId = `bottom-dock-tab-${activeTab}`;

  const renderActiveTab = () => {
    if (activeTab === 'validation') {
      return <ValidationTab />;
    }
    if (activeTab === 'logs') {
      return <LogsTab />;
    }
    if (activeTab === 'diff') {
      return <DiffTab />;
    }
    return <OutputTab />;
  };

  return (
    <div className={`bottom-panel ${className}`} data-resource-guide={showResourceGuide}>
      <div className="bottom-panel-main">
        <BottomDockTabs activeTab={activeTab} onTabChange={setActiveTab} />
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
