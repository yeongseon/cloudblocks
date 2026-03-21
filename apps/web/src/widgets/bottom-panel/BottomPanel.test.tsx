import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('./BottomPanel.css', () => ({}));
vi.mock('./Minimap', () => ({ Minimap: ({ className = '' }: { className?: string }) => <div data-testid="minimap" className={className}>Minimap</div> }));
vi.mock('./DetailPanel', () => ({ DetailPanel: ({ className = '' }: { className?: string }) => <div data-testid="detail-panel" className={className}>DetailPanel</div> }));

import { BottomPanel } from './BottomPanel';

describe('BottomPanel', () => {
  beforeEach(() => { useUIStore.setState({ selectedId: null }); });

  it('renders minimap and detail panel', () => {
    render(<BottomPanel />);
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });

  it('applies className to root wrapper', () => {
    const { container } = render(<BottomPanel className="custom-bottom" />);
    const panel = container.querySelector('.bottom-panel');
    expect(panel).toHaveClass('bottom-panel');
    expect(panel).toHaveClass('custom-bottom');
  });

  it('shows context text for unselected state', () => {
    render(<BottomPanel />);
    expect(screen.getByText('Select the minifigure to start building')).toBeInTheDocument();
  });

  it('shows context text when worker is selected', () => {
    useUIStore.setState({ selectedId: 'worker-default' });
    render(<BottomPanel />);
    expect(screen.getByText('Select a resource from the panel to build')).toBeInTheDocument();
  });

  it('always shows detail panel', () => {
    render(<BottomPanel />);
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });
});
