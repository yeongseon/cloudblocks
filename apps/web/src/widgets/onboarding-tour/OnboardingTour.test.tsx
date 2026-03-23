import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingTour } from './OnboardingTour';
import { useUIStore } from '../../entities/store/uiStore';

const STORAGE_KEY = 'cloudblocks:onboarding-completed';
const PERSONA_STORAGE_KEY = 'cloudblocks:persona';

let targetElements: HTMLElement[] = [];

function createTargetElements() {
  const selectors = [
    'empty-canvas-overlay',
    'sidebar-palette',
    'scene-canvas',
    'right-drawer',
    'menu-bar-nav',
    'builder-canvas',
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
    // Set persona so existing tour tests bypass PersonaSelection screen
    localStorage.setItem(PERSONA_STORAGE_KEY, 'devops');
    useUIStore.setState({
      showOnboarding: false,
      persona: 'devops' as const,
      complexityLevel: 'advanced' as const,
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
    localStorage.removeItem(PERSONA_STORAGE_KEY);
    useUIStore.setState({ showOnboarding: !localStorage.getItem(STORAGE_KEY), persona: null });

    render(<OnboardingTour />);

    expect(screen.getByTestId('persona-selection')).toBeInTheDocument();
  });

  it('does not show onboarding when onboarding-completed key exists', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    useUIStore.setState({ showOnboarding: !localStorage.getItem(STORAGE_KEY) });

    render(<OnboardingTour />);

    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    expect(screen.queryByTestId('persona-selection')).not.toBeInTheDocument();
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

    expect(screen.getByText('Resource Palette')).toBeInTheDocument();
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

    for (let i = 0; i < 4; i++) {
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

    for (let i = 0; i < 4; i++) {
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

  it('shows step 3 content: Canvas', async () => {
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

    expect(screen.getByText('Canvas')).toBeInTheDocument();
  });

  it('shows step 5 content: Menu Bar', async () => {
    useUIStore.setState({ showOnboarding: true });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
    }

    expect(screen.getByText('Menu Bar')).toBeInTheDocument();
  });

  it('shows right drawer step content', async () => {
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

    expect(screen.getByText('Right Drawer')).toBeInTheDocument();
  });

  it('ensure visible opens sidebar for palette step', async () => {
    useUIStore.setState({ showOnboarding: true, sidebar: { isOpen: false } });
    render(<OnboardingTour />);

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    fireEvent.click(screen.getByText('Next'));
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(useUIStore.getState().sidebar.isOpen).toBe(true);
  });

  it('shows persona selection when no persona is saved', async () => {
    localStorage.removeItem(PERSONA_STORAGE_KEY);
    useUIStore.setState({ showOnboarding: true, persona: null });
    render(<OnboardingTour />);

    expect(screen.getByTestId('persona-selection')).toBeInTheDocument();
    expect(screen.getByText('What best describes you?')).toBeInTheDocument();
    expect(screen.getByTestId('persona-card-devops')).toBeInTheDocument();
    expect(screen.getByTestId('persona-card-backend')).toBeInTheDocument();
    expect(screen.getByTestId('persona-card-pm')).toBeInTheDocument();
    expect(screen.getByTestId('persona-card-student')).toBeInTheDocument();
  });

  it('clicking persona card sets store and localStorage', async () => {
    localStorage.removeItem(PERSONA_STORAGE_KEY);
    useUIStore.setState({ showOnboarding: true, persona: null });
    render(<OnboardingTour />);

    fireEvent.click(screen.getByTestId('persona-card-backend'));

    expect(localStorage.getItem(PERSONA_STORAGE_KEY)).toBe('backend');
    expect(useUIStore.getState().persona).toBe('backend');
  });

  it('after persona selected, tour proceeds to step 1', async () => {
    localStorage.removeItem(PERSONA_STORAGE_KEY);
    useUIStore.setState({ showOnboarding: true, persona: null });
    render(<OnboardingTour />);

    expect(screen.getByTestId('persona-selection')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('persona-card-devops'));

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(screen.queryByTestId('persona-selection')).not.toBeInTheDocument();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
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
    expect(screen.getByText('Welcome to CloudBlocks!')).toBeInTheDocument();
  });
});
