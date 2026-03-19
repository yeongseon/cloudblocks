import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Minimap } from './Minimap';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel, Block, Connection, Plate } from '../../shared/types/index';

vi.mock('./Minimap.css', () => ({}));

const networkPlate: Plate = {
  id: 'net-1',
  name: 'Main VNet',
  type: 'region',
  parentId: null,
  children: [],
  position: { x: 0, y: 0, z: 0 },
  size: { width: 16, height: 0.3, depth: 20 },
  metadata: {},
};

const publicSubnet: Plate = {
  id: 'subnet-1',
  name: 'Public Subnet',
  type: 'subnet',
  subnetAccess: 'public',
  parentId: 'net-1',
  children: [],
  position: { x: 2, y: 0, z: 2 },
  size: { width: 6, height: 0.3, depth: 8 },
  metadata: {},
};

const sourceBlock: Block = {
  id: 'block-1',
  name: 'App VM',
  category: 'compute',
  placementId: 'subnet-1',
  position: { x: 1, y: 0, z: 1 },
  metadata: {},
};

const targetBlock: Block = {
  id: 'block-2',
  name: 'SQL DB',
  category: 'database',
  placementId: 'subnet-1',
  position: { x: 3, y: 0, z: 4 },
  metadata: {},
};

const connection: Connection = {
  id: 'conn-1',
  sourceId: 'block-1',
  targetId: 'block-2',
  type: 'dataflow',
  metadata: {},
};

const emptyArchitecture: ArchitectureModel = {
  id: 'arch-empty',
  name: 'Empty Architecture',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('Minimap', () => {
  const setSelectedIdMock = vi.fn<(id: string | null) => void>();

  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      selectedId: null,
      setSelectedId: setSelectedIdMock,
    });

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: emptyArchitecture,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders empty state indicator with no resources', () => {
    render(<Minimap />);

    expect(screen.getByText('🗺️')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Architecture minimap' })).not.toBeInTheDocument();
  });

  it('renders plates as SVG rectangles', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);

    expect(screen.getByRole('img', { name: 'Architecture minimap' })).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });

  it('renders blocks as SVG circles', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);

    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('renders connections as SVG lines', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
          connections: [connection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);

    expect(container.querySelectorAll('line')).toHaveLength(1);
  });

  it('selects an element when clicking minimap resource', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const firstPlate = container.querySelector('rect');

    expect(firstPlate).toBeTruthy();

    if (firstPlate) {
      fireEvent.pointerDown(firstPlate);
    }

    expect(setSelectedIdMock).toHaveBeenCalledWith('net-1');
  });

  it('highlights selected plate in minimap', () => {
    useUIStore.setState({ selectedId: 'net-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const selectedRect = container.querySelector('rect.minimap-plate.selected');

    expect(selectedRect).toBeTruthy();
  });

  it('highlights selected block in minimap', () => {
    useUIStore.setState({ selectedId: 'block-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const selectedCircle = container.querySelector('circle.minimap-block.selected');

    expect(selectedCircle).toBeTruthy();
  });

  it('highlights selected connection in minimap', () => {
    useUIStore.setState({ selectedId: 'conn-1', setSelectedId: setSelectedIdMock });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
          connections: [connection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const selectedLine = container.querySelector('line.minimap-connection.selected');

    expect(selectedLine).toBeTruthy();
  });

  it('filters out connection when source and target blocks are missing', () => {
    const orphanConnection: Connection = {
      id: 'orphan-conn',
      sourceId: 'missing-1',
      targetId: 'missing-2',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate],
          connections: [orphanConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);

    expect(container.querySelectorAll('line')).toHaveLength(0);
  });

  it('selects a connection when clicking minimap line', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
          connections: [connection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const firstConnection = container.querySelector('line');

    expect(firstConnection).toBeTruthy();

    if (firstConnection) {
      fireEvent.pointerDown(firstConnection);
    }

    expect(setSelectedIdMock).toHaveBeenCalledWith('conn-1');
  });

  it('selects a block when clicking minimap circle', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate, publicSubnet],
          blocks: [sourceBlock, targetBlock],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);
    const firstBlock = container.querySelector('circle');

    expect(firstBlock).toBeTruthy();

    if (firstBlock) {
      fireEvent.pointerDown(firstBlock);
    }

    expect(setSelectedIdMock).toHaveBeenCalledWith('block-1');
  });

  it('renders blocks and connections when parent plates are missing', () => {
    const floatingSource: Block = {
      ...sourceBlock,
      id: 'floating-1',
      placementId: 'missing-plate-1',
    };
    const floatingTarget: Block = {
      ...targetBlock,
      id: 'floating-2',
      placementId: 'missing-plate-2',
    };
    const floatingConnection: Connection = {
      id: 'floating-conn',
      sourceId: 'floating-1',
      targetId: 'floating-2',
      type: 'dataflow',
      metadata: {},
    };

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test Workspace',
        architecture: {
          ...emptyArchitecture,
          plates: [networkPlate],
          blocks: [floatingSource, floatingTarget],
          connections: [floatingConnection],
        },
        createdAt: '',
        updatedAt: '',
      },
    });

    const { container } = render(<Minimap />);

    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(container.querySelectorAll('line')).toHaveLength(1);
  });
});
