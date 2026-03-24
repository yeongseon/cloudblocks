import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { getErrorLog, clearErrorLog } from './errorLog';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content rendered</div>;
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
    clearErrorLog();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Content rendered')).toBeDefined();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Test error')).toBeDefined();
    expect(screen.getByText('Reload Page')).toBeDefined();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeDefined();
  });

  it('persists error to localStorage', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const log = getErrorLog();
    expect(log.length).toBe(1);
    expect(log[0].error.message).toBe('Test error');
    expect(log[0].timestamp).toBeTruthy();
    expect(log[0].release).toBeTruthy();
  });

  it('clearErrorLog removes all entries', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getErrorLog().length).toBe(1);
    clearErrorLog();
    expect(getErrorLog().length).toBe(0);
  });

  it('reload button calls location.reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(globalThis, 'location', {
      value: { ...globalThis.location, reload: reloadMock, href: 'http://test/' },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Reload Page'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('falls back to dev release when reading release meta throws', () => {
    const querySpy = vi.spyOn(document, 'querySelector').mockImplementation(() => {
      throw new Error('query failed');
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    const log = getErrorLog();
    expect(log[0].release).toBe('dev');
    querySpy.mockRestore();
  });

  it('trims persisted error log to max size', () => {
    const existing = Array.from({ length: 55 }, (_, index) => ({
      error: { name: 'Error', message: `old-${index}`, stack: '' },
      componentStack: '',
      timestamp: new Date(0).toISOString(),
      url: 'http://test/',
      release: 'dev',
    }));
    localStorage.setItem('cloudblocks_error_log', JSON.stringify(existing));

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    const log = getErrorLog();
    expect(log).toHaveLength(50);
    expect(log[0].error.message).toBe('Test error');
  });
});
