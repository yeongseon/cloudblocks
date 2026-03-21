import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      filter: {},
      showNotificationCenter: false,
    });
  });

  describe('addNotification', () => {
    it('creates notification with id, timestamp, and read=false', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'deployment',
        title: 'Deploy started',
        message: 'Deploying to staging',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toMatch(/^notif-/);
      expect(notifications[0].timestamp).toBeGreaterThan(0);
      expect(notifications[0].read).toBe(false);
      expect(notifications[0].title).toBe('Deploy started');
    });
  });

  describe('markAsRead', () => {
    it('marks a specific notification as read', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'A',
        message: 'a',
      });
      useNotificationStore.getState().addNotification({
        level: 'warning',
        category: 'system',
        title: 'B',
        message: 'b',
      });

      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().markAsRead(id);

      const { notifications } = useNotificationStore.getState();
      expect(notifications.find((n) => n.id === id)!.read).toBe(true);
      expect(notifications.find((n) => n.id !== id)!.read).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'A',
        message: 'a',
      });
      useNotificationStore.getState().addNotification({
        level: 'warning',
        category: 'system',
        title: 'B',
        message: 'b',
      });

      useNotificationStore.getState().markAllAsRead();

      const { notifications } = useNotificationStore.getState();
      expect(notifications.every((n) => n.read)).toBe(true);
    });
  });

  describe('removeNotification', () => {
    it('removes a notification by id', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'A',
        message: 'a',
      });
      useNotificationStore.getState().addNotification({
        level: 'warning',
        category: 'system',
        title: 'B',
        message: 'b',
      });

      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().removeNotification(id);

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).not.toBe(id);
    });
  });

  describe('clearAll', () => {
    it('empties the notification list', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'A',
        message: 'a',
      });
      useNotificationStore.getState().addNotification({
        level: 'error',
        category: 'system',
        title: 'B',
        message: 'b',
      });

      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('unreadCount', () => {
    it('returns the correct count of unread notifications', () => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'A',
        message: 'a',
      });
      useNotificationStore.getState().addNotification({
        level: 'warning',
        category: 'system',
        title: 'B',
        message: 'b',
      });
      useNotificationStore.getState().addNotification({
        level: 'error',
        category: 'system',
        title: 'C',
        message: 'c',
      });

      expect(useNotificationStore.getState().unreadCount()).toBe(3);

      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().markAsRead(id);
      expect(useNotificationStore.getState().unreadCount()).toBe(2);
    });
  });

  describe('filteredNotifications', () => {
    beforeEach(() => {
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'deployment',
        title: 'Deploy',
        message: 'deploy msg',
      });
      useNotificationStore.getState().addNotification({
        level: 'error',
        category: 'pipeline',
        title: 'Pipeline fail',
        message: 'pipeline msg',
      });
      useNotificationStore.getState().addNotification({
        level: 'info',
        category: 'system',
        title: 'System',
        message: 'system msg',
      });
      // Mark one as read
      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().markAsRead(id);
    });

    it('filters by level', () => {
      useNotificationStore.getState().setFilter({ level: 'error' });
      const filtered = useNotificationStore.getState().filteredNotifications();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].level).toBe('error');
    });

    it('filters by category', () => {
      useNotificationStore.getState().setFilter({ category: 'deployment' });
      const filtered = useNotificationStore.getState().filteredNotifications();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('deployment');
    });

    it('filters by readStatus', () => {
      useNotificationStore.getState().setFilter({ readStatus: 'unread' });
      const filtered = useNotificationStore.getState().filteredNotifications();
      expect(filtered).toHaveLength(2);
      expect(filtered.every((n) => !n.read)).toBe(true);
    });

    it('returns all when no filter set', () => {
      useNotificationStore.getState().setFilter({});
      const filtered = useNotificationStore.getState().filteredNotifications();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('max notifications eviction', () => {
    it('evicts oldest notifications when exceeding 100', () => {
      for (let i = 0; i < 105; i++) {
        useNotificationStore.getState().addNotification({
          level: 'info',
          category: 'system',
          title: `N${i}`,
          message: `msg ${i}`,
        });
      }

      expect(useNotificationStore.getState().notifications).toHaveLength(100);
      // Most recent should be first
      expect(useNotificationStore.getState().notifications[0].title).toBe('N104');
    });
  });

  describe('toggleNotificationCenter', () => {
    it('toggles showNotificationCenter visibility', () => {
      expect(useNotificationStore.getState().showNotificationCenter).toBe(false);

      useNotificationStore.getState().toggleNotificationCenter();
      expect(useNotificationStore.getState().showNotificationCenter).toBe(true);

      useNotificationStore.getState().toggleNotificationCenter();
      expect(useNotificationStore.getState().showNotificationCenter).toBe(false);
    });
  });
});
