import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';
import { activeFixture } from './activeFixture';
import { colors, containers, endpointBlocks, location, resources } from './geometry';
import type { Moment, MovePositions } from './geometry';

function point(x: number, z: number, y: number): [number, number] {
  return [550 + (x - z) * 13, 345 + (x + z) * 6.5 - y * 20];
}

function corners(node: ContainerBlock, y: number): [number, number][] {
  const { x, z } = location(node);
  return [
    point(x - node.frame.width / 2, z - node.frame.depth / 2, y),
    point(x + node.frame.width / 2, z - node.frame.depth / 2, y),
    point(x + node.frame.width / 2, z + node.frame.depth / 2, y),
    point(x - node.frame.width / 2, z + node.frame.depth / 2, y),
  ];
}

function coords(vertices: [number, number][]): string {
  return vertices.map(([x, y]) => `${x},${y}`).join(' ');
}

function port(x: number, y: number, color: string, active: boolean): string {
  return `<g transform="translate(${x} ${y})" ${active ? 'filter="url(#glow)"' : ''}>
    <ellipse cy="5" rx="12" ry="6" fill="#113e65" opacity=".6"/>
    <path d="M-12 0 V5 A12 6 0 0 0 12 5 V0" fill="${color}"/>
    <ellipse rx="12" ry="6" fill="${color}" stroke="#ecffff" stroke-width="1.5"/>
    <ellipse cy="-1" rx="6" ry="2.5" fill="#e6ffff" opacity=".6"/>
  </g>`;
}

function surface(node: ContainerBlock, moment: Moment): string {
  const depth = location(node).depth;
  const y = depth * 2.3;
  const top = corners(node, y);
  const bottom = corners(node, y - 1.8);
  const color = depth === 0 ? '#2664d1' : '#3795df';
  const rim = moment === 'reject' && node.id === 'subnet-b' ? '#ee5368' : '#e0f7ff';
  return `<g data-node="${node.id}">
    <polygon points="${coords(corners(node, y - 2.1))}" fill="#144279" opacity=".15" filter="url(#shadow)"/>
    <polygon points="${coords([top[3], top[2], bottom[2], bottom[3]])}" fill="${color}"/>
    <polygon points="${coords([top[1], top[2], bottom[2], bottom[1]])}" fill="${color}" opacity=".68"/>
    <polygon points="${coords(top)}" fill="url(#surface-${depth})" stroke="${rim}" stroke-width="2"/>
    <text x="${(bottom[2][0] + bottom[3][0]) / 2}" y="${(bottom[2][1] + bottom[3][1]) / 2 + 10}" fill="white" font-size="${depth === 0 ? 16 : 13}" text-anchor="middle" font-weight="bold">${node.name.toUpperCase()}</text>
  </g>`;
}

function body(node: ResourceBlock, moment: Moment, moved: MovePositions): string {
  const { x, z, depth } = location(node, moved);
  const [cx, cy] = point(x, z, depth * 2.3 + 0.8);
  const offset =
    node.id === 'app'
      ? moment === 'reject'
        ? -21
        : moment === 'select'
          ? -11
          : moment === 'place'
            ? -5
            : 0
      : 0;
  const color = node.resourceType === 'internet' ? '#687b94' : colors[node.category];
  const quiet = moment === 'select' && node.id !== 'app' ? 'opacity=".68"' : '';
  return `<g data-node="${node.id}" transform="translate(${cx} ${cy + offset})" ${quiet}>
    <ellipse cy="21" rx="30" ry="11" fill="#143b77" opacity=".22" filter="url(#shadow)"/>
    ${port(0, 13, color, moment === 'connect')}
    <path d="M0 -29 L28 -15 L0 -1 L-28 -15 Z" fill="${color}" stroke="#defbff" stroke-width="2"/>
    <path d="M-28 -15 L0 -1 V25 L-28 10 Z" fill="${color}"/>
    <path d="M28 -15 L0 -1 V25 L28 10 Z" fill="${color}" opacity=".65"/>
    ${port(0, -28, color, moment === 'connect' || moment === 'place')}
    <text y="7" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${node.name}</text>
  </g>`;
}

function links(moment: Moment, moved: MovePositions): string {
  return activeFixture.connections
    .map((connection) => {
      const [source, target] = endpointBlocks(connection);
      const a = location(source, moved);
      const b = location(target, moved);
      const [ax, ay] = point(a.x, a.z, a.depth * 2.3 + 0.9);
      const [bx, by] = point(b.x, b.z, b.depth * 2.3 + 0.9);
      const mid = (ax + bx) / 2;
      const color =
        connection.id.includes('sql') || connection.id.includes('vault') ? '#39d6b2' : '#4ec6fb';
      const path = `M${ax} ${ay} L${mid} ${ay} L${mid} ${by} L${bx} ${by}`;
      return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${moment === 'connect' ? 4 : 2}" opacity=".9" stroke-linejoin="round"/>`;
    })
    .join('');
}

export function renderSvg(moment: Moment, zoom = 1, moved: MovePositions = new Map()): string {
  const width = 1100 / zoom;
  const height = 650 / zoom;
  const ground = [point(-39, -19, -2), point(27, -19, -2), point(27, 20, -2), point(-39, 20, -2)];
  return `<svg viewBox="${550 - width / 2} ${325 - height / 2} ${width} ${height}" role="img" aria-label="SVG with derived height showing a virtual network and two subnets">
    <defs>
      <linearGradient id="surface-0" x2="0" y2="1"><stop stop-color="#8accff"/><stop offset="1" stop-color="#3584e3"/></linearGradient>
      <linearGradient id="surface-1" x2="0" y2="1"><stop stop-color="#adeaf8"/><stop offset="1" stop-color="#4ca9e1"/></linearGradient>
      <filter id="shadow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="glow" x="-100%" y="-150%" width="300%" height="400%"><feGaussianBlur stdDeviation="1"/></filter>
    </defs>
    <polygon points="${coords(ground)}" fill="#e6effa" stroke="#cbdfef"/>
    ${containers.map((node) => surface(node, moment)).join('')}
    ${links(moment, moved)}
    ${resources.map((node) => body(node, moment, moved)).join('')}
  </svg>`;
}
