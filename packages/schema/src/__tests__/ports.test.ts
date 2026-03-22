import { describe, it, expect } from 'vitest';
import type { Connection, PortPolicy } from '../index.js';
import { CATEGORY_PORTS, getPortsForResourceType } from '../index.js';

describe('stub port policy', () => {
  it('exposes category defaults', () => {
    expect(CATEGORY_PORTS.network).toEqual({ inbound: 1, outbound: 1 });
    expect(CATEGORY_PORTS.compute).toEqual({ inbound: 2, outbound: 2 });
    expect(CATEGORY_PORTS.data).toEqual({ inbound: 2, outbound: 1 });
  });

  it('resolves port policy by resource type and falls back for unknown resource', () => {
    expect(getPortsForResourceType('web_compute')).toEqual({ inbound: 2, outbound: 2 });
    expect(getPortsForResourceType('relational_database')).toEqual({ inbound: 2, outbound: 1 });
    expect(getPortsForResourceType('unknown_resource_type')).toEqual({ inbound: 1, outbound: 1 });
  });

  it('supports Connection stub fields in type usage', () => {
    const connection: Connection = {
      id: 'conn-1',
      sourceId: 'source-1',
      targetId: 'target-1',
      type: 'dataflow',
      metadata: {},
      sourceStub: 1,
      targetStub: 0,
    };

    expect(connection.sourceStub).toBe(1);
    expect(connection.targetStub).toBe(0);
  });

  it('exports PortPolicy type', () => {
    const policy: PortPolicy = { inbound: 1, outbound: 1 };
    expect(policy.inbound).toBe(1);
    expect(policy.outbound).toBe(1);
  });
});
