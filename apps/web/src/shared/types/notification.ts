export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type NotificationCategory =
  | 'deployment'
  | 'promotion'
  | 'rollback'
  | 'sync'
  | 'pipeline'
  | 'system';

export interface AppNotification {
  id: string;
  level: NotificationLevel;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: number; // Date.now()
  read: boolean;
  metadata?: Record<string, unknown>;
}
