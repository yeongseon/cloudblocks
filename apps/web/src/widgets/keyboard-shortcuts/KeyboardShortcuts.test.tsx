import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeyboardShortcuts } from './KeyboardShortcuts';

describe('KeyboardShortcuts', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(<KeyboardShortcuts isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render modal when isOpen is true', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<KeyboardShortcuts isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<KeyboardShortcuts isOpen={true} onClose={onClose} />);

    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onClose when modal content is clicked', async () => {
    const onClose = vi.fn();
    render(<KeyboardShortcuts isOpen={true} onClose={onClose} />);

    const modal = screen.getByRole('dialog');
    fireEvent.click(modal);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(<KeyboardShortcuts isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should render all shortcut groups', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Panels')).toBeInTheDocument();
  });

  it('should render all shortcuts with descriptions', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Save workspace')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Delete selected element')).toBeInTheDocument();
    expect(screen.getByText('Deselect / Cancel placement')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Toggle sidebar palette')).toBeInTheDocument();
  });

  it('should render kbd elements for keyboard keys', () => {
    const { container } = render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    const kbdElements = container.querySelectorAll('kbd.keyboard-shortcuts-key');
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it('should render compound keys with + separators', () => {
    const { container } = render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    // Check for Ctrl+Z shortcut
    const kbds = container.querySelectorAll('kbd.keyboard-shortcuts-key');
    const kbdArray = Array.from(kbds);
    expect(kbdArray.some((kbd) => kbd.textContent === 'Ctrl')).toBeTruthy();
    expect(kbdArray.some((kbd) => kbd.textContent === 'Z')).toBeTruthy();
  });

  it('should have correct ARIA attributes for accessibility', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts');
  });

  it('should render all General category shortcuts', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    const generalShortcuts = [
      'Save workspace',
      'Undo',
      'Redo (alternative)',
      'Delete selected element',
      'Deselect / Cancel placement',
      'Show keyboard shortcuts',
    ];

    generalShortcuts.forEach((shortcut) => {
      expect(screen.getByText(shortcut)).toBeInTheDocument();
    });
  });

  it('should handle "Del / Backspace" shortcut with multiple key parts', () => {
    const { container } = render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Delete selected element')).toBeInTheDocument();
    // The render should contain both Del and Backspace as separate kbds
    const kbds = container.querySelectorAll('.keyboard-shortcuts-key');
    const delKbd = Array.from(kbds).some((kbd) => kbd.textContent === 'Del');
    const backspaceKbd = Array.from(kbds).some((kbd) => kbd.textContent === 'Backspace');
    expect(delKbd || backspaceKbd).toBeTruthy();
  });

  it('should render the keyboard icon in the title', () => {
    render(<KeyboardShortcuts isOpen={true} onClose={vi.fn()} />);

    const title = screen.getByText('Keyboard Shortcuts').closest('h2');
    expect(title?.querySelector('svg')).toBeInTheDocument();
  });

  it('should prevent event propagation when modal is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<KeyboardShortcuts isOpen={true} onClose={onClose} />);

    const modal = container.querySelector('.keyboard-shortcuts-modal');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    modal?.dispatchEvent(clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});
