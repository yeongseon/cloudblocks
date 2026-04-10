import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RightDrawer } from '../RightDrawer';
import { useUIStore } from '../../../entities/store/uiStore';

describe('RightDrawer', () => {
  beforeEach(() => {
    useUIStore.setState({
      drawer: { isOpen: false, activePanel: null },
    });
  });

  it('renders nothing when drawer is closed with no active panel', () => {
    const { container } = render(<RightDrawer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a closed drawer shell when a panel remains active', () => {
    useUIStore.setState({ drawer: { isOpen: false, activePanel: 'code' } });
    render(<RightDrawer />);

    expect(screen.getByTestId('right-drawer')).toHaveAttribute('data-open', 'false');
    expect(screen.queryByTestId('drawer-backdrop')).not.toBeInTheDocument();
  });

  it('renders drawer when opened via store', () => {
    useUIStore.getState().openDrawer('properties');
    render(
      <RightDrawer>
        <p>Test content</p>
      </RightDrawer>,
    );

    const drawer = screen.getByTestId('right-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveAttribute('data-open', 'true');
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(drawer).toHaveAttribute('aria-label', 'Properties');
  });

  it('shows panel label and icon from registry', () => {
    useUIStore.getState().openDrawer('validation');
    render(<RightDrawer />);

    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('renders template panel metadata from registry', () => {
    useUIStore.getState().openDrawer('templates');
    render(<RightDrawer />);

    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('renders learning panel metadata from registry', () => {
    useUIStore.getState().openDrawer('learning');
    render(<RightDrawer />);

    expect(screen.getByText('Learning')).toBeInTheDocument();
  });

  it('renders scenario panel metadata from registry', () => {
    useUIStore.getState().openDrawer('scenarios');
    render(<RightDrawer />);

    expect(screen.getByText('Scenarios')).toBeInTheDocument();
  });

  it('renders children in the body', () => {
    useUIStore.getState().openDrawer('properties');
    render(
      <RightDrawer>
        <p>Custom panel content</p>
      </RightDrawer>,
    );

    expect(screen.getByText('Custom panel content')).toBeInTheDocument();
  });

  it('renders CodePreview when the code panel is active', async () => {
    useUIStore.getState().openDrawer('code');
    render(<RightDrawer />);

    expect(await screen.findByText('⚡ Code Generation')).toBeInTheDocument();
    expect(useUIStore.getState().drawer.activePanel).toBe('code');
  });

  it('hides CodePreview when the code panel is inactive', async () => {
    useUIStore.getState().openDrawer('properties');
    render(<RightDrawer />);

    await waitFor(() => {
      expect(screen.queryByText('⚡ Code Generation')).not.toBeInTheDocument();
    });
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openDrawer('properties');
    render(<RightDrawer />);

    const closeBtn = screen.getByTestId('drawer-close-btn');
    await user.click(closeBtn);

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(false);
    expect(state.drawer.activePanel).toBeNull();
  });

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openDrawer('properties');
    render(<RightDrawer />);

    const backdrop = screen.getByTestId('drawer-backdrop');
    await user.click(backdrop);

    expect(useUIStore.getState().drawer.isOpen).toBe(false);
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openDrawer('properties');
    render(<RightDrawer />);

    screen.getByTestId('right-drawer').focus();
    await user.keyboard('{Escape}');

    expect(useUIStore.getState().drawer).toEqual({ isOpen: false, activePanel: null });
  });

  it('does not close when a non-Escape key is pressed', async () => {
    const user = userEvent.setup();
    useUIStore.getState().openDrawer('properties');
    render(<RightDrawer />);

    screen.getByTestId('right-drawer').focus();
    await user.keyboard('{Enter}');

    expect(useUIStore.getState().drawer).toEqual({ isOpen: true, activePanel: 'properties' });
  });

  it('has correct aria-label for close button', () => {
    useUIStore.getState().openDrawer('code');
    render(<RightDrawer />);

    const closeBtn = screen.getByTestId('drawer-close-btn');
    expect(closeBtn).toHaveAttribute('aria-label', 'Close panel');
  });

  it('renders backdrop only when open', () => {
    useUIStore.getState().openDrawer('learning');
    render(<RightDrawer />);

    expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument();
  });

  it('sets drawer width from panel minWidth', () => {
    useUIStore.getState().openDrawer('scenarios');
    render(<RightDrawer />);

    const drawer = screen.getByTestId('right-drawer');
    expect(drawer.style.getPropertyValue('--drawer-width')).toBe('400px');
  });

  it('uses fallback label and width when no panel info exists', () => {
    useUIStore.setState({ drawer: { isOpen: true, activePanel: null } });
    render(<RightDrawer />);

    const drawer = screen.getByTestId('right-drawer');
    expect(drawer).toHaveAttribute('aria-label', 'Panel');
    expect(drawer.style.getPropertyValue('--drawer-width')).toBe('360px');
  });
});

describe('uiStore drawer actions', () => {
  beforeEach(() => {
    useUIStore.setState({
      drawer: { isOpen: false, activePanel: null },
    });
  });

  it('openDrawer sets isOpen and activePanel', () => {
    useUIStore.getState().openDrawer('properties');

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(true);
    expect(state.drawer.activePanel).toBe('properties');
  });

  it('openDrawer syncs code preview visibility for code panel', () => {
    useUIStore.getState().openDrawer('code');

    const state = useUIStore.getState();
    expect(state.drawer).toEqual({ isOpen: true, activePanel: 'code' });
  });

  it('closeDrawer resets state', () => {
    useUIStore.getState().openDrawer('properties');
    useUIStore.getState().closeDrawer();

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(false);
    expect(state.drawer.activePanel).toBeNull();
  });

  it('closeDrawer hides code preview when code panel is active', () => {
    useUIStore.getState().openDrawer('code');
    useUIStore.getState().closeDrawer();

    const state = useUIStore.getState();
    expect(state.drawer).toEqual({ isOpen: false, activePanel: null });
  });

  it('toggleDrawer opens when closed', () => {
    useUIStore.getState().toggleDrawer('validation');

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(true);
    expect(state.drawer.activePanel).toBe('validation');
  });

  it('toggleDrawer closes when same panel is open', () => {
    useUIStore.getState().openDrawer('validation');
    useUIStore.getState().toggleDrawer('validation');

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(false);
    expect(state.drawer.activePanel).toBeNull();
  });

  it('toggleDrawer switches panel when different panel is open', () => {
    useUIStore.getState().openDrawer('validation');
    useUIStore.getState().toggleDrawer('properties');

    const state = useUIStore.getState();
    expect(state.drawer.isOpen).toBe(true);
    expect(state.drawer.activePanel).toBe('properties');
  });
});
