import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metricsService } from './metricsService';

const METRICS_KEY = 'cloudblocks_funnel_metrics';
const HEALTH_KEY = 'cloudblocks_health_snapshots';

describe('metricsService', () => {
  beforeEach(() => {
    metricsService.clearMetrics();
    metricsService.resetSession();
  });

  it('trackEvent persists to localStorage', () => {
    metricsService.trackEvent('app_loaded');
    const log = metricsService.getMetricsLog();
    expect(log.length).toBe(1);
    expect(log[0].event).toBe('app_loaded');
    expect(log[0].sessionId).toBeTruthy();
    expect(log[0].timestamp).toBeTruthy();
  });

  it('trackEvent includes metadata when provided', () => {
    metricsService.trackEvent('template_loaded', { templateId: 'three-tier' });
    const log = metricsService.getMetricsLog();
    expect(log[0].metadata).toEqual({ templateId: 'three-tier' });
  });

  it('trackEvent without metadata does not include metadata key', () => {
    metricsService.trackEvent('app_loaded');
    const log = metricsService.getMetricsLog();
    expect(log[0].metadata).toBeUndefined();
  });

  it('tracks multiple events in order', () => {
    metricsService.trackEvent('app_loaded');
    metricsService.trackEvent('first_plate_placed');
    metricsService.trackEvent('first_block_placed');
    const log = metricsService.getMetricsLog();
    expect(log.length).toBe(3);
    expect(log.map((e) => e.event)).toEqual([
      'app_loaded',
      'first_plate_placed',
      'first_block_placed',
    ]);
  });

  it('clearMetrics removes all entries', () => {
    metricsService.trackEvent('app_loaded');
    metricsService.trackEvent('code_generated');
    expect(metricsService.getMetricsLog().length).toBe(2);
    metricsService.clearMetrics();
    expect(metricsService.getMetricsLog().length).toBe(0);
    expect(metricsService.getHealthSnapshots().length).toBe(0);
  });

  it('captureHealthSnapshot returns valid snapshot', () => {
    const snapshot = metricsService.captureHealthSnapshot(5);
    expect(snapshot.sessionId).toBeTruthy();
    expect(snapshot.timestamp).toBeTruthy();
    expect(snapshot.domNodes).toBeGreaterThan(0);
    expect(snapshot.connectionCount).toBe(5);
    expect(snapshot.navigationTiming).toBeDefined();
  });

  it('captureHealthSnapshot persists to localStorage', () => {
    metricsService.captureHealthSnapshot();
    const snapshots = metricsService.getHealthSnapshots();
    expect(snapshots.length).toBe(1);
  });

  it('resetSession generates a new session ID', () => {
    const id1 = metricsService.getSessionId();
    metricsService.resetSession();
    const id2 = metricsService.getSessionId();
    expect(id1).not.toBe(id2);
  });

  it('all events in same session share session ID', () => {
    metricsService.trackEvent('app_loaded');
    metricsService.trackEvent('first_plate_placed');
    const log = metricsService.getMetricsLog();
    expect(log[0].sessionId).toBe(log[1].sessionId);
  });

  it('returns empty metrics log when persisted JSON is invalid', () => {
    localStorage.setItem(METRICS_KEY, '{invalid-json');
    expect(metricsService.getMetricsLog()).toEqual([]);
  });

  it('keeps only latest 200 metrics', () => {
    for (let i = 0; i < 205; i += 1) {
      metricsService.trackEvent('app_loaded', { index: i });
    }

    const log = metricsService.getMetricsLog();
    expect(log).toHaveLength(200);
    expect(log[0].metadata).toEqual({ index: 5 });
    expect(log[199].metadata).toEqual({ index: 204 });
  });

  it('swallows persist metric errors when localStorage.setItem fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(() => metricsService.trackEvent('app_loaded')).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('reads navigation timing entries when available', () => {
    const navigationEntry = {
      domContentLoadedEventEnd: 123.6,
      loadEventEnd: 456.2,
    } as unknown as PerformanceNavigationTiming;
    const navigationSpy = vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([navigationEntry]);

    const snapshot = metricsService.captureHealthSnapshot();

    expect(snapshot.navigationTiming).toEqual({
      domContentLoaded: 124,
      loadComplete: 456,
    });

    navigationSpy.mockRestore();
  });

  it('captures heap usage values when performance memory is available', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(performance, 'memory');
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: {
        usedJSHeapSize: 12.4 * 1024 * 1024,
        totalJSHeapSize: 48.6 * 1024 * 1024,
      },
    });

    const snapshot = metricsService.captureHealthSnapshot();

    expect(snapshot.heapUsedMB).toBe(12);
    expect(snapshot.heapTotalMB).toBe(49);

    if (originalDescriptor) {
      Object.defineProperty(performance, 'memory', originalDescriptor);
    } else {
      Reflect.deleteProperty(performance, 'memory');
    }
  });

  it('keeps only latest 50 health snapshots', () => {
    for (let i = 0; i < 52; i += 1) {
      metricsService.captureHealthSnapshot(i);
    }

    const snapshots = metricsService.getHealthSnapshots();
    expect(snapshots).toHaveLength(50);
    expect(snapshots[0].connectionCount).toBe(2);
    expect(snapshots[49].connectionCount).toBe(51);
  });

  it('returns empty health snapshots when persisted JSON is invalid', () => {
    localStorage.setItem(HEALTH_KEY, '{invalid-json');
    expect(metricsService.getHealthSnapshots()).toEqual([]);
  });

  it('swallows health snapshot persistence errors when localStorage.setItem fails', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(() => metricsService.captureHealthSnapshot()).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('swallows clearMetrics errors when localStorage.removeItem fails', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(() => metricsService.clearMetrics()).not.toThrow();

    removeItemSpy.mockRestore();
  });
});
