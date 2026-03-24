import { describe, it, expect, vi } from 'vitest';
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

  it('resolves false when Escape is pressed', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = confirmDialog('Discard changes?', 'Confirm');
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBe(false);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('focuses the Cancel button when the dialog opens', async () => {
    render(<div />);

    confirmDialog('Are you sure?', 'Confirm');
    await screen.findByRole('dialog');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
  });

  it('uses settle path when replacing an in-flight dialog', async () => {
    render(<div />);

    const first = confirmDialog('First?', 'First');
    await screen.findByRole('dialog');

    const second = confirmDialog('Second?', 'Second');

    await expect(first).resolves.toBe(false);

    await waitFor(() => {
      expect(screen.getByText('Second?')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect(second).resolves.toBe(true);
  });

  it('resolves false when dialog root cannot be created', async () => {
    vi.resetModules();
    vi.doMock('react-dom/client', () => ({
      createRoot: () => null,
    }));

    try {
      const module = await import('./ConfirmDialog');
      await expect(module.confirmDialog('Fail closed?', 'Confirm')).resolves.toBe(false);
    } finally {
      vi.doUnmock('react-dom/client');
      vi.resetModules();
    }
  });
});
