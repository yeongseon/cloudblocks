import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffPanel } from './DiffPanel';
import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { DiffDelta } from '../../shared/types/diff';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { endpointId } from '@cloudblocks/schema';

vi.mock('./DiffPanel.css', () => ({}));

function makeDiffDelta(): DiffDelta {
  return {
    plates: {
      added: [
        {
          id: 'plate-added-1',
          name: 'Subnet 1',
          kind: 'container',
          layer: 'subnet',
          resourceType: 'subnet',
          category: 'network',
          provider: 'azure',
          parentId: 'plate-net-1',
          position: { x: 0, y: 0, z: 0 },
          size: { width: 6, height: 0.3, depth: 8 },
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'plate-removed-1',
          name: 'Legacy Subnet',
          kind: 'container',
          layer: 'subnet',
          resourceType: 'subnet',
          category: 'network',
          provider: 'azure',
          parentId: 'plate-net-1',
          position: { x: 2, y: 0, z: 0 },
          size: { width: 6, height: 0.3, depth: 8 },
          metadata: {},
        },
      ],
      modified: [
        {
          id: 'plate-modified-1',
          before: {
            id: 'plate-modified-1',
            name: 'Service Subnet',
            kind: 'container',
            layer: 'subnet',
            resourceType: 'subnet',
            category: 'network',
            provider: 'azure',
            parentId: 'plate-net-1',
            position: { x: 1, y: 0, z: 0 },
            size: { width: 6, height: 0.3, depth: 8 },
            metadata: {},
          },
          after: {
            id: 'plate-modified-1',
            name: 'Service Subnet',
            kind: 'container',
            layer: 'subnet',
            resourceType: 'subnet',
            category: 'network',
            provider: 'azure',
            parentId: 'plate-net-1',
            position: { x: 1, y: 0, z: 0 },
            size: { width: 6, height: 0.3, depth: 8 },
            metadata: {},
          },
          changes: [
            { path: 'position', oldValue: '{"x":1,"y":0,"z":0}', newValue: '{"x":2,"y":0,"z":0}' },
          ],
        },
      ],
    },
    blocks: {
      added: [
        {
          id: 'block-added-1',
          name: 'API Gateway',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'load_balancer',
          category: 'delivery',
          provider: 'azure',
          parentId: 'plate-added-1',
          position: { x: 1, y: 0, z: 1 },
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'block-removed-1',
          name: 'Legacy VM',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'web_compute',
          category: 'compute',
          provider: 'azure',
          parentId: 'plate-removed-1',
          position: { x: 2, y: 0, z: 2 },
          metadata: {},
        },
      ],
      modified: [
        {
          id: 'block-modified-1',
          before: {
            id: 'block-modified-1',
            name: 'App Service',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'web_compute',
            category: 'compute',
            provider: 'azure',
            parentId: 'plate-added-1',
            position: { x: 2, y: 0, z: 3 },
            metadata: { sku: 'B1' },
          },
          after: {
            id: 'block-modified-1',
            name: 'App Service',
            kind: 'resource',
            layer: 'resource',
            resourceType: 'web_compute',
            category: 'compute',
            provider: 'azure',
            parentId: 'plate-added-1',
            position: { x: 2, y: 0, z: 3 },
            metadata: { sku: 'P1v3' },
          },
          changes: [{ path: 'metadata.sku', oldValue: 'B1', newValue: 'P1v3' }],
        },
      ],
    },
    connections: {
      added: [
        {
          id: 'conn-added-1',
          from: endpointId('block-added-1', 'output', 'data'),
          to: endpointId('block-modified-1', 'input', 'data'),
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'conn-removed-1',
          from: endpointId('block-removed-1', 'output', 'data'),
          to: endpointId('block-modified-1', 'input', 'data'),
          metadata: {},
        },
      ],
      modified: [
        {
          id: 'conn-modified-1',
          before: {
            id: 'conn-modified-1',
            from: endpointId('block-added-1', 'output', 'data'),
            to: endpointId('block-removed-1', 'input', 'data'),
            metadata: { latency: 'high' },
          },
          after: {
            id: 'conn-modified-1',
            from: endpointId('block-added-1', 'output', 'data'),
            to: endpointId('block-removed-1', 'input', 'data'),
            metadata: { latency: 'low' },
          },
          changes: [{ path: 'metadata.latency', oldValue: 'high', newValue: 'low' }],
        },
      ],
    },
    externalActors: {
      added: [
        {
          id: 'actor-added-1',
          name: 'Internet',
          type: 'internet',
          position: { x: -3, y: 0, z: 5 },
        },
      ],
      removed: [
        {
          id: 'actor-removed-1',
          name: 'Legacy Partner',
          type: 'internet',
          position: { x: -3, y: 0, z: 5 },
        },
      ],
      modified: [
        {
          id: 'actor-modified-1',
          before: {
            id: 'actor-modified-1',
            name: 'Payment Gateway',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
          after: {
            id: 'actor-modified-1',
            name: 'Payments API',
            type: 'internet',
            position: { x: -3, y: 0, z: 5 },
          },
          changes: [{ path: 'name', oldValue: 'Payment Gateway', newValue: 'Payments API' }],
        },
      ],
    },
    rootChanges: [],
    summary: {
      totalChanges: 12,
      hasBreakingChanges: true,
    },
  };
}

describe('DiffPanel', () => {
  beforeEach(() => {
    useUIStore.setState({
      diffMode: true,
      diffDelta: makeDiffDelta(),
    });
  });

  it('returns null when diffMode is false', () => {
    useUIStore.setState({ diffMode: false });
    const { container } = render(<DiffPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders panel when diffMode is true with valid diffDelta', () => {
    render(<DiffPanel />);
    expect(screen.getByText('🔍 Architecture Diff')).toBeInTheDocument();
  });

  it('shows "No changes" when totalChanges is 0', () => {
    const delta = makeDiffDelta();
    delta.summary.totalChanges = 0;
    delta.summary.hasBreakingChanges = false;
    delta.plates.added = [];
    delta.plates.removed = [];
    delta.plates.modified = [];
    delta.blocks.added = [];
    delta.blocks.removed = [];
    delta.blocks.modified = [];
    delta.connections.added = [];
    delta.connections.removed = [];
    delta.connections.modified = [];
    delta.externalActors.added = [];
    delta.externalActors.removed = [];
    delta.externalActors.modified = [];

    useUIStore.setState({ diffDelta: delta });

    render(<DiffPanel />);
    expect(screen.getByText('No changes')).toBeInTheDocument();
  });

  it('shows summary counts correctly', () => {
    render(<DiffPanel />);
    expect(screen.getByText('+4 added')).toBeInTheDocument();
    expect(screen.getByText('~4 modified')).toBeInTheDocument();
    expect(screen.getByText('-4 removed')).toBeInTheDocument();
  });

  it('shows breaking changes warning when hasBreakingChanges is true', () => {
    render(<DiffPanel />);
    expect(
      screen.getByText('Breaking changes detected. Review removed or modified entities carefully.'),
    ).toBeInTheDocument();
  });

  it('hides breaking changes warning when hasBreakingChanges is false', () => {
    const delta = makeDiffDelta();
    delta.summary.hasBreakingChanges = false;
    useUIStore.setState({ diffDelta: delta });

    render(<DiffPanel />);
    expect(
      screen.queryByText(
        'Breaking changes detected. Review removed or modified entities carefully.',
      ),
    ).not.toBeInTheDocument();
  });

  it('close button calls setDiffMode(false)', async () => {
    const user = userEvent.setup();
    render(<DiffPanel />);

    await user.click(screen.getByRole('button', { name: 'Close architecture diff panel' }));

    expect(useUIStore.getState().diffMode).toBe(false);
  });

  it('shows entity names for added blocks', () => {
    render(<DiffPanel />);
    expect(screen.getByText('+ API Gateway (block-added-1)')).toBeInTheDocument();
  });

  it('shows connection labels with endpoints', () => {
    render(<DiffPanel />);
    expect(
      screen.getByText('+ conn-added-1 (block-added-1 -> block-modified-1)'),
    ).toBeInTheDocument();
  });

  it('falls back to id-only label when entity has no name or endpoints', () => {
    const delta = makeDiffDelta();
    delta.plates.added = [
      { id: 'plate-id-only' } as unknown as DiffDelta['plates']['added'][number],
    ];
    delta.plates.removed = [];
    delta.plates.modified = [];
    delta.summary.totalChanges =
      delta.plates.added.length +
      delta.blocks.added.length +
      delta.blocks.removed.length +
      delta.blocks.modified.length +
      delta.connections.added.length +
      delta.connections.removed.length +
      delta.connections.modified.length +
      delta.externalActors.added.length +
      delta.externalActors.removed.length +
      delta.externalActors.modified.length;

    useUIStore.setState({ diffDelta: delta });
    render(<DiffPanel />);

    expect(screen.getByText('+ plate-id-only')).toBeInTheDocument();
  });

  it('collapses and expands a section from its header button', async () => {
    const user = userEvent.setup();
    render(<DiffPanel />);

    const platesSectionToggle = screen.getByRole('button', { name: /Containers/ });
    expect(platesSectionToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('+ Subnet 1 (plate-added-1)')).toBeInTheDocument();

    await user.click(platesSectionToggle);
    expect(platesSectionToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('+ Subnet 1 (plate-added-1)')).not.toBeInTheDocument();

    await user.click(platesSectionToggle);
    expect(platesSectionToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('+ Subnet 1 (plate-added-1)')).toBeInTheDocument();
  });

  it('expands and collapses modified details with varied value types', async () => {
    const user = userEvent.setup();
    const delta = makeDiffDelta();
    delta.plates.added = [];
    delta.plates.removed = [];
    delta.plates.modified = [];
    delta.connections.added = [];
    delta.connections.removed = [];
    delta.connections.modified = [];
    delta.externalActors.added = [];
    delta.externalActors.removed = [];
    delta.externalActors.modified = [];
    delta.blocks.added = [];
    delta.blocks.removed = [];
    delta.blocks.modified = [
      {
        id: 'block-modified-types',
        before: {
          id: 'block-modified-types',
          name: 'Type Tester',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'web_compute',
          category: 'compute',
          provider: 'azure',
          parentId: 'plate-added-1',
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        },
        after: {
          id: 'block-modified-types',
          name: 'Type Tester',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'web_compute',
          category: 'compute',
          provider: 'azure',
          parentId: 'plate-added-1',
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        },
        changes: [
          { path: 'string', oldValue: 'old', newValue: 'new' },
          { path: 'undefined', oldValue: undefined, newValue: 'set' },
          { path: 'null', oldValue: null, newValue: 'set' },
          { path: 'number', oldValue: 1, newValue: 2 },
          { path: 'boolean', oldValue: true, newValue: false },
          { path: 'object', oldValue: { sku: 'B1' }, newValue: { sku: 'P1v3' } },
          { path: 'array', oldValue: ['a'], newValue: ['b'] },
          { path: 'jsonUndefined', oldValue: Symbol('x'), newValue: 'ok' },
        ],
      },
    ];
    delta.summary.totalChanges = 1;
    delta.summary.hasBreakingChanges = false;
    useUIStore.setState({ diffDelta: delta });

    render(<DiffPanel />);

    const toggle = screen.getByRole('button', {
      name: /Type Tester \(block-modified-types\) \(8 changes\)/,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText(': old -> new')).toBeInTheDocument();
    expect(screen.getByText('undefined')).toBeInTheDocument();
    expect(screen.getByText(': undefined -> set')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(screen.getByText(': null -> set')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
    expect(screen.getByText(': 1 -> 2')).toBeInTheDocument();
    expect(screen.getByText('boolean')).toBeInTheDocument();
    expect(screen.getByText(': true -> false')).toBeInTheDocument();
    expect(screen.getByText('object')).toBeInTheDocument();
    expect(screen.getByText(': {"sku":"B1"} -> {"sku":"P1v3"}')).toBeInTheDocument();
    expect(screen.getByText('array')).toBeInTheDocument();
    expect(screen.getByText(': ["a"] -> ["b"]')).toBeInTheDocument();
    expect(screen.getByText('jsonUndefined')).toBeInTheDocument();
    expect(screen.getByText(': Symbol(x) -> ok')).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('jsonUndefined')).not.toBeInTheDocument();
  });

  it('resets local collapsed and expanded state when diffDelta changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DiffPanel />);

    const platesSectionToggle = screen.getByRole('button', { name: /Containers/ });
    await user.click(platesSectionToggle);
    expect(platesSectionToggle).toHaveAttribute('aria-expanded', 'false');

    const modifiedToggle = screen.getByRole('button', {
      name: /App Service \(block-modified-1\) \(1 changes\)/,
    });
    await user.click(modifiedToggle);
    expect(modifiedToggle).toHaveAttribute('aria-expanded', 'true');

    useUIStore.getState().setDiffMode(true, makeDiffDelta());
    rerender(<DiffPanel />);

    const resetPlatesToggle = screen.getByRole('button', { name: /Containers/ });
    const resetModifiedToggle = screen.getByRole('button', {
      name: /App Service \(block-modified-1\) \(1 changes\)/,
    });
    expect(resetPlatesToggle).toHaveAttribute('aria-expanded', 'true');
    expect(resetModifiedToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows section-level empty message when a section has zero changes', () => {
    const delta = makeDiffDelta();
    delta.plates.added = [];
    delta.plates.removed = [];
    delta.plates.modified = [];
    delta.summary.totalChanges =
      delta.blocks.added.length +
      delta.blocks.removed.length +
      delta.blocks.modified.length +
      delta.connections.added.length +
      delta.connections.removed.length +
      delta.connections.modified.length +
      delta.externalActors.added.length +
      delta.externalActors.removed.length +
      delta.externalActors.modified.length;
    useUIStore.setState({ diffDelta: delta });

    render(<DiffPanel />);
    expect(screen.getByText('No changes in containers.')).toBeInTheDocument();
  });

  it('shows no-data message when diffDelta is null and omits summary badges', () => {
    useUIStore.setState({ diffMode: true, diffDelta: null });
    render(<DiffPanel />);

    expect(screen.getByText('No diff data available.')).toBeInTheDocument();
    expect(screen.queryByText('+0 added')).not.toBeInTheDocument();
    expect(screen.queryByText('~0 modified')).not.toBeInTheDocument();
    expect(screen.queryByText('-0 removed')).not.toBeInTheDocument();
  });

  it('shows workspace name context line (#877)', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        name: 'Production Environment',
      },
    });
    render(<DiffPanel />);
    expect(screen.getByText('Comparing: Production Environment')).toBeInTheDocument();
  });

  it('shows remote architecture summary when diffBaseArchitecture is provided (#879)', () => {
    const remoteArch: ArchitectureModel = {
      id: 'remote-arch',
      name: 'Remote',
      version: '1.0.0',
      nodes: [
        {
          id: 'p1',
          name: 'P1',
          kind: 'container',
          layer: 'region',
          resourceType: 'virtual_network',
          category: 'network',
          provider: 'azure',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          size: { width: 8, height: 1, depth: 8 },
          metadata: {},
        },
        {
          id: 'p2',
          name: 'P2',
          kind: 'container',
          layer: 'subnet',
          resourceType: 'subnet',
          category: 'network',
          provider: 'azure',
          parentId: 'p1',
          position: { x: 1, y: 0, z: 1 },
          size: { width: 6, height: 0.3, depth: 6 },
          metadata: {},
        },
        {
          id: 'b1',
          name: 'B1',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'web_compute',
          category: 'compute',
          provider: 'azure',
          parentId: 'p2',
          position: { x: 2, y: 0, z: 2 },
          metadata: {},
        },
      ],
      connections: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] as ArchitectureModel['connections'],
      endpoints: [],
      externalActors: [{ id: 'a1' }] as ArchitectureModel['externalActors'],
      createdAt: '',
      updatedAt: '',
    };
    useUIStore.setState({ diffBaseArchitecture: remoteArch });
    render(<DiffPanel />);
    expect(
      screen.getByText('Remote: 2 containers · 1 nodes · 3 connections · 1 actors'),
    ).toBeInTheDocument();
  });

  it('hides remote summary when diffBaseArchitecture is null (#879)', () => {
    useUIStore.setState({ diffBaseArchitecture: null });
    render(<DiffPanel />);
    expect(screen.queryByText(/^Remote:/)).not.toBeInTheDocument();
  });
});
