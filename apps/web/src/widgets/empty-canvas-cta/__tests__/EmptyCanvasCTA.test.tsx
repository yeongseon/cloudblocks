import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyCanvasCTA } from '../EmptyCanvasCTA';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useUIStore } from '../../../entities/store/uiStore';

vi.mock('../EmptyCanvasCTA.css', () => ({}));

function setEmpty() {
  const state = useArchitectureStore.getState();
  useArchitectureStore.setState({
    workspace: {
      ...state.workspace,
      architecture: {
        ...state.workspace.architecture,
        nodes: [],
        connections: [],
      },
    },
  });
}

function setNonEmpty() {
  const state = useArchitectureStore.getState();
  useArchitectureStore.setState({
    workspace: {
      ...state.workspace,
      architecture: {
        ...state.workspace.architecture,
        nodes: [
          {
            id: 'node-1',
            name: 'Test Node',
            kind: 'resource' as const,
            layer: 'resource' as const,
            resourceType: 'web_compute',
            category: 'compute' as const,
            provider: 'azure',
            parentId: 'container-1',
            position: { x: 0, y: 0, z: 0 },
            metadata: {},
          },
        ],
        connections: [],
      },
    },
  });
}

describe('EmptyCanvasCTA', () => {
  beforeEach(() => {
    setEmpty();
    useUIStore.setState({
      drawer: { isOpen: false, activePanel: null },
    });
  });

  it('renders CTA when canvas is empty', () => {
    render(<EmptyCanvasCTA />);
    expect(screen.getByTestId('empty-canvas-cta')).toBeInTheDocument();
    expect(screen.getByText('Design your cloud architecture')).toBeInTheDocument();
  });

  it('does not render when canvas has nodes', () => {
    setNonEmpty();
    const { container } = render(<EmptyCanvasCTA />);
    expect(container.innerHTML).toBe('');
  });

  it('shows Start from Template and Start from Scratch buttons', () => {
    render(<EmptyCanvasCTA />);
    expect(screen.getByRole('button', { name: /Start from Template/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start from Scratch/ })).toBeInTheDocument();
  });

  it('Start from Template opens scenarios drawer', async () => {
    const user = userEvent.setup();
    render(<EmptyCanvasCTA />);

    await user.click(screen.getByRole('button', { name: /Start from Template/ }));

    expect(useUIStore.getState().drawer.activePanel).toBe('scenarios');
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
  });

  it('Start from Scratch dismisses CTA after exit animation', async () => {
    const user = userEvent.setup();
    render(<EmptyCanvasCTA />);

    const cta = screen.getByTestId('empty-canvas-cta');
    await user.click(screen.getByRole('button', { name: /Start from Scratch/ }));

    expect(cta).toHaveClass('is-exiting');
    fireEvent.animationEnd(cta);

    expect(screen.queryByTestId('empty-canvas-cta')).not.toBeInTheDocument();
  });

  it('auto-hides when nodes are added', () => {
    const { rerender } = render(<EmptyCanvasCTA />);
    expect(screen.getByTestId('empty-canvas-cta')).toBeInTheDocument();

    setNonEmpty();
    rerender(<EmptyCanvasCTA />);

    expect(screen.queryByTestId('empty-canvas-cta')).not.toBeInTheDocument();
  });

  it('re-shows CTA when canvas becomes empty again after non-empty state', () => {
    setNonEmpty();
    const { rerender } = render(<EmptyCanvasCTA />);
    expect(screen.queryByTestId('empty-canvas-cta')).not.toBeInTheDocument();

    setEmpty();
    rerender(<EmptyCanvasCTA />);
    expect(screen.getByTestId('empty-canvas-cta')).toBeInTheDocument();
  });

  it('does not render when canvas has connections but no nodes', () => {
    const state = useArchitectureStore.getState();
    useArchitectureStore.setState({
      workspace: {
        ...state.workspace,
        architecture: {
          ...state.workspace.architecture,
          nodes: [],
          connections: [{ id: 'conn-1', from: 'ep-1', to: 'ep-2', metadata: {} }],
        },
      },
    });

    const { container } = render(<EmptyCanvasCTA />);
    expect(container.innerHTML).toBe('');
  });

  it('shows subtitle with guidance text', () => {
    render(<EmptyCanvasCTA />);
    expect(screen.getByText(/Drag nodes from the sidebar/)).toBeInTheDocument();
  });

  it('Start from Template triggers exit animation then dismisses', async () => {
    const user = userEvent.setup();
    render(<EmptyCanvasCTA />);

    const cta = screen.getByTestId('empty-canvas-cta');
    await user.click(screen.getByRole('button', { name: /Start from Template/ }));

    expect(cta).toHaveClass('is-exiting');
    fireEvent.animationEnd(cta);

    expect(screen.queryByTestId('empty-canvas-cta')).not.toBeInTheDocument();
  });
});
