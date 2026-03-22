import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../../entities/store/uiStore';
import { BottomDockTabs } from './BottomDockTabs';

vi.mock('./BottomDockTabs.css', () => ({}));

describe('BottomDockTabs', () => {
  beforeEach(() => {
    useUIStore.setState({
      bottomDock: { isOpen: true, activeTab: 'output' },
    });
  });

  it('renders all tabs and marks the active one', () => {
    render(<BottomDockTabs />);

    expect(screen.getByRole('tab', { name: 'Output' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Validation' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Diff' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches active tab when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomDockTabs />);

    await user.click(screen.getByRole('tab', { name: 'Validation' }));
    expect(useUIStore.getState().bottomDock.activeTab).toBe('validation');

    await user.click(screen.getByRole('tab', { name: 'Logs' }));
    expect(useUIStore.getState().bottomDock.activeTab).toBe('logs');

    await user.click(screen.getByRole('tab', { name: 'Diff' }));
    expect(useUIStore.getState().bottomDock.activeTab).toBe('diff');
  });
});
