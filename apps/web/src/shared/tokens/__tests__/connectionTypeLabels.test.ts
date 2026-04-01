import { describe, it, expect } from 'vitest';
import {
  CONNECTION_TYPE_LABELS,
  ENDPOINT_SEMANTIC_LABELS,
  resolveSemanticLabel,
} from '../connectionTypeLabels';

describe('connectionTypeLabels', () => {
  describe('CONNECTION_TYPE_LABELS', () => {
    it('should map all 5 ConnectionType values to display labels', () => {
      expect(Object.keys(CONNECTION_TYPE_LABELS).length).toBe(5);
      expect(CONNECTION_TYPE_LABELS.dataflow).toBe('Data Flow');
      expect(CONNECTION_TYPE_LABELS.http).toBe('HTTP');
      expect(CONNECTION_TYPE_LABELS.internal).toBe('Internal');
      expect(CONNECTION_TYPE_LABELS.data).toBe('Data');
      expect(CONNECTION_TYPE_LABELS.async).toBe('Async');
    });

    it('should have non-empty string values for all keys', () => {
      Object.values(CONNECTION_TYPE_LABELS).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ENDPOINT_SEMANTIC_LABELS', () => {
    it('should map all 3 EndpointSemantic values to display labels', () => {
      expect(Object.keys(ENDPOINT_SEMANTIC_LABELS).length).toBe(3);
      expect(ENDPOINT_SEMANTIC_LABELS.http).toBe('HTTP');
      expect(ENDPOINT_SEMANTIC_LABELS.event).toBe('Event');
      expect(ENDPOINT_SEMANTIC_LABELS.data).toBe('Data');
    });

    it('should have non-empty string values for all keys', () => {
      Object.values(ENDPOINT_SEMANTIC_LABELS).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('resolveSemanticLabel', () => {
    it('should resolve valid EndpointSemantic values to display labels', () => {
      expect(resolveSemanticLabel('http')).toBe('HTTP');
      expect(resolveSemanticLabel('event')).toBe('Event');
      expect(resolveSemanticLabel('data')).toBe('Data');
    });

    it('should return "Unknown" for undefined', () => {
      expect(resolveSemanticLabel(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for empty string', () => {
      expect(resolveSemanticLabel('')).toBe('Unknown');
    });

    it('should fall back to raw value for unknown strings', () => {
      expect(resolveSemanticLabel('unknown-semantic')).toBe('unknown-semantic');
      expect(resolveSemanticLabel('custom-value')).toBe('custom-value');
    });

    it('should handle null as empty', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(resolveSemanticLabel(null as any)).toBe('Unknown');
    });
  });
});
