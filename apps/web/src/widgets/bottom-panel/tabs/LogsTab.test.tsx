import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../../entities/store/uiStore';
import { LogsTab } from './LogsTab';

vi.mock('./LogsTab.css', () => ({}));

describe('LogsTab', () => {
  beforeEach(() => {
    useUIStore.setState({
      activityLog: [],
      clearLog: vi.fn(),
    });
  });

  it('shows empty state when no log entries exist', () => {
    render(<LogsTab />);
    expect(screen.getByText('No activity logged yet.')).toBeInTheDocument();
  });

  it('renders entries in reverse order and formats invalid timestamps', () => {
    useUIStore.setState({
      activityLog: [
        {
          id: 'log-1',
          ts: 'not-a-date',
          level: 'info',
          message: 'first',
        },
        {
          id: 'log-2',
          ts: '2024-01-02T03:04:05.000Z',
          level: 'error',
          message: 'second',
        },
      ],
    });

    const { container } = render(<LogsTab />);

    const messages = Array.from(container.querySelectorAll('.bottom-dock-log-message')).map((el) => el.textContent);
    expect(messages).toEqual(['second', 'first']);
    expect(screen.getByText('--:--:--')).toBeInTheDocument();
    expect(container.querySelector('.bottom-dock-log-level--error')).toBeInTheDocument();
  });

  it('clears logs when Clear button is pressed', async () => {
    const user = userEvent.setup();
    const clearLog = vi.fn();
    useUIStore.setState({ clearLog });

    render(<LogsTab />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(clearLog).toHaveBeenCalledOnce();
  });
});
