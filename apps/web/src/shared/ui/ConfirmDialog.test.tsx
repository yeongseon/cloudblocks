import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { confirmDialog } from './ConfirmDialog';

describe('confirmDialog', () => {
  it('renders the dialog with title and message, then resolves true on confirm', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = confirmDialog('All unsaved changes will be lost.', 'Reset Workspace?');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Reset Workspace?')).toBeInTheDocument();
    expect(screen.getByText('All unsaved changes will be lost.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await expect(promise).resolves.toBe(true);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('resolves false when Cancel is clicked', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = confirmDialog('This cannot be undone.', 'Delete this workspace?');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(promise).resolves.toBe(false);
  });

  it('resolves false when overlay is clicked', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = confirmDialog('Continue?', 'Confirm Action');
    await screen.findByRole('dialog');

    const overlay = document.querySelector('.confirm-dialog-overlay');
    if (!(overlay instanceof HTMLElement)) {
      throw new Error('Expected confirm dialog overlay to exist');
    }

    await user.click(overlay);

    await expect(promise).resolves.toBe(false);
  });
});
