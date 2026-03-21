import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('isApiConfigured', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns false when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { isApiConfigured } = await import('../client');

    expect(isApiConfigured()).toBe(false);
  });

  it('returns true when VITE_API_URL is set', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    const { isApiConfigured } = await import('../client');

    expect(isApiConfigured()).toBe(true);
  });
});
