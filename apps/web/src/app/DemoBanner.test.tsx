import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoBanner } from './DemoBanner';

const DEMO_BANNER_DISMISSED_KEY = 'cloudblocks:demo-banner-dismissed';

describe('DemoBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset env var to simulated unset state
    delete (import.meta.env as Record<string, unknown>).VITE_API_URL;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows banner when VITE_API_URL is empty and not dismissed', () => {
    // Simulate unset VITE_API_URL by setting it to empty string
    (import.meta.env as Record<string, unknown>).VITE_API_URL = '';

    render(<DemoBanner />);

    expect(screen.getByText(/Demo Mode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('does not show banner when VITE_API_URL is set', () => {
    // Simulate configured API URL
    (import.meta.env as Record<string, unknown>).VITE_API_URL = 'https://api.example.com';

    render(<DemoBanner />);

    expect(screen.queryByText(/Demo Mode/)).not.toBeInTheDocument();
  });

  it('does not show banner when already dismissed', () => {
    localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, 'true');
    (import.meta.env as Record<string, unknown>).VITE_API_URL = '';

    render(<DemoBanner />);

    expect(screen.queryByText(/Demo Mode/)).not.toBeInTheDocument();
  });

  it('hides banner and persists dismiss state when dismiss button clicked', async () => {
    (import.meta.env as Record<string, unknown>).VITE_API_URL = '';

    const { rerender } = render(<DemoBanner />);

    expect(screen.getByText(/Demo Mode/)).toBeInTheDocument();

    // Click dismiss button
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(dismissButton);

    // Banner should be hidden immediately
    await waitFor(() => {
      expect(screen.queryByText(/Demo Mode/)).not.toBeInTheDocument();
    });

    // Verify localStorage was updated
    expect(localStorage.getItem(DEMO_BANNER_DISMISSED_KEY)).toBe('true');

    // Re-render to simulate page reload — banner should still be hidden
    rerender(<DemoBanner />);
    expect(screen.queryByText(/Demo Mode/)).not.toBeInTheDocument();
  });

  it('displays correct demo mode message text', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_URL = '';

    render(<DemoBanner />);

    const messageElement = screen.getByText(
      /Visual builder, code generation, and templates work instantly/,
    );
    expect(messageElement).toBeInTheDocument();
    expect(messageElement.textContent).toContain('AI and GitHub features require a backend');
  });

  it('renders dismiss button with accessible text', () => {
    (import.meta.env as Record<string, unknown>).VITE_API_URL = '';

    render(<DemoBanner />);

    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismissButton).toBeInTheDocument();
  });
});
