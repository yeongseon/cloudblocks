import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileGuard } from './MobileGuard';

const MOBILE_BANNER_KEY = 'cloudblocks:mobile-banner-dismissed';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(max-width: 768px)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe('MobileGuard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders banner on mobile viewports', () => {
    mockMatchMedia(true);

    render(<MobileGuard />);

    expect(screen.getByText(/small screen/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('does not render on desktop viewports', () => {
    mockMatchMedia(false);

    render(<MobileGuard />);

    expect(screen.queryByText(/small screen/)).not.toBeInTheDocument();
  });

  it('dismiss button hides banner and sets localStorage', () => {
    mockMatchMedia(true);

    render(<MobileGuard />);

    expect(screen.getByText(/small screen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText(/small screen/)).not.toBeInTheDocument();
    expect(localStorage.getItem(MOBILE_BANNER_KEY)).toBe('true');
  });

  it('does not render if previously dismissed', () => {
    mockMatchMedia(true);
    localStorage.setItem(MOBILE_BANNER_KEY, 'true');

    render(<MobileGuard />);

    expect(screen.queryByText(/small screen/)).not.toBeInTheDocument();
  });

  it('displays correct guidance text', () => {
    mockMatchMedia(true);

    render(<MobileGuard />);

    const text = screen.getByText(/small screen/);
    expect(text.textContent).toContain('browse architectures and templates');
  });
});
