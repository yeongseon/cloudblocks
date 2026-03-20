import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { promptDialog } from './PromptDialog';

describe('promptDialog', () => {
  it('renders the dialog with title, message, and input, then resolves value on OK', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename plate:', 'Rename', 'My VNet');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Rename plate:')).toBeInTheDocument();

    const input = document.querySelector<HTMLInputElement>('.prompt-dialog-input');
    expect(input).toBeInTheDocument();
    expect(input?.value).toBe('My VNet');

    await user.clear(input!);
    await user.type(input!, 'New Name');

    await user.click(screen.getByRole('button', { name: 'OK' }));

    await expect(promise).resolves.toBe('New Name');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('resolves null when Cancel is clicked', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Enter name:', 'Rename');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(promise).resolves.toBeNull();
  });

  it('resolves null when overlay is clicked', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Enter name:', 'Rename');
    await screen.findByRole('dialog');

    const overlay = document.querySelector('.confirm-dialog-overlay');
    if (!(overlay instanceof HTMLElement)) {
      throw new Error('Expected dialog overlay to exist');
    }

    await user.click(overlay);

    await expect(promise).resolves.toBeNull();
  });

  it('resolves value when Enter is pressed', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    const input = document.querySelector<HTMLInputElement>('.prompt-dialog-input');
    await user.clear(input!);
    await user.type(input!, 'Web Server{Enter}');

    await expect(promise).resolves.toBe('Web Server');
  });

  it('resolves null when Escape is pressed', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    const input = document.querySelector<HTMLInputElement>('.prompt-dialog-input');
    await user.click(input!);
    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBeNull();
  });
});
