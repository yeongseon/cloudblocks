/**
 * Regression tests for blockPresentation with non-root BASE_URL.
 *
 * EXTERNAL_PRESENTATIONS is evaluated at module load time, so we must
 * set import.meta.env.BASE_URL BEFORE importing the module. This requires
 * vi.resetModules() + dynamic import() for each test group.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUBPATH_BASE = '/cloudblocks/';

describe('blockPresentation with non-root BASE_URL', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', SUBPATH_BASE);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolveExternalPresentation prefixes internet icon with base URL', async () => {
    const { resolveExternalPresentation } = await import('./blockPresentation');
    const result = resolveExternalPresentation('internet');
    expect(result.iconUrl).toBe('/cloudblocks/actor-sprites/internet.svg');
  });

  it('resolveExternalPresentation prefixes browser icon with base URL', async () => {
    const { resolveExternalPresentation } = await import('./blockPresentation');
    const result = resolveExternalPresentation('browser');
    expect(result.iconUrl).toBe('/cloudblocks/actor-sprites/browser.svg');
  });

  it('unknown external type still returns null icon', async () => {
    const { resolveExternalPresentation } = await import('./blockPresentation');
    const result = resolveExternalPresentation('unknown-actor');
    expect(result.iconUrl).toBeNull();
  });

  it('resolveBlockPresentation with internet infers external and uses base URL', async () => {
    const { resolveBlockPresentation } = await import('./blockPresentation');
    const result = resolveBlockPresentation('internet');
    expect(result.kind).toBe('external');
    expect(result.iconUrl).toBe('/cloudblocks/actor-sprites/internet.svg');
  });

  it('no double slashes in external icon URLs', async () => {
    const { resolveExternalPresentation } = await import('./blockPresentation');
    const internet = resolveExternalPresentation('internet');
    const browser = resolveExternalPresentation('browser');
    expect(internet.iconUrl).not.toContain('//');
    expect(browser.iconUrl).not.toContain('//');
  });
});
