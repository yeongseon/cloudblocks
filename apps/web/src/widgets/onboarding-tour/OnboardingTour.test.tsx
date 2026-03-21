import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingTour } from './OnboardingTour';
import { useUIStore } from '../../entities/store/uiStore';

const STORAGE_KEY = 'cloudblocks:onboarding-completed';

let targetElements: HTMLElement[] = [];

function createTargetElements() {
  const selectors = [
    'empty-canvas-overlay',
    'command-card',
    'resource-bar',
    'menu-bar-nav',
    'scene-canvas',
    'bottom-panel-minimap',
    'bottom-panel-detail',
    'validation-panel',
    'bottom-panel',
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
    useUIStore.setState({ showOnboarding: false });
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

    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
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

    expect(screen.getByText('Command Panel')).toBeInTheDocument();
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

    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
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

    for (let i = 0; i < 6; i++) {
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

    for (let i = 0; i < 6; i++) {
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

  it('shows step 4 content: Minimap', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    expect(screen.getByText('Minimap')).toBeInTheDocument();
  });

  it('shows step 7 content: Menu Bar', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    expect(screen.getByText('Menu Bar')).toBeInTheDocument();
  });
});
