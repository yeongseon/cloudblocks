import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import type { ArchitectureModel } from '@cloudblocks/schema';

vi.mock('./BottomPanel.css', () => ({}));

vi.mock('./Minimap', () => ({
  Minimap: ({ className = '' }: { className?: string }) => <div data-testid="minimap" className={className}>Minimap</div>,
}));

vi.mock('./DetailPanel', () => ({
  DetailPanel: ({ className = '' }: { className?: string }) => <div data-testid="detail-panel" className={className}>DetailPanel</div>,
}));

vi.mock('./CommandCard', () => ({
  CommandCard: ({ className = '' }: { className?: string }) => <div data-testid="command-card" className={className}>CommandCard</div>,
}));

import { BottomPanel } from './BottomPanel';

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  plates: [{
    id: 'net-1',
    name: 'VNet',
    type: 'region',
    parentId: null,
    children: [],
    position: { x: 0, y: 0, z: 0 },
    size: { width: 16, height: 0.3, depth: 20 },
    metadata: {},
  }],
  blocks: [{
    id: 'block-1',
    name: 'App VM',
    category: 'compute',
    placementId: 'net-1',
    position: { x: 0, y: 0, z: 0 },
    metadata: {},
  }],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('BottomPanel', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedId: null });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders minimap and detail panel', () => {
    render(<BottomPanel />);

    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });

  it('applies className to root wrapper', () => {
    const { container } = render(<BottomPanel className="custom-bottom" />);

    const panel = container.querySelector('.bottom-panel');
    expect(panel).toHaveClass('bottom-panel');
    expect(panel).toHaveClass('custom-bottom');
  });

  it('shows default context description when nothing selected', () => {
    render(<BottomPanel />);

    expect(screen.getByText('Select the minifigure to start building')).toBeInTheDocument();
  });

  it('shows worker context description when worker selected', () => {
    useUIStore.setState({ selectedId: 'worker-default' });

    render(<BottomPanel />);

    expect(screen.getByText('Select a resource to build')).toBeInTheDocument();
  });

  it('shows block description when block selected', () => {
    useUIStore.setState({ selectedId: 'block-1' });

    render(<BottomPanel />);

    expect(screen.getByText('Runs your application code')).toBeInTheDocument();
  });

  it('shows plate type label when plate selected', () => {
    useUIStore.setState({ selectedId: 'net-1' });

    render(<BottomPanel />);

    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('shows Public Subnet label for public subnet plate', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          ...baseArchitecture,
          plates: [
            ...baseArchitecture.plates,
            {
              id: 'subnet-pub',
              name: 'Public Subnet',
              type: 'subnet',
              subnetAccess: 'public',
              parentId: 'net-1',
              children: [],
              position: { x: 0, y: 0, z: 0 },
              size: { width: 6, height: 0.3, depth: 8 },
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'subnet-pub' });

    render(<BottomPanel />);

    expect(screen.getByText('Public Subnet')).toBeInTheDocument();
  });

  it('shows Private Subnet label for private subnet plate', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          ...baseArchitecture,
          plates: [
            ...baseArchitecture.plates,
            {
              id: 'subnet-priv',
              name: 'Private Subnet',
              type: 'subnet',
              subnetAccess: 'private',
              parentId: 'net-1',
              children: [],
              position: { x: 0, y: 0, z: 0 },
              size: { width: 6, height: 0.3, depth: 8 },
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    useUIStore.setState({ selectedId: 'subnet-priv' });

    render(<BottomPanel />);

    expect(screen.getByText('Private Subnet')).toBeInTheDocument();
  });
});
