import { describe, expect, it } from 'vitest';
import { spikeFixture } from './fixture';
import { endpointBlocks, location } from './geometry';
import { displayRoutes } from './routes';
import { displayRoute } from './routes';
import { activeFixture } from './activeFixture';

describe('3D display routes', () => {
  it('keeps every typed connection continuous and axis-aligned', () => {
    expect(displayRoutes).toHaveLength(spikeFixture.connections.length);
    for (const route of displayRoutes) {
      expect(route.points.length).toBeGreaterThan(1);
      const connection = spikeFixture.connections.find((item) => item.id === route.id);
      expect(connection).toBeDefined();
      if (!connection) continue;
      const [source, target] = endpointBlocks(connection);
      expect(route.points[0][0]).toBe(location(source).x);
      expect(route.points.at(-1)?.[2]).toBe(location(target).z);
      for (let index = 1; index < route.points.length; index++) {
        const previous = route.points[index - 1];
        const current = route.points[index];
        expect([0, 1, 2].filter((axis) => current[axis] !== previous[axis])).toHaveLength(1);
      }
    }
  });

  it('routes a root PaaS target to the subnet gateway across surface levels', () => {
    const route = displayRoutes.find((item) => item.id === 'gateway-app');
    expect(route?.semantic).toBe('http');
    expect(new Set(route?.points.map((point) => point[1].toFixed(2)))).toEqual(
      new Set(['3.13', '0.58', '-1.32']),
    );
  });

  it('keeps the logical App Service to SQL dependency on the ground without inventing private networking', () => {
    const route = displayRoutes.find((item) => item.id === 'app-sql');
    expect(route?.semantic).toBe('data');
    expect(new Set(route?.points.map((point) => point[1].toFixed(2)))).toEqual(new Set(['-1.32']));
    expect(route?.points[0][1]).toBeCloseTo(-1.32);
    expect(route?.points.at(-1)?.[1]).toBeCloseTo(-1.32);
  });

  it('enters from ground without drawing through the network volume', () => {
    const route = displayRoutes.find((item) => item.id === 'front-gateway');
    expect(route?.points[0][1]).toBe(-1.32);
    expect(route?.points.some((point) => point[1] === 0.58)).toBe(true);
    expect(route?.points.at(-1)?.[1]).toBeCloseTo(3.13);
    expect(
      route?.points.filter((point) => point[1] === -1.32).every((point) => point[0] <= -17),
    ).toBe(true);
  });

  it('keeps Internet to Front Door on ground without attempting a subnet transition', () => {
    const route = displayRoutes.find((item) => item.id === 'internet-front');
    expect(route?.semantic).toBe('http');
    expect(route?.points.length).toBeGreaterThan(1);
    expect(route?.points.every((point) => point[1] === route.points[0][1])).toBe(true);
  });

  it('reroutes a gateway after it transfers between subnets', () => {
    const connection = activeFixture.connections.find((item) => item.id === 'gateway-app');
    if (!connection) throw new Error('Missing gateway connection');
    const before = displayRoute(connection);
    const after = displayRoute(
      connection,
      new Map([['gateway', { x: 4, z: 4, parentId: 'subnet-b' }]]),
    );
    expect(after.points).not.toEqual(before.points);
    expect(after.points[0][1]).toBeCloseTo(3.13);
    expect(after.points.at(-1)?.[1]).toBeCloseTo(-1.32);
  });
});
