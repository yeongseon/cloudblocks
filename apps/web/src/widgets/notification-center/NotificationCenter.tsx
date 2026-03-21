import { useNotificationStore } from '../../entities/store/notificationStore';
import type { AppNotification, NotificationCategory, NotificationLevel } from '../../shared/types/notification';
import './NotificationCenter.css';

const LEVEL_ICONS: Record<NotificationLevel, string> = {
  info: '\u2139\uFE0F',
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  error: '\u274C',
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  deployment: 'Deployment',
  promotion: 'Promotion',
  rollback: 'Rollback',
  sync: 'Sync',
  pipeline: 'Pipeline',
  system: 'System',
};

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({
  notification,
  onRead,
  onRemove,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`notification-item${notification.read ? '' : ' notification-item--unread'}`}
      onClick={() => onRead(notification.id)}
    >
      <div className="notification-item-icon">
        {LEVEL_ICONS[notification.level]}
      </div>
      <div className="notification-item-body">
        <p className="notification-item-title">{notification.title}</p>
        <p className="notification-item-message">{notification.message}</p>
        <span className="notification-item-time">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>
      <button
        type="button"
        className="notification-item-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        title="Dismiss"
      >
        \u2715
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const filter = useNotificationStore((s) => s.filter);
  const setFilter = useNotificationStore((s) => s.setFilter);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const setShowNotificationCenter = useNotificationStore(
    (s) => s.setShowNotificationCenter,
  );
  const filteredNotifications = useNotificationStore(
    (s) => s.filteredNotifications,
  );

  const items = filteredNotifications();

  return (
    <div className="notification-center">
      <div className="notification-center-header">
        <h3 className="notification-center-title">Notifications</h3>
        <div className="notification-center-header-actions">
          <button
            type="button"
            className="notification-center-btn"
            onClick={markAllAsRead}
          >
            Mark all read
          </button>
          <button
            type="button"
            className="notification-center-close"
            onClick={() => setShowNotificationCenter(false)}
            title="Close"
          >
            \u2715
          </button>
        </div>
      </div>

      <div className="notification-center-filters">
        <select
          className="notification-center-filter-select"
          value={filter.category ?? ''}
          onChange={(e) =>
            setFilter({
              ...filter,
              category: (e.target.value || undefined) as
                | NotificationCategory
                | undefined,
            })
          }
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="notification-center-filter-select"
          value={filter.level ?? ''}
          onChange={(e) =>
            setFilter({
              ...filter,
              level: (e.target.value || undefined) as
                | NotificationLevel
                | undefined,
            })
          }
        >
          <option value="">All levels</option>
          {Object.entries(LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          className="notification-center-filter-select"
          value={filter.readStatus ?? 'all'}
          onChange={(e) =>
            setFilter({
              ...filter,
              readStatus: (e.target.value === 'all' ? undefined : e.target.value) as
                | 'read'
                | 'unread'
                | undefined,
            })
          }
        >
          <option value="all">All status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="notification-center-list">
        {items.length === 0 ? (
          <div className="notification-center-empty">
            No notifications
          </div>
        ) : (
          items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRead={markAsRead}
              onRemove={removeNotification}
            />
          ))
        )}
      </div>
    </div>
  );
}
