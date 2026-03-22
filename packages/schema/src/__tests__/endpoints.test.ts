import { describe, it, expect } from 'vitest';

import { connectionTypeToSemantic, endpointId, generateEndpointsForNode } from '../endpoints.js';

describe('endpoints utilities', () => {
  it('endpointId() produces deterministic endpoint format', () => {
    expect(endpointId('node-1', 'output', 'http')).toBe('endpoint-node-1-output-http');
  });

  it('generateEndpointsForNode() produces exactly 6 endpoints with expected ids', () => {
    const endpoints = generateEndpointsForNode('node-1');

    expect(endpoints).toHaveLength(6);
    expect(endpoints.map((ep) => ep.id)).toEqual([
      'endpoint-node-1-input-http',
      'endpoint-node-1-input-event',
      'endpoint-node-1-input-data',
      'endpoint-node-1-output-http',
      'endpoint-node-1-output-event',
      'endpoint-node-1-output-data',
    ]);
  });

  it('connectionTypeToSemantic() maps all legacy connection types', () => {
    expect(connectionTypeToSemantic('http')).toBe('http');
    expect(connectionTypeToSemantic('async')).toBe('event');
    expect(connectionTypeToSemantic('data')).toBe('data');
    expect(connectionTypeToSemantic('dataflow')).toBe('data');
    expect(connectionTypeToSemantic('internal')).toBe('data');
  });

  it('all generated endpoints have unique IDs', () => {
    const endpoints = generateEndpointsForNode('node-1');
    const ids = endpoints.map((ep) => ep.id);

    expect(new Set(ids).size).toBe(6);
  });

  it('generation is deterministic for the same node id', () => {
    const first = generateEndpointsForNode('node-1');
    const second = generateEndpointsForNode('node-1');

    expect(second).toEqual(first);
  });
});
