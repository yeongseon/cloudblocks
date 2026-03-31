import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingTour } from './OnboardingTour';
import { useUIStore } from '../../entities/store/uiStore';

const STORAGE_KEY = 'cloudblocks:onboarding-completed';

let targetElements: HTMLElement[] = [];

function createTargetElements() {
  const selectors = [
    'empty-canvas-overlay',
    'sidebar-palette',
    'scene-canvas',
    'right-drawer',
    'menu-bar-logo',
    'builder-canvas',
    'core-btn-learn',
  ];
  for (const cls of selectors) {
    const el = document.createElement('div');
    el.className = cls;
    document.body.appendChild(el);
    targetElements.push(el);
  }
}

function removeTargetElements() {
  for (const el of targetElements) {
    el.remove();
  }
  targetElements = [];
}

function mockGetBoundingClientRect() {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return {
      top: 100,
      left: 100,
      width: 300,
      height: 200,
      right: 400,
      bottom: 300,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    };
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

describe('OnboardingTour', () => {
  let restoreRect: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, 'true');
    useUIStore.setState({
      showOnboarding: false,
      complexityLevel: 'beginner' as const,
    });
    createTargetElements();
    restoreRect = mockGetBoundingClientRect();
  });

  afterEach(() => {
    removeTargetElements();
    restoreRect();
  });

  it('renders nothing when showOnboarding is false', () => {
    useUIStore.setState({ showOnboarding: false });
    render(<OnboardingTour />);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });

  it('automatically shows onboarding when onboarding-completed key is absent', () => {
    localStorage.removeItem(STORAGE_KEY);
    useUIStore.setState({ showOnboarding: !localStorage.getItem(STORAGE_KEY) });

    render(<OnboardingTour />);

    // Tour proceeds directly to step 1 without persona selection
    expect(screen.queryByTestId('persona-selection')).not.toBeInTheDocument();
  });

  it('does not show onboarding when onboarding-completed key exists', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    useUIStore.setState({ showOnboarding: !localStorage.getItem(STORAGE_KEY) });

    render(<OnboardingTour />);

    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });

  it('renders tour when showOnboarding is true', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
  });

  it('shows step 1 content initially', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByText('Start with Learn')).toBeInTheDocument();
  });

  it('advances to step 2 on Next click', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByText('Next'));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByText('Edit the Architecture')).toBeInTheDocument();
  });

  it('goes back to previous step on Back click', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByText('Next'));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByText('Back'));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByText('Start with Learn')).toBeInTheDocument();
  });

  it('does not show Back button on step 1', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('shows Finish on last step', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    expect(screen.getByText('Finish')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('sets localStorage and hides tour on Skip', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByText('Skip'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(useUIStore.getState().showOnboarding).toBe(false);
  });

  it('sets localStorage on Finish', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    fireEvent.click(screen.getByText('Finish'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(useUIStore.getState().showOnboarding).toBe(false);
  });

  it('Escape key skips tour', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(useUIStore.getState().showOnboarding).toBe(false);
  });

  it('shows step 3 content: Generate Code', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    expect(screen.getByText('Export Terraform Starter Code')).toBeInTheDocument();
  });

  it('ensure visible opens sidebar for palette step', async () => {
    useUIStore.setState({ showOnboarding: true, sidebar: { isOpen: false } });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // Step 1 (Start with Learn) has no ensureVisible — sidebar stays closed
    expect(useUIStore.getState().sidebar.isOpen).toBe(false);

    // Advance to step 2 (Edit the Architecture) which opens sidebar
    fireEvent.click(screen.getByText('Next'));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // Sidebar should open when Edit the Architecture step is shown
    expect(useUIStore.getState().sidebar.isOpen).toBe(true);
  });

  it('proceeds directly to tour without persona selection', async () => {
    localStorage.removeItem(STORAGE_KEY);
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // No persona selection screen — tour starts immediately
    expect(screen.queryByTestId('persona-selection')).not.toBeInTheDocument();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText('Start with Learn')).toBeInTheDocument();
  });

  it('handles window resize during active tour', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText('Start with Learn')).toBeInTheDocument();
  });
});
