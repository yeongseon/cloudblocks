interface ErrorRecord {
  error: Error;
  componentStack: string;
  timestamp: string;
  url: string;
  release: string;
}

const ERROR_LOG_KEY = 'cloudblocks_error_log';

export function getErrorLog(): ErrorRecord[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    return raw ? (JSON.parse(raw) as ErrorRecord[]) : [];
  } catch {
    return [];
  }
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    // ignore
  }
}
