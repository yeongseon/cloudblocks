import { describe, it, expect } from 'vitest';
import {
  CONNECTION_SEMANTIC_BASE_COLORS,
  getConnectionColors,
  DEFAULT_CONNECTION_SEMANTIC,
} from '../connectionFaceColors';
import type { ConnectionRenderSemantic } from '../connectionFaceColors';
import { PROVIDER_BRAND_COLOR } from '../../block/blockFaceColors';

describe('connectionFaceColors', () => {
  describe('CONNECTION_SEMANTIC_BASE_COLORS', () => {
    it('has entries for http, event, and data', () => {
      expect(CONNECTION_SEMANTIC_BASE_COLORS.http).toBe('#6F87B6');
      expect(CONNECTION_SEMANTIC_BASE_COLORS.event).toBe('#C97A63');
      expect(CONNECTION_SEMANTIC_BASE_COLORS.data).toBe('#5FA59B');
    });

    it('contains exactly 3 semantics', () => {
      expect(Object.keys(CONNECTION_SEMANTIC_BASE_COLORS)).toHaveLength(3);
    });
  });

  describe('getConnectionColors', () => {
    const semantics: ConnectionRenderSemantic[] = ['http', 'event', 'data'];

    for (const semantic of semantics) {
      it(`returns valid color set for "${semantic}"`, () => {
        const colors = getConnectionColors(semantic);

        expect(colors.base).toBe(CONNECTION_SEMANTIC_BASE_COLORS[semantic]);
        expect(colors.stroke).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.casing).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it(`"${semantic}" stroke equals base color`, () => {
        const colors = getConnectionColors(semantic);
        expect(colors.stroke).toBe(colors.base);
      });

      it(`"${semantic}" casing is darker than base`, () => {
        const colors = getConnectionColors(semantic);
        // Casing should be a different (darker) color
        expect(colors.casing).not.toBe(colors.base);
      });
    }
  });

  describe('no conflict with provider colors', () => {
    it('semantic base colors do not overlap with any provider brand color', () => {
      const semanticColors = new Set(Object.values(CONNECTION_SEMANTIC_BASE_COLORS));

      for (const [, brandColor] of Object.entries(PROVIDER_BRAND_COLOR)) {
        expect(semanticColors.has(brandColor)).toBe(false);
      }
    });
  });

  describe('DEFAULT_CONNECTION_SEMANTIC', () => {
    it('defaults to "http"', () => {
      expect(DEFAULT_CONNECTION_SEMANTIC).toBe('http');
    });

    it('is a valid key in CONNECTION_SEMANTIC_BASE_COLORS', () => {
      expect(CONNECTION_SEMANTIC_BASE_COLORS[DEFAULT_CONNECTION_SEMANTIC]).toBeDefined();
    });
  });
});
