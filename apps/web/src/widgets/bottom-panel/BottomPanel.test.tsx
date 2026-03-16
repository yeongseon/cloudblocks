import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./BottomPanel.css', () => ({}));

vi.mock('./Minimap', () => ({
  Minimap: ({ className = '' }: { className?: string }) => <div data-testid="minimap" className={className}>Minimap</div>,
}));

vi.mock('./DetailPanel', () => ({
  DetailPanel: ({ className = '' }: { className?: string }) => <div data-testid="detail-panel" className={className}>DetailPanel</div>,
}));

vi.mock('./Portrait', () => ({
  Portrait: ({ className = '' }: { className?: string }) => <div data-testid="portrait" className={className}>Portrait</div>,
}));

vi.mock('./CommandCard', () => ({
  CommandCard: ({ className = '' }: { className?: string }) => <div data-testid="command-card" className={className}>CommandCard</div>,
}));

import { BottomPanel } from './BottomPanel';

describe('BottomPanel', () => {
  it('renders all child widgets', () => {
    render(<BottomPanel />);

    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('portrait')).toBeInTheDocument();
    expect(screen.getByTestId('command-card')).toBeInTheDocument();
  });

  it('applies className to root wrapper', () => {
    const { container } = render(<BottomPanel className="custom-bottom" />);

    expect(container.firstElementChild).toHaveClass('bottom-panel');
    expect(container.firstElementChild).toHaveClass('custom-bottom');
  });
});
