import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomDockTabs } from './BottomDockTabs';

vi.mock('./BottomDockTabs.css', () => ({}));

describe('BottomDockTabs', () => {
  it('renders all tabs and marks the active one', () => {
    const onTabChange = vi.fn();
    render(<BottomDockTabs activeTab="output" onTabChange={onTabChange} />);

    expect(screen.getByRole('tab', { name: 'Output' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Validation' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Diff' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<BottomDockTabs activeTab="output" onTabChange={onTabChange} />);

    await user.click(screen.getByRole('tab', { name: 'Validation' }));
    expect(onTabChange).toHaveBeenCalledWith('validation');

    await user.click(screen.getByRole('tab', { name: 'Logs' }));
    expect(onTabChange).toHaveBeenCalledWith('logs');

    await user.click(screen.getByRole('tab', { name: 'Diff' }));
    expect(onTabChange).toHaveBeenCalledWith('diff');
  });
});
