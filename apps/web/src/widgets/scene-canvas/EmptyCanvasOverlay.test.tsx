import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyCanvasOverlay } from './EmptyCanvasOverlay';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');

const mockAddPlate = vi.fn();
const mockToggleTemplateGallery = vi.fn();

function setupMocks(plateCount: number, showTemplateGallery = false) {
  const plates = Array.from({ length: plateCount }, (_, i) => ({
    id: `plate-${i}`,
    name: `Plate ${i}`,
    type: 'network' as const,
    parentId: null,
    children: [],
    position: { x: 0, y: 0, z: 0 },
    size: { width: 16, height: 0.3, depth: 20 },
    metadata: {},
  }));

  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = {
      workspace: { architecture: { plates } },
      addPlate: mockAddPlate,
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

  it('renders overlay when no plates', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText('Build Your Architecture')).toBeInTheDocument();
  });

  it('shows subtitle text', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText('Start designing your cloud infrastructure')).toBeInTheDocument();
  });

  it('shows Use Template and Start from Scratch buttons', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText(/Use Template/)).toBeInTheDocument();
    expect(screen.getByText(/Start from Scratch/)).toBeInTheDocument();
  });

  it('clicking Use Template calls toggleTemplateGallery', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText(/Use Template/));
    expect(mockToggleTemplateGallery).toHaveBeenCalledTimes(1);
  });

  it('clicking Start from Scratch calls addPlate with network VNet', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText(/Start from Scratch/));
    expect(mockAddPlate).toHaveBeenCalledWith('network', 'VNet', null);
  });
});
