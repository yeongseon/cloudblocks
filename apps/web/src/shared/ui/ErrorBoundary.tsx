import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorRecord {
  error: Error;
  componentStack: string;
  timestamp: string;
  url: string;
  release: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ERROR_LOG_KEY = 'cloudblocks_error_log';
const MAX_ERROR_LOG_SIZE = 50;

function getRelease(): string {
  try {
    return document.querySelector('meta[name="cb-release"]')?.getAttribute('content') ?? 'dev';
  } catch {
    return 'dev';
  }
}

function persistError(record: ErrorRecord): void {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    const log: ErrorRecord[] = raw ? (JSON.parse(raw) as ErrorRecord[]) : [];
    log.unshift(record);
    if (log.length > MAX_ERROR_LOG_SIZE) {
      log.length = MAX_ERROR_LOG_SIZE;
    }
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log));
  } catch {
    // storage full or unavailable — silently skip
  }
}

function reportError(error: Error, componentStack: string): void {
  const record: ErrorRecord = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    } as unknown as Error,
    componentStack,
    timestamp: new Date().toISOString(),
    url: globalThis.location?.href ?? '',
    release: getRelease(),
  };

  persistError(record);
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, info.componentStack ?? '');
  }

  private handleReload = (): void => {
    globalThis.location?.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#ffffff',
            color: '#1e293b',
            fontFamily: 'system-ui, sans-serif',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '24px', margin: 0, color: '#dc2626' }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px' }}>
            CloudBlocks encountered an unexpected error. The error has been logged. Try reloading
            the page.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: '12px',
                color: '#475569',
                background: '#f1f5f9',
                padding: '12px',
                borderRadius: '8px',
                maxWidth: '600px',
                overflow: 'auto',
                maxHeight: '120px',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              background: '#4a90d9',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
