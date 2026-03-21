import { toast } from 'react-hot-toast';
import { useNotificationStore } from '../../entities/store/notificationStore';
import type { NotificationLevel, NotificationCategory } from '../../shared/types/notification';

/**
 * Add a notification to the store AND show a toast.
 *
 * Note: Requires a `<Toaster />` provider (from react-hot-toast) to be
 * mounted in the component tree for toast messages to be visible.
 */
export function notifyDeployment(
  title: string,
  message: string,
  level: NotificationLevel,
  category: NotificationCategory = 'deployment',
): void {
  useNotificationStore.getState().addNotification({
    level,
    category,
    title,
    message,
  });

  switch (level) {
    case 'success':
      toast.success(`${title}: ${message}`);
      break;
    case 'error':
      toast.error(`${title}: ${message}`);
      break;
    default:
      toast(`${title}: ${message}`);
      break;
  }
}

export function notifyDeploySuccess(message: string): void {
  notifyDeployment('Deployment Succeeded', message, 'success', 'deployment');
}

export function notifyDeployFailure(message: string): void {
  notifyDeployment('Deployment Failed', message, 'error', 'deployment');
}

export function notifyPromotionSuccess(message: string): void {
  notifyDeployment('Promotion Succeeded', message, 'success', 'promotion');
}

export function notifyRollbackSuccess(message: string): void {
  notifyDeployment('Rollback Succeeded', message, 'success', 'rollback');
}

export function notifySyncSuccess(message: string): void {
  notifyDeployment('Sync Complete', message, 'success', 'sync');
}

export function notifyPipelineUpdate(message: string): void {
  notifyDeployment('Pipeline Update', message, 'info', 'pipeline');
}
