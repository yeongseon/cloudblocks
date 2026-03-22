type FunnelEvent =
  | 'app_loaded'
  | 'first_plate_placed'
  | 'first_block_placed'
  | 'first_connection_created'
  | 'template_loaded'
  | 'code_generated'
  | 'workspace_saved'
  | 'github_login'
  | 'github_repo_synced'
  | 'pr_created'
  | 'learning_scenario_started'
  | 'learning_scenario_completed';

interface MetricEntry {
  event: FunnelEvent;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, string | number | boolean>;
}

interface HealthSnapshot {
  timestamp: string;
  sessionId: string;
  heapUsedMB: number | null;
  heapTotalMB: number | null;
  domNodes: number;
  connectionCount: number | null;
  navigationTiming: {
    domContentLoaded: number | null;
    loadComplete: number | null;
  };
}

const METRICS_KEY = 'cloudblocks_funnel_metrics';
const HEALTH_KEY = 'cloudblocks_health_snapshots';
const MAX_METRICS = 200;
const MAX_HEALTH_SNAPSHOTS = 50;

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

let currentSessionId = generateSessionId();

function getMetricsLog(): MetricEntry[] {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    return raw ? (JSON.parse(raw) as MetricEntry[]) : [];
  } catch {
    return [];
  }
}

function persistMetric(entry: MetricEntry): void {
  try {
    const log = getMetricsLog();
    log.push(entry);
    if (log.length > MAX_METRICS) {
      log.splice(0, log.length - MAX_METRICS);
    }
    localStorage.setItem(METRICS_KEY, JSON.stringify(log));
  } catch {
    // storage unavailable
  }
}

function trackEvent(
  event: FunnelEvent,
  metadata?: Record<string, string | number | boolean>,
): void {
  const entry: MetricEntry = {
    event,
    timestamp: new Date().toISOString(),
    sessionId: currentSessionId,
    ...(metadata && { metadata }),
  };

  persistMetric(entry);

  const endpoint = import.meta.env.VITE_METRICS_URL as string | undefined;
  if (endpoint && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(entry));
    } catch {
      // beacon unavailable
    }
  }
}

function captureHealthSnapshot(connectionCount: number | null = null): HealthSnapshot {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;

  let domContentLoaded: number | null = null;
  let loadComplete: number | null = null;
  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length > 0) {
    const nav = navEntries[0] as PerformanceNavigationTiming;
    domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
    loadComplete = Math.round(nav.loadEventEnd);
  }

  const snapshot: HealthSnapshot = {
    timestamp: new Date().toISOString(),
    sessionId: currentSessionId,
    heapUsedMB: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null,
    heapTotalMB: memory ? Math.round(memory.totalJSHeapSize / 1024 / 1024) : null,
    domNodes: document.querySelectorAll('*').length,
    connectionCount,
    navigationTiming: { domContentLoaded, loadComplete },
  };

  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    const snapshots: HealthSnapshot[] = raw ? (JSON.parse(raw) as HealthSnapshot[]) : [];
    snapshots.push(snapshot);
    if (snapshots.length > MAX_HEALTH_SNAPSHOTS) {
      snapshots.splice(0, snapshots.length - MAX_HEALTH_SNAPSHOTS);
    }
    localStorage.setItem(HEALTH_KEY, JSON.stringify(snapshots));
  } catch {
    // storage unavailable
  }

  return snapshot;
}

function getHealthSnapshots(): HealthSnapshot[] {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    return raw ? (JSON.parse(raw) as HealthSnapshot[]) : [];
  } catch {
    return [];
  }
}

function clearMetrics(): void {
  try {
    localStorage.removeItem(METRICS_KEY);
    localStorage.removeItem(HEALTH_KEY);
  } catch {
    // ignore
  }
}

function resetSession(): void {
  currentSessionId = generateSessionId();
}

function getSessionId(): string {
  return currentSessionId;
}

export const metricsService = {
  trackEvent,
  captureHealthSnapshot,
  getMetricsLog,
  getHealthSnapshots,
  clearMetrics,
  resetSession,
  getSessionId,
};

export type { FunnelEvent, MetricEntry, HealthSnapshot };
