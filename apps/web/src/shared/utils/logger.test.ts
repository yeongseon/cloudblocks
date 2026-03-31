import { describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  it('calls console.warn when running in dev mode', async () => {
    const originalDev = import.meta.env.DEV;
    (import.meta.env as { DEV: boolean }).DEV = true;

    vi.resetModules();
    const { default: logger } = await import('./logger');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('warn-message', { code: 1 });

    expect(warnSpy).toHaveBeenCalledWith('warn-message', { code: 1 });

    warnSpy.mockRestore();
    (import.meta.env as { DEV: boolean }).DEV = originalDev;
  });

  it('always calls console.error', async () => {
    vi.resetModules();
    const { default: logger } = await import('./logger');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('error-message', { code: 2 });

    expect(errorSpy).toHaveBeenCalledWith('error-message', { code: 2 });

    errorSpy.mockRestore();
  });
});
