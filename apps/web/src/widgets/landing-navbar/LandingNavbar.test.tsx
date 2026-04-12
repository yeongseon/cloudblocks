import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../entities/store/uiStore';
import { LandingNavbar } from './LandingNavbar';

vi.mock('./LandingNavbar.css', () => ({}));

describe('LandingNavbar', () => {
  beforeEach(() => {
    useUIStore.setState({ goToBuilder: vi.fn() });
  });

  it('renders logo and routes to builder on CTA click', async () => {
    const user = userEvent.setup();
    const goToBuilder = vi.fn();
    useUIStore.setState({ goToBuilder });

    render(<LandingNavbar />);

    expect(screen.getByText('CloudBlocks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(goToBuilder).toHaveBeenCalledOnce();
  });
});
