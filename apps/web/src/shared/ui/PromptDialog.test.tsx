import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { promptDialog } from './PromptDialog';

describe('promptDialog', () => {
  it('renders the dialog with title, message, and input, then resolves value on OK', async () => {
    render(<div />);
    const user = userEvent.setup();

    const message = 'Rename plate:';
    const promise = promptDialog(message, 'Rename', 'My VNet');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: message });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('My VNet');

    await user.clear(input);
    await user.type(input, 'New Name');

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

    const message = 'Rename block:';
    const promise = promptDialog(message, 'Rename', 'App VM');
    await screen.findByRole('dialog');

    const input = screen.getByRole('textbox', { name: message });
    await user.clear(input);
    await user.type(input, 'Web Server{Enter}');

    await expect(promise).resolves.toBe('Web Server');
  });

  it('resolves null when Escape is pressed from anywhere in dialog', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBeNull();
  });

  it('exposes input accessible name from message', async () => {
    render(<div />);

    const message = 'Enter workspace name:';
    promptDialog(message, 'Rename workspace', 'Main Workspace');

    expect(await screen.findByRole('textbox', { name: message })).toBeInTheDocument();
  });

  it('settles existing prompt before rendering a new one', async () => {
    render(<div />);
    const user = userEvent.setup();

    const firstPromise = promptDialog('First prompt', 'Rename', 'One');
    await screen.findByText('First prompt');

    const secondPromise = promptDialog('Second prompt', 'Rename', 'Two');
    const secondInput = await screen.findByRole('textbox', { name: 'Second prompt' });

    await expect(firstPromise).resolves.toBeNull();
    expect(screen.queryByText('First prompt')).not.toBeInTheDocument();

    await user.clear(secondInput);
    await user.type(secondInput, 'Updated Two');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await expect(secondPromise).resolves.toBe('Updated Two');
  });
});
