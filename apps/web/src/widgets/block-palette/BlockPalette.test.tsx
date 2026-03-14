import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlockPalette } from './BlockPalette';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { Plate } from '../../shared/types/index';

const makeSubnetPlate = (id: string, name: string, access: 'public' | 'private'): Plate => ({
  id,
  name,
  type: 'subnet',
  subnetAccess: access,
  parentId: 'net-1',
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 5, height: 0.2, depth: 8 },
  metadata: {},
});

const makeNetworkPlate = (id: string, name: string): Plate => ({
  id,
  name,
  type: 'network',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 12, height: 0.3, depth: 10 },
  metadata: {},
});

describe('BlockPalette', () => {
  const addBlockMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    addBlockMock.mockClear();
    useUIStore.setState({
      showBlockPalette: false,
      selectedId: null,
    });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1',
          name: 'Test',
          version: '1.0.0',
          plates: [],
          blocks: [],
          connections: [],
          externalActors: [],
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('returns null when showBlockPalette is false', () => {
    const { container } = render(<BlockPalette />);
    expect(container.innerHTML).toBe('');
  });

  it('renders palette title when visible', () => {
    useUIStore.setState({ showBlockPalette: true });
    render(<BlockPalette />);
    expect(screen.getByText(/Blocks/)).toBeInTheDocument();
  });

  it('shows no-subnet warning when no subnet plates exist', () => {
    useUIStore.setState({ showBlockPalette: true });
    render(<BlockPalette />);
    expect(screen.getByText(/No subnet plates/)).toBeInTheDocument();
  });

  it('renders all four block type buttons', () => {
    const plates = [makeSubnetPlate('sub-1', 'Public Subnet', 'public')];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1',
        name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    expect(screen.getByText('Gateway')).toBeInTheDocument();
    expect(screen.getByText('Compute')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  it('calls addBlock with correct category when clicking a block button', async () => {
    const user = userEvent.setup();
    const plates = [makeSubnetPlate('sub-1', 'Public Subnet', 'public')];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    await user.click(screen.getByText('Compute'));
    expect(addBlockMock).toHaveBeenCalledOnce();
    expect(addBlockMock.mock.calls[0][0]).toBe('compute');
    expect(addBlockMock.mock.calls[0][2]).toBe('sub-1');
  });

  it('alerts when no target plate is available', async () => {
    const user = userEvent.setup();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    useUIStore.setState({ showBlockPalette: true });
    render(<BlockPalette />);
    await user.click(screen.getByText('Compute'));
    expect(alertMock).toHaveBeenCalledWith(
      'Please create a Subnet Plate first before adding blocks.'
    );
    expect(addBlockMock).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('shows target plate selector when multiple subnet plates exist', () => {
    const plates = [
      makeSubnetPlate('sub-1', 'Public Subnet', 'public'),
      makeSubnetPlate('sub-2', 'Private Subnet', 'private'),
    ];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    expect(screen.getByText('Target Plate:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('changes target plate via selector', async () => {
    const user = userEvent.setup();
    const plates = [
      makeSubnetPlate('sub-1', 'Public Subnet', 'public'),
      makeSubnetPlate('sub-2', 'Private Subnet', 'private'),
    ];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    await user.selectOptions(screen.getByRole('combobox'), 'sub-2');
    await user.click(screen.getByText('Compute'));
    expect(addBlockMock.mock.calls[0][2]).toBe('sub-2');
  });

  it('uses selected plate as target when selectedId matches a subnet', () => {
    const plates = [
      makeSubnetPlate('sub-1', 'Public Subnet', 'public'),
      makeSubnetPlate('sub-2', 'Private Subnet', 'private'),
    ];
    useUIStore.setState({ showBlockPalette: true, selectedId: 'sub-2' });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    // The hint should show the selected subnet
    expect(screen.getByText(/Target: Private Subnet/)).toBeInTheDocument();
  });

  it('shows target plate hint when targetPlateId is set', () => {
    const plates = [makeSubnetPlate('sub-1', 'Public Subnet', 'public')];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    expect(screen.getByText(/Target: Public Subnet/)).toBeInTheDocument();
  });

  it('does not show selector when only one subnet plate exists', () => {
    const plates = [makeSubnetPlate('sub-1', 'Public Subnet', 'public')];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('filters out network plates from target list', () => {
    const plates = [
      makeNetworkPlate('net-1', 'VNet'),
      makeSubnetPlate('sub-1', 'Public Subnet', 'public'),
    ];
    useUIStore.setState({ showBlockPalette: true });
    useArchitectureStore.setState({
      addBlock: addBlockMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: {
          id: 'arch-1', name: 'Test', version: '1.0.0',
          plates,
          blocks: [], connections: [], externalActors: [],
          createdAt: '', updatedAt: '',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<BlockPalette />);
    // Only one subnet, so no selector shown
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/Target: Public Subnet/)).toBeInTheDocument();
  });
});
