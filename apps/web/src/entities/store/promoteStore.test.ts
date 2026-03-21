import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { usePromoteStore } from './promoteStore';

describe('usePromoteStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePromoteStore.setState({
      showPromoteDialog: false,
      promotionChecklist: {
        stagingHealthy: false,
        ciPassed: false,
        noActiveIncidents: false,
        manualApproval: false,
      },
      promoting: false,
      promotionError: null,
      showRollbackDialog: false,
      availableVersions: [],
      selectedRollbackVersion: null,
      rollingBack: false,
      rollbackError: null,
      promotionHistory: [],
      rollbackHistory: [],
      showPromoteHistory: false,
      loadingHistory: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = usePromoteStore.getState();
      expect(state.showPromoteDialog).toBe(false);
      expect(state.promoting).toBe(false);
      expect(state.promotionError).toBe(null);
      expect(state.showRollbackDialog).toBe(false);
      expect(state.rollingBack).toBe(false);
      expect(state.rollbackError).toBe(null);
      expect(state.showPromoteHistory).toBe(false);
      expect(state.promotionChecklist).toEqual({
        stagingHealthy: false,
        ciPassed: false,
        noActiveIncidents: false,
        manualApproval: false,
      });
    });
  });

  describe('togglePromoteDialog', () => {
    it('toggles promote dialog visibility', () => {
      usePromoteStore.getState().togglePromoteDialog();
      expect(usePromoteStore.getState().showPromoteDialog).toBe(true);

      usePromoteStore.getState().togglePromoteDialog();
      expect(usePromoteStore.getState().showPromoteDialog).toBe(false);
    });
  });

  describe('toggleRollbackDialog', () => {
    it('toggles rollback dialog visibility', () => {
      usePromoteStore.getState().toggleRollbackDialog();
      expect(usePromoteStore.getState().showRollbackDialog).toBe(true);

      usePromoteStore.getState().toggleRollbackDialog();
      expect(usePromoteStore.getState().showRollbackDialog).toBe(false);
    });
  });

  describe('togglePromoteHistory', () => {
    it('toggles promote history visibility', () => {
      usePromoteStore.getState().togglePromoteHistory();
      expect(usePromoteStore.getState().showPromoteHistory).toBe(true);

      usePromoteStore.getState().togglePromoteHistory();
      expect(usePromoteStore.getState().showPromoteHistory).toBe(false);
    });
  });

  describe('updateChecklist', () => {
    it('updates individual checklist keys', () => {
      usePromoteStore.getState().updateChecklist('stagingHealthy', true);
      expect(
        usePromoteStore.getState().promotionChecklist.stagingHealthy,
      ).toBe(true);
      expect(usePromoteStore.getState().promotionChecklist.ciPassed).toBe(
        false,
      );

      usePromoteStore.getState().updateChecklist('ciPassed', true);
      expect(usePromoteStore.getState().promotionChecklist.ciPassed).toBe(true);
    });
  });

  describe('resetChecklist', () => {
    it('resets all checklist items to false', () => {
      usePromoteStore.getState().updateChecklist('stagingHealthy', true);
      usePromoteStore.getState().updateChecklist('ciPassed', true);
      usePromoteStore.getState().updateChecklist('manualApproval', true);

      usePromoteStore.getState().resetChecklist();

      const { promotionChecklist } = usePromoteStore.getState();
      expect(promotionChecklist.stagingHealthy).toBe(false);
      expect(promotionChecklist.ciPassed).toBe(false);
      expect(promotionChecklist.noActiveIncidents).toBe(false);
      expect(promotionChecklist.manualApproval).toBe(false);
    });
  });

  describe('promote', () => {
    it('sets promoting=true then completes with a history record', async () => {
      const promise = usePromoteStore.getState().promote('sha-abc123');
      expect(usePromoteStore.getState().promoting).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const state = usePromoteStore.getState();
      expect(state.promoting).toBe(false);
      expect(state.promotionHistory).toHaveLength(1);
      expect(state.promotionHistory[0].imageTag).toBe('sha-abc123');
      expect(state.promotionHistory[0].status).toBe('success');
      expect(state.showPromoteDialog).toBe(false);
      // Checklist should be reset
      expect(state.promotionChecklist.stagingHealthy).toBe(false);
    });
  });

  describe('rollback', () => {
    it('performs rollback and adds record to history', async () => {
      const version = {
        imageTag: 'v1.4.0-sha-91a8f33',
        commitSha: '91a8f33',
        commitMessage: 'feat: implement batch processing endpoint',
        deployedAt: new Date().toISOString(),
        environment: 'production' as const,
      };

      const promise = usePromoteStore
        .getState()
        .rollback(version, 'Memory leak detected');
      expect(usePromoteStore.getState().rollingBack).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const state = usePromoteStore.getState();
      expect(state.rollingBack).toBe(false);
      expect(state.rollbackHistory).toHaveLength(1);
      expect(state.rollbackHistory[0].toImageTag).toBe('v1.4.0-sha-91a8f33');
      expect(state.rollbackHistory[0].reason).toBe('Memory leak detected');
      expect(state.showRollbackDialog).toBe(false);
    });
  });

  describe('loadAvailableVersions', () => {
    it('populates available versions', async () => {
      const promise = usePromoteStore.getState().loadAvailableVersions();

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const { availableVersions } = usePromoteStore.getState();
      expect(availableVersions.length).toBeGreaterThan(0);
      expect(availableVersions[0]).toHaveProperty('imageTag');
      expect(availableVersions[0]).toHaveProperty('commitSha');
    });
  });

  describe('loadHistory', () => {
    it('populates promotion and rollback history records', async () => {
      const promise = usePromoteStore.getState().loadHistory();
      expect(usePromoteStore.getState().loadingHistory).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const state = usePromoteStore.getState();
      expect(state.loadingHistory).toBe(false);
      expect(state.promotionHistory.length).toBeGreaterThan(0);
      expect(state.rollbackHistory.length).toBeGreaterThan(0);
    });
  });
});
