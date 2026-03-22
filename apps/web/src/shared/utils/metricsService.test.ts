import { describe, it, expect, beforeEach } from 'vitest';
import { metricsService } from './metricsService';

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
    expect(log.map(e => e.event)).toEqual([
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
});
