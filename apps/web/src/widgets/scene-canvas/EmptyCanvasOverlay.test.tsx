import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyCanvasOverlay } from './EmptyCanvasOverlay';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');

const mockAddPlate = vi.fn();
const mockToggleTemplateGallery = vi.fn();
const mockToggleScenarioGallery = vi.fn();

function setupMocks(plateCount: number, showTemplateGallery = false) {
  const nodes = Array.from({ length: plateCount }, (_, i) => ({
    id: `plate-${i}`,
    name: `Plate ${i}`,
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
      addPlate: mockAddPlate,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);

  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      showTemplateGallery,
      toggleTemplateGallery: mockToggleTemplateGallery,
      toggleScenarioGallery: mockToggleScenarioGallery,
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
    expect(screen.getByText('Design Cloud Architecture Visually')).toBeInTheDocument();
  });

  it('shows subtitle text', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText(/generate Terraform or Bicep in one click/)).toBeInTheDocument();
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
    expect(mockAddPlate).toHaveBeenCalledWith('region', 'VNet', null);
  });

  it('shows Learn How link when no plates', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    expect(screen.getByText(/Learn How/)).toBeInTheDocument();
  });

  it('clicking Learn How calls toggleScenarioGallery', () => {
    setupMocks(0);
    render(<EmptyCanvasOverlay />);
    fireEvent.click(screen.getByText(/Learn How/));
    expect(mockToggleScenarioGallery).toHaveBeenCalledTimes(1);
  });
});
