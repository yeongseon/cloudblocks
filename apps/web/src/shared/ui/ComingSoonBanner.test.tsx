import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComingSoonBanner } from './ComingSoonBanner';

describe('ComingSoonBanner', () => {
  it('renders the message text', () => {
    render(<ComingSoonBanner message="Feature X is under development." />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Feature X is under development.',
    );
  });

  it('applies the base CSS class', () => {
    render(<ComingSoonBanner message="Not yet available." />);

    expect(screen.getByRole('status')).toHaveClass('coming-soon-banner');
  });

  it('appends a custom className when provided', () => {
    render(
      <ComingSoonBanner message="Coming soon." className="ai-coming-soon" />,
    );

    const el = screen.getByRole('status');
    expect(el).toHaveClass('coming-soon-banner');
    expect(el).toHaveClass('ai-coming-soon');
  });

  it('does not append extra class when className is omitted', () => {
    render(<ComingSoonBanner message="Test" />);

    expect(screen.getByRole('status').className).toBe('coming-soon-banner');
  });
});
