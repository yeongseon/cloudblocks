import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyCanvasOverlay } from './EmptyCanvasOverlay';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { toast } from 'react-hot-toast';
import { clearWorkspaceDiffUI } from '../../entities/store/uiSync';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../../entities/store/uiSync', () => ({
  clearWorkspaceDiffUI: vi.fn(),
}));

const mockAddNode = vi.fn();
const mockOpenDrawer = vi.fn();
const mockImportArchitecture = vi.fn();

function setupMocks(plateCount: number, templateDrawerOpen = false) {
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
      activeProvider: 'azure' as const,
      drawer: { isOpen: templateDrawerOpen, activePanel: templateDrawerOpen ? 'templates' : null },
      openDrawer: mockOpenDrawer,
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

  it('clicking Explore Templates opens template drawer', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText('Explore Templates'));
    expect(mockOpenDrawer).toHaveBeenCalledWith('templates');
  });

  it('clicking Import JSON triggers file input click', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByText('Import JSON'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('importing a valid JSON file shows success toast', async () => {
    setupMocks(0);
    mockImportArchitecture.mockReturnValue(null);
    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const jsonContent = '{"nodes":[],"connections":[]}';
    const file = new File([jsonContent], 'arch.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(mockImportArchitecture).toHaveBeenCalledWith(jsonContent, 'azure');
      expect(clearWorkspaceDiffUI).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Architecture imported successfully!');
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  it('importing an invalid JSON file shows error toast', async () => {
    setupMocks(0);
    mockImportArchitecture.mockReturnValue('Invalid schema version');
    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const jsonContent = '{"bad":true}';
    const file = new File([jsonContent], 'bad.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Import failed: Invalid schema version');
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('shows error toast when FileReader fails', () => {
    setupMocks(0);

    // Patch FileReader.readAsText to call onerror synchronously
    const originalReadAsText = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function () {
      // onerror is already assigned before readAsText is called
      if (this.onerror) {
        (this.onerror as () => void)();
      }
    };

    render(<EmptyCanvasOverlay />);
    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const file = new File(['content'], 'arch.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith('Failed to read file.');

    FileReader.prototype.readAsText = originalReadAsText;
  });
});
