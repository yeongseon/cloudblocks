import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DragGhost } from './DragGhost';
import { useUIStore } from '../../entities/store/uiStore';

describe('DragGhost', () => {
  afterEach(() => {
    useUIStore.setState({
      draggedBlockCategory: null,
      draggedResourceName: null,
    });
  });

  it('renders nothing when no drag active', () => {
    const { container } = render(<DragGhost />);
    expect(container.querySelector('.drag-ghost')).toBeNull();
  });

  it('renders ghost when drag is active', () => {
    useUIStore.setState({
      draggedBlockCategory: 'compute',
      draggedResourceName: 'Virtual Machine',
    });
    render(<DragGhost />);
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();
  });

  it('renders nothing after drag is cancelled', () => {
    useUIStore.setState({
      draggedBlockCategory: 'compute',
      draggedResourceName: 'Virtual Machine',
    });
    const { container, rerender } = render(<DragGhost />);
    expect(screen.getByText('Virtual Machine')).toBeInTheDocument();

    useUIStore.getState().cancelDrag();
    rerender(<DragGhost />);

    expect(container.querySelector('.drag-ghost')).toBeNull();
  });
});
