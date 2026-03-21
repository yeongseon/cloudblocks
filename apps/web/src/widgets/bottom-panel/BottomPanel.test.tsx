import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('./BottomPanel.css', () => ({}));

vi.mock('./Minimap', () => ({
  Minimap: ({ className = '' }: { className?: string }) => <div data-testid="minimap" className={className}>Minimap</div>,
}));

vi.mock('./DetailPanel', () => ({
  DetailPanel: ({ className = '' }: { className?: string }) => <div data-testid="detail-panel" className={className}>DetailPanel</div>,
}));

vi.mock('./CommandCard', () => ({
  CommandCard: ({ className = '' }: { className?: string }) => <div data-testid="command-card" className={className}>CommandCard</div>,
}));

import { BottomPanel } from './BottomPanel';

describe('BottomPanel', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedId: null, isBuildOrderOpen: true });
  });

  it('renders all child widgets', () => {
    render(<BottomPanel />);

    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('command-card')).toBeInTheDocument();
  });

  it('applies className to root wrapper', () => {
    const { container } = render(<BottomPanel className="custom-bottom" />);

    const panel = container.querySelector('.bottom-panel');
    expect(panel).toHaveClass('bottom-panel');
    expect(panel).toHaveClass('custom-bottom');
  });

  it('adds build-order-open class when build order is open', () => {
    useUIStore.setState({ isBuildOrderOpen: true });

    const { container } = render(<BottomPanel />);

    expect(container.querySelector('.bottom-panel')).toHaveClass('bottom-panel--build-order-open');
  });

  it('removes build-order-open class when build order is closed', () => {
    useUIStore.setState({ isBuildOrderOpen: false });

    const { container } = render(<BottomPanel />);

    expect(container.querySelector('.bottom-panel')).not.toHaveClass('bottom-panel--build-order-open');
  });

  it('shows expand tab when build order is closed', () => {
    useUIStore.setState({ isBuildOrderOpen: false });

    render(<BottomPanel />);

    expect(screen.getByRole('button', { name: /open build order/i })).toBeInTheDocument();
    expect(screen.queryByTestId('command-card')).not.toBeInTheDocument();
  });

  it('hides expand tab when build order is open', () => {
    useUIStore.setState({ isBuildOrderOpen: true });

    render(<BottomPanel />);

    expect(screen.queryByRole('button', { name: /open build order/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('command-card')).toBeInTheDocument();
  });
});
