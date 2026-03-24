import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../../../entities/store/uiStore';
import { useArchitectureStore } from '../../../../entities/store/architectureStore';
import { PropertiesDrawerPanel } from '../PropertiesDrawerPanel';
import type { ContainerBlock, ResourceBlock } from '@cloudblocks/schema';

// Mock audioService
vi.mock('../../../../shared/utils/audioService', () => ({
  audioService: {
    playSound: vi.fn(),
  },
}));

function makeBlock(overrides?: Partial<ResourceBlock>): ResourceBlock {
  return {
    id: 'block-1',
    kind: 'resource',
    name: 'My VM',
    category: 'compute',
    resourceType: 'virtual-machine',
    layer: 'resource',
    provider: 'azure',
    parentId: 'plate-1',
    position: { x: 2, y: 0, z: 3 },
    metadata: {},
    ...overrides,
  } as ResourceBlock;
}

function makePlate(overrides?: Partial<ContainerBlock>): ContainerBlock {
  return {
    id: 'plate-1',
    kind: 'container',
    name: 'My VNet',
    category: 'network',
    resourceType: 'virtual_network',
    layer: 'region',
    provider: 'azure',
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    frame: { width: 10, depth: 10, height: 1 },
    metadata: {},
    children: [],
    ...overrides,
  } as ContainerBlock;
}

describe('PropertiesDrawerPanel', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedId: null,
      drawer: { isOpen: true, activePanel: 'properties' },
    });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...useArchitectureStore.getState().workspace.architecture,
          name: 'Test Workspace',
          nodes: [],
          connections: [],
          endpoints: [],
          externalActors: [],
        },
      },
    });
  });

  describe('Empty State', () => {
    it('shows workspace summary when nothing is selected', () => {
      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-empty-state')).toBeDefined();
      expect(screen.getByText('Workspace')).toBeDefined();
      expect(screen.getByText('Select a node or connection to edit its properties.')).toBeDefined();
    });

    it('displays node and connection counts', () => {
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByText('2')).toBeDefined(); // node count
    });
  });

  describe('Node Properties', () => {
    it('renders node properties when a block is selected', () => {
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-node')).toBeDefined();
      expect(screen.getByText('Identity')).toBeDefined();
      expect(screen.getByText('Configuration')).toBeDefined();
      expect(screen.getByText('Position')).toBeDefined();
    });

    it('shows editable name field with current node name', () => {
      const plate = makePlate();
      const block = makeBlock({ name: 'My VM' });
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      const nameInput = screen.getByTestId('props-name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('My VM');
    });

    it('shows notes textarea with metadata notes', () => {
      const plate = makePlate();
      const block = makeBlock({ metadata: { notes: 'Production VM' } });
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      const notesInput = screen.getByTestId('props-notes-input') as HTMLTextAreaElement;
      expect(notesInput.value).toBe('Production VM');
    });

    it('shows configuration fields as read-only', () => {
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByText('virtual-machine')).toBeDefined();
      expect(screen.getByText('AZURE')).toBeDefined();
    });

    it('shows duplicate button for resource nodes', () => {
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-duplicate-btn')).toBeDefined();
    });

    it('shows danger zone with delete button', () => {
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-danger-zone')).toBeDefined();
      expect(screen.getByTestId('props-delete-btn')).toBeDefined();
      expect(screen.getByText('Delete')).toBeDefined();
    });

    it('delete requires double-click confirmation', async () => {
      const user = userEvent.setup();
      const plate = makePlate();
      const block = makeBlock();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, block],
          },
        },
      });
      useUIStore.setState({ selectedId: 'block-1' });

      render(<PropertiesDrawerPanel />);
      const deleteBtn = screen.getByTestId('props-delete-btn');

      // First click — shows confirmation
      await user.click(deleteBtn);
      expect(screen.getByText('Click again to confirm delete')).toBeDefined();

      // Second click — performs delete
      await user.click(deleteBtn);
      expect(useUIStore.getState().selectedId).toBeNull();
    });
  });

  describe('Container Properties', () => {
    it('renders container properties when a plate is selected', () => {
      const plate = makePlate();
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate],
          },
        },
      });
      useUIStore.setState({ selectedId: 'plate-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-node')).toBeDefined();
      expect(screen.getAllByText('10')).toHaveLength(2); // width + depth
    });
  });

  describe('Connection Properties', () => {
    it('renders connection properties when a connection is selected', () => {
      const plate = makePlate();
      const blockA = makeBlock({ id: 'block-a', name: 'Gateway' });
      const blockB = makeBlock({ id: 'block-b', name: 'Compute' });
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, blockA, blockB],
            connections: [
              {
                id: 'conn-1',
                from: 'endpoint-block-a-output-http',
                to: 'endpoint-block-b-input-http',
                metadata: {},
              },
            ],
            endpoints: [],
          },
        },
      });
      useUIStore.setState({ selectedId: 'conn-1' });

      render(<PropertiesDrawerPanel />);
      expect(screen.getByTestId('props-connection')).toBeDefined();
      expect(screen.getByText('Gateway')).toBeDefined();
      expect(screen.getByText('Compute')).toBeDefined();
    });

    it('connection delete requires double-click', async () => {
      const user = userEvent.setup();
      const plate = makePlate();
      const blockA = makeBlock({ id: 'block-a', name: 'Gateway' });
      useArchitectureStore.setState({
        workspace: {
          ...useArchitectureStore.getState().workspace,
          architecture: {
            ...useArchitectureStore.getState().workspace.architecture,
            nodes: [plate, blockA],
            connections: [
              {
                id: 'conn-1',
                from: 'endpoint-block-a-output-http',
                to: 'endpoint-block-b-input-http',
                metadata: {},
              },
            ],
            endpoints: [],
          },
        },
      });
      useUIStore.setState({ selectedId: 'conn-1' });

      render(<PropertiesDrawerPanel />);
      const deleteBtn = screen.getByTestId('props-delete-btn');

      await user.click(deleteBtn);
      expect(screen.getByText('Click again to confirm delete')).toBeDefined();
    });
  });
});
