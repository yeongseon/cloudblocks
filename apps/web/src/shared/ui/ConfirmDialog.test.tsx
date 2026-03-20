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

  it('focuses Cancel button when opened', async () => {
    render(<div />);

    confirmDialog('Keep editing?', 'Discard draft?');
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('resolves false when Escape is pressed', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = confirmDialog('Keep editing?', 'Discard draft?');
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBe(false);
  });

  it('settles existing dialog before rendering a new one', async () => {
    render(<div />);
    const user = userEvent.setup();

    const firstPromise = confirmDialog('First message', 'First title');
    await screen.findByText('First message');

    const secondPromise = confirmDialog('Second message', 'Second title');
    await screen.findByText('Second message');

    await expect(firstPromise).resolves.toBe(false);
    expect(screen.queryByText('First message')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect(secondPromise).resolves.toBe(true);
  });
});
