import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffPanel } from './DiffPanel';
import { useUIStore } from '../../entities/store/uiStore';
import type { DiffDelta } from '../../shared/types/diff';

vi.mock('./DiffPanel.css', () => ({}));

function makeDiffDelta(): DiffDelta {
  return {
    plates: {
      added: [
        {
          id: 'plate-added-1',
          name: 'Public Subnet',
          type: 'subnet',
          subnetAccess: 'public',
          parentId: 'plate-net-1',
          children: [],
          position: { x: 0, y: 0, z: 0 },
          size: { width: 6, height: 0.3, depth: 8 },
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'plate-removed-1',
          name: 'Legacy Subnet',
          type: 'subnet',
          subnetAccess: 'private',
          parentId: 'plate-net-1',
          children: [],
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
            type: 'subnet',
            subnetAccess: 'public',
            parentId: 'plate-net-1',
            children: [],
            position: { x: 1, y: 0, z: 0 },
            size: { width: 6, height: 0.3, depth: 8 },
            metadata: {},
          },
          after: {
            id: 'plate-modified-1',
            name: 'Service Subnet',
            type: 'subnet',
            subnetAccess: 'private',
            parentId: 'plate-net-1',
            children: [],
            position: { x: 1, y: 0, z: 0 },
            size: { width: 6, height: 0.3, depth: 8 },
            metadata: {},
          },
          changes: [{ path: 'subnetAccess', oldValue: 'public', newValue: 'private' }],
        },
      ],
    },
    blocks: {
      added: [
        {
          id: 'block-added-1',
          name: 'API Gateway',
          category: 'gateway',
          placementId: 'plate-added-1',
          position: { x: 1, y: 0, z: 1 },
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'block-removed-1',
          name: 'Legacy VM',
          category: 'compute',
          placementId: 'plate-removed-1',
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
            category: 'compute',
            placementId: 'plate-added-1',
            position: { x: 2, y: 0, z: 3 },
            metadata: { sku: 'B1' },
          },
          after: {
            id: 'block-modified-1',
            name: 'App Service',
            category: 'compute',
            placementId: 'plate-added-1',
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
          sourceId: 'block-added-1',
          targetId: 'block-modified-1',
          type: 'dataflow',
          metadata: {},
        },
      ],
      removed: [
        {
          id: 'conn-removed-1',
          sourceId: 'block-removed-1',
          targetId: 'block-modified-1',
          type: 'dataflow',
          metadata: {},
        },
      ],
      modified: [
        {
          id: 'conn-modified-1',
          before: {
            id: 'conn-modified-1',
            sourceId: 'block-added-1',
            targetId: 'block-removed-1',
            type: 'dataflow',
            metadata: { latency: 'high' },
          },
          after: {
            id: 'conn-modified-1',
            sourceId: 'block-added-1',
            targetId: 'block-removed-1',
            type: 'dataflow',
            metadata: { latency: 'low' },
          },
          changes: [{ path: 'metadata.latency', oldValue: 'high', newValue: 'low' }],
        },
      ],
    },
    externalActors: {
      added: [{ id: 'actor-added-1', name: 'Internet', type: 'internet' }],
      removed: [{ id: 'actor-removed-1', name: 'Legacy Partner', type: 'internet' }],
      modified: [
        {
          id: 'actor-modified-1',
          before: { id: 'actor-modified-1', name: 'Payment Gateway', type: 'internet' },
          after: { id: 'actor-modified-1', name: 'Payments API', type: 'internet' },
          changes: [{ path: 'name', oldValue: 'Payment Gateway', newValue: 'Payments API' }],
        },
      ],
    },
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
    expect(screen.getByText('Breaking changes detected. Review removed or modified entities carefully.')).toBeInTheDocument();
  });

  it('hides breaking changes warning when hasBreakingChanges is false', () => {
    const delta = makeDiffDelta();
    delta.summary.hasBreakingChanges = false;
    useUIStore.setState({ diffDelta: delta });

    render(<DiffPanel />);
    expect(screen.queryByText('Breaking changes detected. Review removed or modified entities carefully.')).not.toBeInTheDocument();
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
});
