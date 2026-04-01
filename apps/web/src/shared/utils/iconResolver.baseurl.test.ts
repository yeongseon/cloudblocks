/**
 * Regression tests for non-root BASE_URL (GitHub Pages subpath deployment).
 *
 * When Vite builds with --base /cloudblocks/, import.meta.env.BASE_URL is
 * inlined as "/cloudblocks/".  All public-asset icon URLs must be prefixed
 * with that base so the browser fetches the correct path.
 *
 * Because the helpers read import.meta.env.BASE_URL at call time, we can
 * stub it via vi.stubEnv before each call without resetting modules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderType } from '@cloudblocks/schema';
import { getBlockIconUrl, getContainerBlockIconUrl, getResourceIconUrl } from './iconResolver';

const SUBPATH_BASE = '/cloudblocks/';

describe('iconResolver with non-root BASE_URL', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', SUBPATH_BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getBlockIconUrl', () => {
    it('prefixes Azure subtype icon with base URL', () => {
      const url = getBlockIconUrl('azure', 'compute', 'vm');
      expect(url).toBe('/cloudblocks/azure-icons/virtual-machine.svg');
    });

    it('prefixes AWS subtype icon with base URL', () => {
      const url = getBlockIconUrl('aws', 'compute', 'ec2');
      expect(url).toBe('/cloudblocks/aws-icons/ec2.svg');
    });

    it('prefixes GCP subtype icon with base URL', () => {
      const url = getBlockIconUrl('gcp', 'compute', 'compute-engine');
      expect(url).toBe('/cloudblocks/gcp-icons/compute-engine.svg');
    });

    it('prefixes external block icon (internet) with base URL', () => {
      const url = getBlockIconUrl('azure', undefined as never, undefined, 'internet');
      expect(url).toBe('/cloudblocks/actor-sprites/internet.svg');
    });

    it('still returns null for unknown subtype', () => {
      const url = getBlockIconUrl('azure', 'compute', 'nonexistent-thing');
      expect(url).toBeNull();
    });
  });

  describe('getResourceIconUrl', () => {
    it('prefixes Azure resource icon with base URL', () => {
      const url = getResourceIconUrl('vm', 'azure');
      expect(url).toBe('/cloudblocks/azure-icons/virtual-machine.svg');
    });

    it('prefixes AWS resource icon with base URL', () => {
      const url = getResourceIconUrl('vm', 'aws');
      expect(url).toBe('/cloudblocks/aws-icons/ec2.svg');
    });

    it('prefixes GCP resource icon with base URL', () => {
      const url = getResourceIconUrl('vm', 'gcp');
      expect(url).toBe('/cloudblocks/gcp-icons/compute-engine.svg');
    });

    it('still returns null for unknown resource', () => {
      const url = getResourceIconUrl('definitely-unknown', 'azure');
      expect(url).toBeNull();
    });
  });

  describe('getContainerBlockIconUrl', () => {
    it('prefixes region container icon with base URL', () => {
      const url = getContainerBlockIconUrl('region');
      expect(url).toMatch(/^\/cloudblocks\//);
      expect(url).toContain('azure-icons/');
    });

    it('prefixes subnet container icon with base URL', () => {
      const url = getContainerBlockIconUrl('subnet');
      expect(url).toMatch(/^\/cloudblocks\//);
    });

    const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
    for (const provider of providers) {
      it(`prefixes ${provider} container icon with base URL`, () => {
        const url = getContainerBlockIconUrl('region', provider);
        expect(url).toMatch(/^\/cloudblocks\//);
      });
    }
  });

  describe('no double slashes', () => {
    it('getBlockIconUrl does not produce double slashes', () => {
      const url = getBlockIconUrl('azure', 'compute', 'vm');
      expect(url).not.toContain('//');
    });

    it('getResourceIconUrl does not produce double slashes', () => {
      const url = getResourceIconUrl('vm', 'azure');
      expect(url).not.toContain('//');
    });

    it('getContainerBlockIconUrl does not produce double slashes', () => {
      const url = getContainerBlockIconUrl('region');
      expect(url).not.toContain('//');
    });
  });
});
