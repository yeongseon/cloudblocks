import { create } from 'zustand';
import type {
  AppNotification,
  NotificationLevel,
  NotificationCategory,
} from '../../shared/types/notification';

const MAX_NOTIFICATIONS = 100;

export interface NotificationFilter {
  level?: NotificationLevel;
  category?: NotificationCategory;
  readStatus?: 'read' | 'unread' | 'all';
}

interface NotificationState {
  notifications: AppNotification[];
  filter: NotificationFilter;
  showNotificationCenter: boolean;

  addNotification: (
    notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setFilter: (filter: NotificationFilter) => void;
  toggleNotificationCenter: () => void;
  setShowNotificationCenter: (show: boolean) => void;
}

/** Derive unread count at the call site for proper reactivity. */
export function selectUnreadCount(s: NotificationState): number {
  return s.notifications.filter((n) => !n.read).length;
}

/** Derive filtered list at the call site for proper reactivity. */
export function selectFilteredNotifications(s: NotificationState): AppNotification[] {
  const { notifications, filter } = s;
  return notifications.filter((n) => {
    if (filter.level && n.level !== filter.level) return false;
    if (filter.category && n.category !== filter.category) return false;
    if (filter.readStatus === 'read' && !n.read) return false;
    if (filter.readStatus === 'unread' && n.read) return false;
    return true;
  });
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  filter: {},
  showNotificationCenter: false,

  addNotification: (notification) => {
    const id = crypto.randomUUID();

    const newNotification: AppNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => {
      const updated = [newNotification, ...state.notifications];
      if (updated.length > MAX_NOTIFICATIONS) {
        return { notifications: updated.slice(0, MAX_NOTIFICATIONS) };
      }
      return { notifications: updated };
    });
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  setFilter: (filter) => {
    set({ filter });
  },

  toggleNotificationCenter: () => {
    set((state) => ({
      showNotificationCenter: !state.showNotificationCenter,
    }));
  },

  setShowNotificationCenter: (show) => {
    set({ showNotificationCenter: show });
  },
}));
