import { beforeEach, describe, expect, it } from 'vitest';
import { computeAutoLabelMode, useUIStore } from '../uiStore';

describe('zoom-dependent label density', () => {
  beforeEach(() => {
    useUIStore.setState({
      labelModeOverride: 'auto',
      canvasZoom: 0.85,
      effectiveLabelMode: 'learning',
    });
  });

  describe('computeAutoLabelMode', () => {
    it('returns compact at low zoom', () => {
      expect(computeAutoLabelMode(0.3, 'learning')).toBe('compact');
      expect(computeAutoLabelMode(0.5, 'learning')).toBe('compact');
    });

    it('returns learning at medium zoom', () => {
      expect(computeAutoLabelMode(0.85, 'compact')).toBe('learning');
      expect(computeAutoLabelMode(1, 'compact')).toBe('learning');
    });

    it('returns inspect at high zoom', () => {
      expect(computeAutoLabelMode(1.8, 'learning')).toBe('inspect');
      expect(computeAutoLabelMode(2.5, 'learning')).toBe('inspect');
    });

    it('keeps previous mode in hysteresis zones', () => {
      expect(computeAutoLabelMode(0.6, 'compact')).toBe('compact');
      expect(computeAutoLabelMode(0.6, 'learning')).toBe('learning');
      expect(computeAutoLabelMode(1.5, 'learning')).toBe('learning');
      expect(computeAutoLabelMode(1.5, 'inspect')).toBe('inspect');
    });
  });

  describe('store integration', () => {
    it('uses auto override by default and follows zoom thresholds', () => {
      const state = useUIStore.getState();
      expect(state.labelModeOverride).toBe('auto');
      expect(state.effectiveLabelMode).toBe('learning');

      state.setCanvasZoom(0.3);
      expect(useUIStore.getState().effectiveLabelMode).toBe('compact');

      state.setCanvasZoom(2);
      expect(useUIStore.getState().effectiveLabelMode).toBe('inspect');
    });

    it('respects override mode and returns to auto behavior', () => {
      const state = useUIStore.getState();

      state.setCanvasZoom(2);
      expect(useUIStore.getState().effectiveLabelMode).toBe('inspect');

      state.setLabelModeOverride('compact');
      expect(useUIStore.getState().effectiveLabelMode).toBe('compact');

      state.setCanvasZoom(2.5);
      expect(useUIStore.getState().effectiveLabelMode).toBe('compact');

      state.setLabelModeOverride('auto');
      expect(useUIStore.getState().effectiveLabelMode).toBe('inspect');
    });
  });

  describe('backward compatibility', () => {
    it('setLabelMode sets override and labelMode getter mirrors effective mode', () => {
      const state = useUIStore.getState();

      state.setLabelMode('learning');
      expect(useUIStore.getState().labelModeOverride).toBe('learning');
      expect(useUIStore.getState().labelMode).toBe('learning');

      state.setLabelModeOverride('auto');
      state.setCanvasZoom(0.3);
      expect(useUIStore.getState().labelMode).toBe('compact');
    });
  });
});
