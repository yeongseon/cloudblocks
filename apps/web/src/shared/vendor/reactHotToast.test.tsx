import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Toaster, toast } from './reactHotToast';
import headlessToastDefault, { resolveValue, useToaster } from 'react-hot-toast/headless';

vi.mock('react-hot-toast/headless', () => {
  const headlessToast = {
    remove: vi.fn(),
  };

  return {
    default: headlessToast,
    toast: headlessToast,
    resolveValue: vi.fn((value: unknown) => value),
    useToaster: vi.fn(),
  };
});

function makeToast(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    visible: true,
    message: 'hello',
    className: 'toast-item',
    ariaProps: { role: 'status', 'aria-live': 'polite' },
    style: {},
    ...overrides,
  };
}

function setupToaster(toasts: Array<Record<string, unknown>>) {
  const startPause = vi.fn();
  const endPause = vi.fn();
  const calculateOffset = vi.fn(() => 24);
  const updateHeight = vi.fn();

  vi.mocked(useToaster).mockReturnValue({
    handlers: { startPause, endPause, calculateOffset, updateHeight },
    toasts: toasts as never,
  });

  return { startPause, endPause, calculateOffset, updateHeight };
}

describe('shared/vendor/reactHotToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top-center container and resolves message by default', () => {
    setupToaster([makeToast()]);

    const { container } = render(<Toaster />);

    expect(screen.getByRole('status')).toHaveTextContent('hello');
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.top).toBe('12px');
    expect(root.style.alignItems).toBe('center');
    expect(vi.mocked(resolveValue)).toHaveBeenCalled();
  });

  it('supports bottom-left layout and custom container style override', () => {
    setupToaster([makeToast()]);

    const { container } = render(
      <Toaster position="bottom-left" containerStyle={{ zIndex: 7777 }} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.bottom).toBe('12px');
    expect(root.style.alignItems).toBe('flex-start');
    expect(root.style.zIndex).toBe('7777');
  });

  it('supports top-right layout and children renderer', () => {
    setupToaster([makeToast({ id: 't-right', message: 'ignored' })]);

    render(
      <Toaster position="top-right">
        {(toastItem) => <span>custom-{toastItem.id}</span>}
      </Toaster>,
    );

    expect(screen.getByText('custom-t-right')).toBeInTheDocument();
    expect(vi.mocked(resolveValue)).not.toHaveBeenCalled();
  });

  it('starts and ends pause on container hover events', () => {
    const handlers = setupToaster([makeToast()]);

    const { container } = render(<Toaster />);
    const root = container.firstElementChild as HTMLElement;

    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);

    expect(handlers.startPause).toHaveBeenCalledOnce();
    expect(handlers.endPause).toHaveBeenCalledOnce();
    expect(handlers.calculateOffset).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), expect.any(Object));
  });

  it('removes invisible toasts on transition end and preserves visible toasts', () => {
    setupToaster([
      makeToast({ id: 'visible-toast', visible: true }),
      makeToast({ id: 'hidden-toast', visible: false }),
    ]);

    const { container } = render(<Toaster toasterId="alpha" />);
    const nodes = container.querySelectorAll('.toast-item');

    fireEvent.transitionEnd(nodes[0]);
    fireEvent.transitionEnd(nodes[1]);

    expect((headlessToastDefault as unknown as { remove: ReturnType<typeof vi.fn> }).remove).toHaveBeenCalledTimes(1);
    expect((headlessToastDefault as unknown as { remove: ReturnType<typeof vi.fn> }).remove).toHaveBeenCalledWith('hidden-toast', 'alpha');
  });

  it('re-exports toast and default headless toast instance', () => {
    expect(toast).toBe(headlessToastDefault);
  });
});
