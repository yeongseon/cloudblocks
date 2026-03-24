import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyCanvasOverlay } from './EmptyCanvasOverlay';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');

const mockAddNode = vi.fn();
const mockToggleTemplateGallery = vi.fn();
const mockImportArchitecture = vi.fn();

function setupMocks(plateCount: number, showTemplateGallery = false) {
  const nodes = Array.from({ length: plateCount }, (_, i) => ({
    id: `container-${i}`,
    name: `ContainerBlock ${i}`,
    kind: 'container' as const,
    layer: 'region' as const,
    resourceType: 'virtual_network' as const,
    category: 'network' as const,
    provider: 'azure' as const,
    parentId: null,
    position: { x: 0, y: 0, z: 0 },
    size: { width: 16, height: 0.3, depth: 20 },
    metadata: {},
  }));

  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = {
      workspace: { architecture: { nodes } },
      addNode: mockAddNode,
      importArchitecture: mockImportArchitecture,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);

  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      showTemplateGallery,
      toggleTemplateGallery: mockToggleTemplateGallery,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useUIStore);
}

describe('EmptyCanvasOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when plates exist', () => {
    setupMocks(1);
    const { container } = render(<EmptyCanvasOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when template gallery is open', () => {
    setupMocks(0, true);
    const { container } = render(<EmptyCanvasOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('renders CloudBlocks title when no plates', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText('CloudBlocks')).toBeInTheDocument();
  });

  it('shows subtitle text', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText('Visual cloud architecture builder')).toBeInTheDocument();
  });

  it('shows Create Workspace, Explore Templates, and Import JSON cards', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText('Create Workspace')).toBeInTheDocument();
    expect(screen.getByText('Explore Templates')).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
  });

  it('clicking Create Workspace calls addNode with container VNet', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText('Create Workspace'));
    expect(mockAddNode).toHaveBeenCalledWith({
      kind: 'container',
      resourceType: 'virtual_network',
      name: 'VNet',
      parentId: null,
      layer: 'region',
    });
  });

  it('clicking Explore Templates calls toggleTemplateGallery', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText('Explore Templates'));
    expect(mockToggleTemplateGallery).toHaveBeenCalledTimes(1);
  });

  it('clicking Import JSON triggers file input click', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByText('Import JSON'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('importing a JSON file calls importArchitecture with file content', async () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const jsonContent = '{"nodes":[],"connections":[]}';
    const file = new File([jsonContent], 'arch.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(mockImportArchitecture).toHaveBeenCalledWith(jsonContent);
    });
  });
});
