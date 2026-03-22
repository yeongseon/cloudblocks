import { useMemo } from 'react';
import { useUIStore } from '../../../entities/store/uiStore';
import './LogsTab.css';

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }

  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function LogsTab() {
  const activityLog = useUIStore((s) => s.activityLog);
  const clearLog = useUIStore((s) => s.clearLog);

  const entries = useMemo(() => [...activityLog].reverse(), [activityLog]);

  return (
    <div className="bottom-dock-logs">
      <div className="bottom-dock-logs-header">
        <h3 className="bottom-dock-logs-title">Activity Log</h3>
        <button type="button" className="bottom-dock-logs-clear" onClick={clearLog}>
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bottom-dock-logs-empty">No activity logged yet.</div>
      ) : (
        <ul className="bottom-dock-logs-list">
          {entries.map((entry) => (
            <li key={entry.id} className="bottom-dock-log-item">
              <span className="bottom-dock-log-time">{formatTimestamp(entry.ts)}</span>
              <span className={`bottom-dock-log-level bottom-dock-log-level--${entry.level}`}>{entry.level}</span>
              <span className="bottom-dock-log-message">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
