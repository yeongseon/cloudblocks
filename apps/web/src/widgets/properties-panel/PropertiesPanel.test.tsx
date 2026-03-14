import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesPanel } from './PropertiesPanel';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { Plate, Block, Connection } from '../../shared/types/index';

const makePlate = (overrides?: Partial<Plate>): Plate => ({
  id: 'plate-1',
  name: 'Test Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: ['block-1', 'block-2'],
  position: { x: 1, y: 2, z: 3 },
  size: { width: 5, height: 0.2, depth: 8 },
  metadata: {},
  ...overrides,
});

const makeBlock = (overrides?: Partial<Block>): Block => ({
  id: 'block-1',
  name: 'Test Compute',
  category: 'compute',
  placementId: 'plate-1',
  position: { x: 1.5, y: 0, z: 2.5 },
  metadata: {},
  ...overrides,
});

const makeConnection = (overrides?: Partial<Connection>): Connection => ({
  id: 'conn-1',
  sourceId: 'block-1',
  targetId: 'block-2',
  type: 'dataflow',
  metadata: {},
  ...overrides,
});

const defaultArch = {
  id: 'arch-1', name: 'Test', version: '1.0.0',
  plates: [] as Plate[],
  blocks: [] as Block[],
  connections: [] as Connection[],
  externalActors: [],
  createdAt: '', updatedAt: '',
};

describe('PropertiesPanel', () => {
  const removeBlockMock = vi.fn();
  const moveBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const removeConnectionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showProperties: false, selectedId: null });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch },
        createdAt: '', updatedAt: '',
      },
    });
  });

  it('returns null when showProperties is false', () => {
    const { container } = render(<PropertiesPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when selectedId is null', () => {
    useUIStore.setState({ showProperties: true });
    const { container } = render(<PropertiesPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when selectedId does not match any entity', () => {
    useUIStore.setState({ showProperties: true, selectedId: 'nonexistent' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch },
        createdAt: '', updatedAt: '',
      },
    });
    const { container } = render(<PropertiesPanel />);
    expect(container.innerHTML).toBe('');
  });

  // --- Plate selected ---

  it('renders plate properties when plate is selected', () => {
    const plate = makePlate();
    useUIStore.setState({ showProperties: true, selectedId: 'plate-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.getByText(/Properties/)).toBeInTheDocument();
    expect(screen.getByText('subnet plate')).toBeInTheDocument();
    expect(screen.getByText('Test Subnet')).toBeInTheDocument();
    expect(screen.getByText('plate-1')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('(1, 2, 3)')).toBeInTheDocument();
    expect(screen.getByText('5 × 8')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('does not show Access row when subnetAccess is undefined', () => {
    const plate = makePlate({ subnetAccess: undefined });
    useUIStore.setState({ showProperties: true, selectedId: 'plate-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.queryByText('Access')).not.toBeInTheDocument();
  });

  it('deletes plate on button click', async () => {
    const user = userEvent.setup();
    const plate = makePlate();
    useUIStore.setState({ showProperties: true, selectedId: 'plate-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    await user.click(screen.getByText(/Delete Plate/));
    expect(removePlateMock).toHaveBeenCalledWith('plate-1');
  });

  // --- Block selected ---

  it('renders block properties when block is selected', () => {
    const block = makeBlock();
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('compute')).toBeInTheDocument();
    expect(screen.getByText('Test Compute')).toBeInTheDocument();
    expect(screen.getByText('block-1')).toBeInTheDocument();
    expect(screen.getByText('plate-1')).toBeInTheDocument();
    expect(screen.getByText('(1.5, 0.0, 2.5)')).toBeInTheDocument();
  });

  it('deletes block on button click', async () => {
    const user = userEvent.setup();
    const block = makeBlock();
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    await user.click(screen.getByText(/Delete Block/));
    expect(removeBlockMock).toHaveBeenCalledWith('block-1');
  });

  it('shows move-to dropdown when other subnet plates are available', () => {
    const block = makeBlock({ placementId: 'plate-1' });
    const plate1 = makePlate({ id: 'plate-1', name: 'Subnet A' });
    const plate2 = makePlate({ id: 'plate-2', name: 'Subnet B' });
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate1, plate2], blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('Move to:')).toBeInTheDocument();
    expect(screen.getByText('Subnet B')).toBeInTheDocument();
  });

  it('does not show move-to when no other subnet plates exist', () => {
    const block = makeBlock({ placementId: 'plate-1' });
    const plate1 = makePlate({ id: 'plate-1' });
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate1], blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.queryByText('Move to:')).not.toBeInTheDocument();
  });

  it('does not show move-to when only non-subnet plates exist', () => {
    const block = makeBlock({ placementId: 'plate-1' });
    const plate1 = makePlate({ id: 'plate-1' });
    const networkPlate: Plate = {
      id: 'net-1', name: 'VNet', type: 'network', parentId: null,
      children: [], position: { x: 0, y: 0, z: 0 },
      size: { width: 12, height: 0.3, depth: 10 }, metadata: {},
    };
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate1, networkPlate], blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.queryByText('Move to:')).not.toBeInTheDocument();
  });

  it('moves block when selecting a target plate', async () => {
    const user = userEvent.setup();
    const block = makeBlock({ placementId: 'plate-1' });
    const plate1 = makePlate({ id: 'plate-1', name: 'Subnet A' });
    const plate2 = makePlate({ id: 'plate-2', name: 'Subnet B' });
    useUIStore.setState({ showProperties: true, selectedId: 'block-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, plates: [plate1, plate2], blocks: [block] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'plate-2');
    expect(moveBlockMock).toHaveBeenCalledWith('block-1', 'plate-2');
  });

  // --- Connection selected ---

  it('renders connection properties when connection is selected', () => {
    const conn = makeConnection();
    useUIStore.setState({ showProperties: true, selectedId: 'conn-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, connections: [conn] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    expect(screen.getByText('dataflow')).toBeInTheDocument();
    expect(screen.getByText('conn-1')).toBeInTheDocument();
    expect(screen.getByText('block-1')).toBeInTheDocument();
    expect(screen.getByText('block-2')).toBeInTheDocument();
  });

  it('deletes connection on button click', async () => {
    const user = userEvent.setup();
    const conn = makeConnection();
    useUIStore.setState({ showProperties: true, selectedId: 'conn-1' });
    useArchitectureStore.setState({
      removeBlock: removeBlockMock,
      moveBlock: moveBlockMock,
      removePlate: removePlateMock,
      removeConnection: removeConnectionMock,
      workspace: {
        id: 'ws-1', name: 'Test',
        architecture: { ...defaultArch, connections: [conn] },
        createdAt: '', updatedAt: '',
      },
    });
    render(<PropertiesPanel />);
    await user.click(screen.getByText(/Delete Connection/));
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
  });
});
