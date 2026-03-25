import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobilePaletteSheet } from './MobilePaletteSheet';

// Mock SidebarPalette to avoid store dependencies
vi.mock('../sidebar-palette', () => ({
  SidebarPalette: () => <div data-testid="sidebar-palette">Palette Content</div>,
}));

describe('MobilePaletteSheet', () => {
  it('should not be visible when isOpen is false', () => {
    const { container } = render(<MobilePaletteSheet isOpen={false} onClose={vi.fn()} />);

    const backdrop = container.querySelector('.mobile-palette-backdrop');
    expect(backdrop).toHaveAttribute('data-open', 'false');

    const sheet = container.querySelector('.mobile-palette-sheet');
    expect(sheet).toHaveAttribute('data-open', 'false');
  });

  it('should be visible when isOpen is true', () => {
    render(<MobilePaletteSheet isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Block palette' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Add Block')).toBeInTheDocument();
  });

  it('should render SidebarPalette inside the sheet', () => {
    render(<MobilePaletteSheet isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('sidebar-palette')).toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<MobilePaletteSheet isOpen={true} onClose={onClose} />);

    const backdrop = container.querySelector('.mobile-palette-backdrop');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MobilePaletteSheet isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close palette' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should lock body scroll when open', () => {
    const { unmount } = render(<MobilePaletteSheet isOpen={true} onClose={vi.fn()} />);

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('should have correct ARIA attributes', () => {
    render(<MobilePaletteSheet isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Block palette');
  });
});
