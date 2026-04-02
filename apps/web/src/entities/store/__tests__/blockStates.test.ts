import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('Block status overlay (#1591)', () => {
  beforeEach(() => {
    useUIStore.setState({ blockStatuses: new Map() });
  });

  describe('initial state', () => {
    it('should have an empty blockStatuses map', () => {
      const { blockStatuses } = useUIStore.getState();
      expect(blockStatuses.size).toBe(0);
    });
  });

  describe('setBlockStatus', () => {
    it('should set a block status entry', () => {
      useUIStore.getState().setBlockStatus('block-1', { disabled: true });

      const status = useUIStore.getState().blockStatuses.get('block-1');
      expect(status).toEqual({ disabled: true });
    });

    it('should merge with existing status (not replace)', () => {
      const { setBlockStatus } = useUIStore.getState();
      setBlockStatus('block-1', { disabled: true });
      setBlockStatus('block-1', { error: true });

      const status = useUIStore.getState().blockStatuses.get('block-1');
      expect(status).toEqual({ disabled: true, error: true });
    });

    it('should override specific fields when re-set', () => {
      const { setBlockStatus } = useUIStore.getState();
      setBlockStatus('block-1', { healthStatus: 'warn' });
      setBlockStatus('block-1', { healthStatus: 'error' });

      const status = useUIStore.getState().blockStatuses.get('block-1');
      expect(status?.healthStatus).toBe('error');
    });

    it('should handle multiple blocks independently', () => {
      const { setBlockStatus } = useUIStore.getState();
      setBlockStatus('block-1', { disabled: true });
      setBlockStatus('block-2', { error: true });
      setBlockStatus('block-3', { healthStatus: 'ok' });

      const statuses = useUIStore.getState().blockStatuses;
      expect(statuses.get('block-1')).toEqual({ disabled: true });
      expect(statuses.get('block-2')).toEqual({ error: true });
      expect(statuses.get('block-3')).toEqual({ healthStatus: 'ok' });
    });

    it('should set all status fields at once', () => {
      useUIStore
        .getState()
        .setBlockStatus('block-1', { disabled: false, error: true, healthStatus: 'error' });

      const status = useUIStore.getState().blockStatuses.get('block-1');
      expect(status).toEqual({ disabled: false, error: true, healthStatus: 'error' });
    });
  });

  describe('clearBlockStatus', () => {
    it('should remove a block status entry', () => {
      const { setBlockStatus, clearBlockStatus } = useUIStore.getState();
      setBlockStatus('block-1', { disabled: true });
      clearBlockStatus('block-1');

      expect(useUIStore.getState().blockStatuses.has('block-1')).toBe(false);
    });

    it('should not affect other block statuses', () => {
      const { setBlockStatus, clearBlockStatus } = useUIStore.getState();
      setBlockStatus('block-1', { disabled: true });
      setBlockStatus('block-2', { error: true });
      clearBlockStatus('block-1');

      const statuses = useUIStore.getState().blockStatuses;
      expect(statuses.has('block-1')).toBe(false);
      expect(statuses.get('block-2')).toEqual({ error: true });
    });

    it('should be a no-op for non-existent block', () => {
      useUIStore.getState().clearBlockStatus('nonexistent');
      expect(useUIStore.getState().blockStatuses.size).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should create a new Map reference on setBlockStatus', () => {
      const before = useUIStore.getState().blockStatuses;
      useUIStore.getState().setBlockStatus('block-1', { disabled: true });
      const after = useUIStore.getState().blockStatuses;
      expect(before).not.toBe(after);
    });

    it('should create a new Map reference on clearBlockStatus', () => {
      useUIStore.getState().setBlockStatus('block-1', { disabled: true });
      const before = useUIStore.getState().blockStatuses;
      useUIStore.getState().clearBlockStatus('block-1');
      const after = useUIStore.getState().blockStatuses;
      expect(before).not.toBe(after);
    });
  });
});
