import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackPlausible, isPlausibleAvailable, getPlausibleConfig } from './plausibleAdapter';

describe('plausibleAdapter', () => {
  beforeEach(() => {
    delete window.plausible;
  });

  describe('isPlausibleAvailable', () => {
    it('returns false when window.plausible is undefined', () => {
      expect(isPlausibleAvailable()).toBe(false);
    });

    it('returns true when window.plausible is a function', () => {
      window.plausible = vi.fn();
      expect(isPlausibleAvailable()).toBe(true);
    });

    it('returns false when window.plausible is not a function', () => {
      (window as unknown as Record<string, unknown>).plausible = 'not-a-function';
      expect(isPlausibleAvailable()).toBe(false);
    });
  });

  describe('trackPlausible', () => {
    it('no-ops when window.plausible is not defined', () => {
      expect(() => trackPlausible('app_loaded')).not.toThrow();
    });

    it('calls window.plausible with event name only when no props', () => {
      const mock = vi.fn();
      window.plausible = mock;

      trackPlausible('app_loaded');
      expect(mock).toHaveBeenCalledWith('app_loaded');
    });

    it('calls window.plausible with event name only when props is undefined', () => {
      const mock = vi.fn();
      window.plausible = mock;

      trackPlausible('app_loaded', undefined);
      expect(mock).toHaveBeenCalledWith('app_loaded');
    });

    it('calls window.plausible with event name only when props is empty', () => {
      const mock = vi.fn();
      window.plausible = mock;

      trackPlausible('app_loaded', {});
      expect(mock).toHaveBeenCalledWith('app_loaded');
    });

    it('forwards props to window.plausible', () => {
      const mock = vi.fn();
      window.plausible = mock;

      trackPlausible('code_generated', { format: 'terraform' });
      expect(mock).toHaveBeenCalledWith('code_generated', {
        props: { format: 'terraform' },
      });
    });

    it('forwards multiple props', () => {
      const mock = vi.fn();
      window.plausible = mock;

      trackPlausible('code_generated', { format: 'bicep', blocks: 5, success: true });
      expect(mock).toHaveBeenCalledWith('code_generated', {
        props: { format: 'bicep', blocks: 5, success: true },
      });
    });

    it('swallows errors thrown by window.plausible', () => {
      window.plausible = () => {
        throw new Error('network error');
      };

      expect(() => trackPlausible('app_loaded')).not.toThrow();
    });
  });

  describe('getPlausibleConfig', () => {
    it('returns isConfigured false when env vars are not set', () => {
      const config = getPlausibleConfig();
      expect(config.isConfigured).toBe(false);
    });
  });
});
