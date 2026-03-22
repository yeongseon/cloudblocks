import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useUIStore } from '../../entities/store/uiStore';

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

const initialSetBottomTab = useUIStore.getState().setBottomTab;
const initialClearLog = useUIStore.getState().clearLog;

describe('BottomPanel', () => {
  beforeEach(() => {
    useUIStore.setState({
      bottomDock: { isOpen: true, activeTab: 'output' },
      showResourceGuide: true,
      activityLog: [],
      selectedId: null,
      setBottomTab: initialSetBottomTab,
      clearLog: initialClearLog,
    });
  });

  it('renders all 4 tabs', () => {
    render(<BottomPanel />);

    expect(screen.getByRole('tab', { name: 'Output' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Validation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Diff' })).toBeInTheDocument();
  });

  it('clicking a tab calls setBottomTab with the tab id', () => {
    const setBottomTab = vi.fn((tab: 'output' | 'validation' | 'logs' | 'diff') => {
      useUIStore.setState((s) => ({ bottomDock: { ...s.bottomDock, activeTab: tab } }));
    });
    useUIStore.setState({ setBottomTab });

    render(<BottomPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Logs' }));

    expect(setBottomTab).toHaveBeenCalledWith('logs');
  });

  it('shows Output tab content by default and always renders CommandCard', () => {
    render(<BottomPanel />);

    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getByTestId('command-card')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('mounts the correct content for each tab', () => {
    render(<BottomPanel />);

    fireEvent.click(screen.getByRole('tab', { name: 'Validation' }));
    expect(screen.getByText('No validation results. Run validation from the menu.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Logs' }));
    expect(screen.getByText('No activity logged yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Diff' }));
    expect(screen.getByText('No diff data. Use Compare with GitHub to generate a diff.')).toBeInTheDocument();
  });

  it('Output tab respects showResourceGuide toggle', () => {
    useUIStore.setState({ showResourceGuide: false });
    render(<BottomPanel />);
    expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument();

    act(() => {
      useUIStore.setState({ showResourceGuide: true });
    });
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });
});
