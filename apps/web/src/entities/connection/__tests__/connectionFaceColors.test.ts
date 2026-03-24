import { describe, it, expect } from 'vitest';
import {
  CONNECTION_SEMANTIC_BASE_COLORS,
  getConnectionColors,
  DEFAULT_CONNECTION_SEMANTIC,
} from '../connectionFaceColors';
import type { ConnectionRenderSemantic } from '../connectionFaceColors';
import { PROVIDER_COLORS } from '../../block/blockFaceColors';

describe('connectionFaceColors', () => {
  describe('CONNECTION_SEMANTIC_BASE_COLORS', () => {
    it('has entries for http, event, and data', () => {
      expect(CONNECTION_SEMANTIC_BASE_COLORS.http).toBe('#6366F1');
      expect(CONNECTION_SEMANTIC_BASE_COLORS.event).toBe('#F43F5E');
      expect(CONNECTION_SEMANTIC_BASE_COLORS.data).toBe('#84CC16');
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
        expect(colors.topFaceColor).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.topFaceStroke).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.leftSideColor).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.rightSideColor).toMatch(/^#[0-9A-F]{6}$/i);
      });

      it(`"${semantic}" topFaceColor differs from base (lightened)`, () => {
        const colors = getConnectionColors(semantic);
        expect(colors.topFaceColor).not.toBe(colors.base);
      });

      it(`"${semantic}" leftSideColor differs from rightSideColor`, () => {
        const colors = getConnectionColors(semantic);
        expect(colors.leftSideColor).not.toBe(colors.rightSideColor);
      });
    }
  });

  describe('no conflict with provider colors', () => {
    it('semantic base colors do not overlap with any provider palette', () => {
      const semanticColors = new Set(Object.values(CONNECTION_SEMANTIC_BASE_COLORS));

      for (const [, palette] of Object.entries(PROVIDER_COLORS)) {
        for (const [, color] of Object.entries(palette)) {
          expect(semanticColors.has(color)).toBe(false);
        }
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
