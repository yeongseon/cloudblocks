import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-hot-toast';
import { isApiConfigured } from '../../shared/api/client';

import {
  notifyDeployment,
  notifyDeploySuccess,
  notifyDeployFailure,
  notifyPromotionSuccess,
  notifyRollbackSuccess,
  notifySyncSuccess,
  notifyPipelineUpdate,
} from './notifications';
import { useNotificationStore } from '../../entities/store/notificationStore';

vi.mock('react-hot-toast', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../shared/api/client', () => ({
  isApiConfigured: vi.fn(),
}));

const mockIsApiConfigured = vi.mocked(isApiConfigured);

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsApiConfigured.mockReturnValue(true);
    useNotificationStore.setState({ notifications: [], filter: {} });
  });

  it('notifyDeployment adds notification and shows success toast', () => {
    notifyDeployment('Deploy', 'Done', 'success', 'deployment');

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Deploy');
    expect(notifications[0].level).toBe('success');
    expect(toast.success).toHaveBeenCalledWith('Deploy: Done');
  });

  it('notifyDeployment shows error toast for error level', () => {
    notifyDeployment('Deploy', 'Failed', 'error');

    expect(toast.error).toHaveBeenCalledWith('Deploy: Failed');
  });

  it('notifyDeployment shows default toast for info level', () => {
    notifyDeployment('Info', 'Message', 'info');

    expect(toast).toHaveBeenCalledWith('Info: Message');
  });

  it('notifyDeployment shows default toast for warning level', () => {
    notifyDeployment('Warn', 'Check', 'warning');

    expect(toast).toHaveBeenCalledWith('Warn: Check');
  });

  it('notifyDeployment defaults category to deployment', () => {
    notifyDeployment('Title', 'Msg', 'info');

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications[0].category).toBe('deployment');
  });

  it('notifyDeploySuccess creates success deployment notification', () => {
    notifyDeploySuccess('v1.0 deployed');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.title).toBe('Deployment Succeeded');
    expect(n.level).toBe('success');
    expect(n.category).toBe('deployment');
  });

  it('notifyDeployFailure creates error deployment notification', () => {
    notifyDeployFailure('timeout');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.title).toBe('Deployment Failed');
    expect(n.level).toBe('error');
  });

  it('notifyPromotionSuccess creates success promotion notification', () => {
    notifyPromotionSuccess('promoted');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.category).toBe('promotion');
  });

  it('notifyRollbackSuccess creates success rollback notification', () => {
    notifyRollbackSuccess('rolled back');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.category).toBe('rollback');
  });

  it('notifySyncSuccess creates success sync notification', () => {
    notifySyncSuccess('synced');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.category).toBe('sync');
  });

  it('notifyPipelineUpdate creates info pipeline notification', () => {
    notifyPipelineUpdate('build started');

    const n = useNotificationStore.getState().notifications[0];
    expect(n.level).toBe('info');
    expect(n.category).toBe('pipeline');
  });

  it('shows backend-required warning and skips deployment notification when backend is not configured', () => {
    mockIsApiConfigured.mockReturnValue(false);

    notifyDeploySuccess('v1.0 deployed');

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Ops features unavailable');
    expect(notifications[0].category).toBe('system');
    expect(notifications[0].level).toBe('warning');
    expect(notifications[0].message).toBe(
      'Ops features require the backend API - see setup guide.',
    );
    expect(toast).toHaveBeenCalledWith('Ops features require the backend API - see setup guide.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
