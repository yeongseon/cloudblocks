import { useArchitectureStore } from '../../entities/store/architectureStore';
import {
  BLOCK_COLORS,
  BLOCK_FRIENDLY_NAMES,
  BLOCK_DESCRIPTIONS,
} from '../../shared/types/index';
import type { BlockCategory } from '../../shared/types/index';
import { useDraggable } from '../../shared/hooks/useDraggable';
import './LegendPanel.css';

import virtualNetworkIcon from '../../shared/assets/azure-icons/virtual-network.svg';
import subnetIcon from '../../shared/assets/azure-icons/subnet.svg';
import appGatewayIcon from '../../shared/assets/azure-icons/application-gateway.svg';
import virtualMachineIcon from '../../shared/assets/azure-icons/virtual-machine.svg';
import sqlDatabaseIcon from '../../shared/assets/azure-icons/sql-database.svg';
import storageAccountIcon from '../../shared/assets/azure-icons/storage-account.svg';
import appServiceIcon from '../../shared/assets/azure-icons/app-service.svg';
import serviceBusIcon from '../../shared/assets/azure-icons/service-bus.svg';
import eventHubIcon from '../../shared/assets/azure-icons/event-hub.svg';
import logicAppsIcon from '../../shared/assets/azure-icons/logic-apps.svg';

const BLOCK_AZURE_ICONS: Record<BlockCategory, string> = {
  gateway: appGatewayIcon,
  compute: virtualMachineIcon,
  database: sqlDatabaseIcon,
  storage: storageAccountIcon,
  function: appServiceIcon,
  queue: serviceBusIcon,
  event: eventHubIcon,
  timer: logicAppsIcon,
};

export function LegendPanel() {
  const blocks = useArchitectureStore((s) => s.workspace.architecture.blocks);
  const { position, handleMouseDown, isDragging } = useDraggable();
  
  const presentCategories = Array.from(
    new Set(blocks.map((b) => b.category))
  ) as BlockCategory[];

  return (
    <div 
      className="legend-panel"
      style={{ transform: `translate(${position.x}px, ${position.y}px) translateY(-50%)` }}
    >
      <h3 
        className="legend-title"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        🧱 Legend
      </h3>
      <div className="legend-subtitle">☁️ Azure Architecture</div>

      <div className="legend-section-label">Network</div>
      
      <div className="legend-item">
        <div className="legend-icon" style={{ backgroundColor: 'rgba(0, 120, 212, 0.1)' }}>
          <img src={virtualNetworkIcon} alt="Virtual Network" />
        </div>
        <div className="legend-info">
          <div className="legend-name">Virtual Network (VNet)</div>
          <div className="legend-desc">Your Azure cloud network boundary</div>
        </div>
      </div>
      
      <div className="legend-item">
        <div className="legend-icon" style={{ backgroundColor: 'rgba(0, 164, 239, 0.1)' }}>
          <img src={subnetIcon} alt="Public Subnet" />
        </div>
        <div className="legend-info">
          <div className="legend-name">Public Subnet</div>
          <div className="legend-desc">Internet-facing resources zone</div>
        </div>
      </div>
      
      <div className="legend-item">
        <div className="legend-icon" style={{ backgroundColor: 'rgba(92, 45, 145, 0.1)' }}>
          <img src={subnetIcon} alt="Private Subnet" />
        </div>
        <div className="legend-info">
          <div className="legend-name">Private Subnet</div>
          <div className="legend-desc">Internal-only secured zone</div>
        </div>
      </div>

      {presentCategories.length > 0 && (
        <>
          <div className="legend-section-label">Resources</div>
          {presentCategories.map((cat) => (
            <div key={cat} className="legend-item">
              <div
                className="legend-icon"
                style={{ backgroundColor: `color-mix(in srgb, ${BLOCK_COLORS[cat]} 15%, transparent)` }}
              >
                <img src={BLOCK_AZURE_ICONS[cat]} alt={cat} />
              </div>
              <div className="legend-info">
                <div className="legend-name">{BLOCK_FRIENDLY_NAMES[cat] || cat}</div>
                <div className="legend-desc">{BLOCK_DESCRIPTIONS[cat] || 'Architecture component'}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}