import { describe, expect, it } from 'vitest';
import type { ConnectionType } from '@cloudblocks/schema';
import {
  CONNECTION_VISUAL_STYLES,
  CASING_WIDTH_OFFSET,
  HOVER_WIDTH_OFFSET,
  resolveConnectionVisualStyle,
} from '../connectionVisualTokens';

describe('connectionVisualTokens', () => {
  describe('CONNECTION_VISUAL_STYLES', () => {
    const allTypes: ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];

    it('defines a style for every ConnectionType', () => {
      for (const type of allTypes) {
        expect(CONNECTION_VISUAL_STYLES[type]).toBeDefined();
        expect(CONNECTION_VISUAL_STYLES[type].strokeWidth).toBeGreaterThan(0);
      }
    });

    it('dataflow is solid with strokeWidth 2', () => {
      expect(CONNECTION_VISUAL_STYLES.dataflow.strokeWidth).toBe(2);
      expect(CONNECTION_VISUAL_STYLES.dataflow.strokeDasharray).toBeUndefined();
    });

    it('http is solid with strokeWidth 3', () => {
      expect(CONNECTION_VISUAL_STYLES.http.strokeWidth).toBe(3);
      expect(CONNECTION_VISUAL_STYLES.http.strokeDasharray).toBeUndefined();
    });

    it('internal has short dash pattern', () => {
      expect(CONNECTION_VISUAL_STYLES.internal.strokeWidth).toBe(2);
      expect(CONNECTION_VISUAL_STYLES.internal.strokeDasharray).toBe('4 4');
    });

    it('data has long dash pattern', () => {
      expect(CONNECTION_VISUAL_STYLES.data.strokeWidth).toBe(2);
      expect(CONNECTION_VISUAL_STYLES.data.strokeDasharray).toBe('8 4');
    });

    it('async has dot-dash pattern', () => {
      expect(CONNECTION_VISUAL_STYLES.async.strokeWidth).toBe(2);
      expect(CONNECTION_VISUAL_STYLES.async.strokeDasharray).toBe('8 4 2 4');
    });
  });

  describe('constants', () => {
    it('CASING_WIDTH_OFFSET is 2', () => {
      expect(CASING_WIDTH_OFFSET).toBe(2);
    });

    it('HOVER_WIDTH_OFFSET is 1', () => {
      expect(HOVER_WIDTH_OFFSET).toBe(1);
    });
  });

  describe('resolveConnectionVisualStyle', () => {
    it('returns the correct style for each known type', () => {
      expect(resolveConnectionVisualStyle('http')).toBe(CONNECTION_VISUAL_STYLES.http);
      expect(resolveConnectionVisualStyle('dataflow')).toBe(CONNECTION_VISUAL_STYLES.dataflow);
      expect(resolveConnectionVisualStyle('internal')).toBe(CONNECTION_VISUAL_STYLES.internal);
      expect(resolveConnectionVisualStyle('data')).toBe(CONNECTION_VISUAL_STYLES.data);
      expect(resolveConnectionVisualStyle('async')).toBe(CONNECTION_VISUAL_STYLES.async);
    });

    it('falls back to dataflow when type is undefined', () => {
      expect(resolveConnectionVisualStyle(undefined)).toBe(CONNECTION_VISUAL_STYLES.dataflow);
    });

    it('falls back to dataflow for unrecognized type', () => {
      expect(resolveConnectionVisualStyle('unknown' as ConnectionType)).toBe(
        CONNECTION_VISUAL_STYLES.dataflow,
      );
    });
  });
});
