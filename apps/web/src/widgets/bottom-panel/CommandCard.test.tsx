import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandCard } from './CommandCard';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore, type ToolMode } from '../../entities/store/uiStore';
import { useWorkerStore } from '../../entities/store/workerStore';
import type { ArchitectureModel, Block, Connection, Plate } from '@cloudblocks/schema';

vi.mock('./CommandCard.css', () => ({}));
vi.mock('../../shared/ui/PromptDialog', () => ({ promptDialog: vi.fn() }));
vi.mock('../../shared/ui/ConfirmDialog', () => ({ confirmDialog: vi.fn() }));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1', name: 'Test Architecture', version: '1.0.0',
  plates: [], blocks: [], connections: [], externalActors: [],
  createdAt: '', updatedAt: '',
};
const networkPlate: Plate = { id: 'net-1', name: 'VNet', type: 'region', parentId: null, children: [], position: { x: 0, y: 0, z: 0 }, size: { width: 16, height: 0.3, depth: 20 }, metadata: {} };
const publicSubnet: Plate = { id: 'subnet-public-1', name: 'Public Subnet', type: 'subnet', subnetAccess: 'public', parentId: 'net-1', children: [], position: { x: 1, y: 0, z: 1 }, size: { width: 6, height: 0.3, depth: 8 }, metadata: {} };
const computeBlock: Block = { id: 'block-1', name: 'App VM', category: 'compute', placementId: 'subnet-public-1', position: { x: 1, y: 0, z: 2 }, metadata: {} };
const connection: Connection = { id: 'conn-1', sourceId: 'block-1', targetId: 'block-2', type: 'dataflow', metadata: {} };

describe('CommandCard', () => {
  const addPlateMock = vi.fn();
  const addBlockMock = vi.fn();
  const duplicateBlockMock = vi.fn();
  const renameBlockMock = vi.fn();
  const renamePlateMock = vi.fn();
  const removeBlockMock = vi.fn();
  const removePlateMock = vi.fn();
  const removeConnectionMock = vi.fn();
  const updateBlockConfigMock = vi.fn();
  const updateConnectionTypeMock = vi.fn();
  const setPlateProfileMock = vi.fn();
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();
  const setToolModeMock = vi.fn<(mode: ToolMode) => void>();
  const startBuildMock = vi.fn();
  const triggerUpgradeAnimationMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ selectedId: null, setSelectedId: setSelectedIdMock, setToolMode: setToolModeMock, toolMode: 'select', activeProvider: 'azure', triggerUpgradeAnimation: triggerUpgradeAnimationMock });
    useArchitectureStore.setState({ addPlate: addPlateMock, addBlock: addBlockMock, duplicateBlock: duplicateBlockMock, renameBlock: renameBlockMock, renamePlate: renamePlateMock, removeBlock: removeBlockMock, removePlate: removePlateMock, removeConnection: removeConnectionMock, updateBlockConfig: updateBlockConfigMock, updateConnectionType: updateConnectionTypeMock, setPlateProfile: setPlateProfileMock, workspace: { id: 'ws-1', name: 'Test Workspace', architecture: baseArchitecture, createdAt: '', updatedAt: '' } });
    useWorkerStore.setState({ workerPosition: [2, 0, 3], startBuild: startBuildMock });
  });

  it('renders empty mode when nothing is selected', () => {
    render(<CommandCard />);
    expect(screen.getByText('Command Card')).toBeInTheDocument();
    expect(screen.getByText(/Select an element/)).toBeInTheDocument();
  });

  it('shows worker actions with Build, Connect, Move, Relocate', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    render(<CommandCard />);
    expect(screen.getByText('Worker Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Build/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Move/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Relocate/ })).toBeInTheDocument();
  });

  it('transitions to build creation grid when Build is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Build/ }));
    expect(screen.getByText('Build Resource')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to worker actions/ })).toBeInTheDocument();
  });

  it('returns from build grid via Back button', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Build/ }));
    await user.click(screen.getByRole('button', { name: /Back to worker actions/ }));
    expect(screen.getByText('Worker Actions')).toBeInTheDocument();
  });

  it('calls setToolMode connect when Connect is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Connect/ }));
    expect(setToolModeMock).toHaveBeenCalledWith('connect');
  });

  it('shows block mode with Rename, Copy, Delete, inputs, and Apply', () => {
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    expect(screen.getByText(/Block: App VM/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
    expect(screen.getByText('Tier')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
  });

  it('calls duplicateBlock when Copy is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(duplicateBlockMock).toHaveBeenCalledWith('block-1');
  });

  it('calls updateBlockConfig and triggerUpgradeAnimation when Apply is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Apply/ }));
    expect(updateBlockConfigMock).toHaveBeenCalledWith('block-1', expect.objectContaining({ tier: 'standard', scale: 1 }));
    expect(triggerUpgradeAnimationMock).toHaveBeenCalledWith('block-1');
  });

  it('shows plate mode with Rename, Delete, and Apply', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    expect(screen.getByText(/Plate: VNet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
  });

  it('shows connection mode with Delete, Type dropdown, and Apply', () => {
    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'DB' }], connections: [connection] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('calls removeConnection when Delete is clicked in connection mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'DB' }], connections: [connection] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Delete/ }));
    expect(removeConnectionMock).toHaveBeenCalledWith('conn-1');
    expect(setSelectedIdMock).toHaveBeenCalledWith(null);
  });

  it('calls updateConnectionType when Apply is clicked in connection mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'conn-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock, { ...computeBlock, id: 'block-2', name: 'DB' }], connections: [connection] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Apply/ }));
    expect(updateConnectionTypeMock).toHaveBeenCalledWith('conn-1', 'dataflow');
  });

  it('calls updateBlockConfig and triggerUpgradeAnimation on block Apply', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Apply/ }));
    expect(updateBlockConfigMock).toHaveBeenCalled();
    expect(triggerUpgradeAnimationMock).toHaveBeenCalledWith('block-1');
  });

  it('calls duplicateBlock on Copy click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'block-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [computeBlock] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Copy/ }));
    expect(duplicateBlockMock).toHaveBeenCalledWith('block-1');
  });

  it('shows plate actions with Rename, Delete, Apply', () => {
    useUIStore.setState({ selectedId: 'net-1' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate] }, createdAt: '', updatedAt: '' } });
    render(<CommandCard />);
    expect(screen.getByRole('button', { name: /Rename/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeInTheDocument();
  });

  it('sets connect tool mode on Connect click', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Connect/ }));
    expect(setToolModeMock).toHaveBeenCalledWith('connect');
  });

  it('calls startBuild when resource is clicked in worker build grid', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ selectedId: 'worker-default' });
    useArchitectureStore.setState({ workspace: { id: 'ws-1', name: 'Test Workspace', architecture: { ...baseArchitecture, plates: [networkPlate, publicSubnet], blocks: [] }, createdAt: '', updatedAt: '' } });
    addBlockMock.mockImplementation((category, name, placementId) => {
      useArchitectureStore.setState((state) => ({
        workspace: { ...state.workspace, architecture: { ...state.workspace.architecture, blocks: [...state.workspace.architecture.blocks, { id: 'worker-built-block', name, category, placementId, position: { x: 0, y: 0, z: 0 }, metadata: {} }] } },
      }));
    });
    render(<CommandCard />);
    await user.click(screen.getByRole('button', { name: /Build/ }));
    await user.click(screen.getByTitle('Build Virtual Machine'));
    expect(startBuildMock).toHaveBeenCalledWith('worker-built-block', [1, 0.3, 1]);
  });
});
