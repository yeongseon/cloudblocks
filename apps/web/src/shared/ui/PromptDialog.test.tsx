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

    const input = screen.getByRole('textbox', { name: 'Rename' });
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

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    const input = screen.getByRole('textbox', { name: 'Rename' });
    await user.clear(input);
    await user.type(input, 'Web Server{Enter}');

    await expect(promise).resolves.toBe('Web Server');
  });

  it('resolves null when Escape is pressed on input', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    const input = screen.getByRole('textbox', { name: 'Rename' });
    await user.click(input);
    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBeNull();
  });

  it('resolves null when Escape is pressed on a button', async () => {
    render(<div />);
    const user = userEvent.setup();

    const promise = promptDialog('Rename block:', 'Rename', 'App VM');
    await screen.findByRole('dialog');

    await user.tab();
    await user.keyboard('{Escape}');

    await expect(promise).resolves.toBeNull();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('focuses and selects the input on open', async () => {
    render(<div />);

    promptDialog('Enter name:', 'Rename', 'Default');
    await screen.findByRole('dialog');

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: 'Rename' });
      expect(input).toHaveFocus();
    });
  });

  it('input has an accessible label', async () => {
    render(<div />);

    promptDialog('Workspace name:', 'New Workspace', 'Untitled');
    await screen.findByRole('dialog');

    const input = screen.getByRole('textbox', { name: 'New Workspace' });
    expect(input).toBeInTheDocument();
  });

  it('uses settle path when replacing an in-flight dialog', async () => {
    render(<div />);

    const first = promptDialog('First name:', 'First');
    await screen.findByRole('dialog');

    const second = promptDialog('Second name:', 'Second');

    await expect(first).resolves.toBeNull();

    await waitFor(() => {
      expect(screen.getByText('Second name:')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: 'Second' });
    await user.clear(input);
    await user.type(input, 'value');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await expect(second).resolves.toBe('value');
  });
});
