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

  // Derived
  unreadCount: () => number;
  filteredNotifications: () => AppNotification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  filter: {},
  showNotificationCenter: false,

  addNotification: (notification) => {
    // Use crypto.randomUUID for collision-safe ID generation (#930)
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `notif-${crypto.randomUUID()}`
        : `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

    const newNotification: AppNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => {
      const updated = [newNotification, ...state.notifications];
      // Evict oldest when exceeding max
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

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  filteredNotifications: () => {
    const { notifications, filter } = get();
    return notifications.filter((n) => {
      if (filter.level && n.level !== filter.level) return false;
      if (filter.category && n.category !== filter.category) return false;
      if (filter.readStatus === 'read' && !n.read) return false;
      if (filter.readStatus === 'unread' && n.read) return false;
      return true;
    });
  },
}));
