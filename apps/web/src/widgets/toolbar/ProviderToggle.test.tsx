import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useUIStore } from '../../entities/store/uiStore';
import { ProviderToggle } from './ProviderToggle';

const originalSetActiveProvider = useUIStore.getState().setActiveProvider;

describe('ProviderToggle', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeProvider: 'azure',
      interactionState: 'idle',
      setActiveProvider: originalSetActiveProvider,
    });
  });

  it('renders Azure, AWS, and GCP tabs', () => {
    render(<ProviderToggle />);

    expect(screen.getByRole('tab', { name: 'Azure' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AWS' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GCP' })).toBeInTheDocument();
  });

  it('clicking a provider tab calls setActiveProvider with provider id', async () => {
    const user = userEvent.setup();
    const setActiveProvider = vi.fn();
    useUIStore.setState({
      activeProvider: 'azure',
      interactionState: 'idle',
      setActiveProvider,
    });

    render(<ProviderToggle />);
    await user.click(screen.getByRole('tab', { name: 'AWS' }));

    expect(setActiveProvider).toHaveBeenCalledWith('aws');
  });

  it('applies active styling to the currently selected provider tab', async () => {
    const user = userEvent.setup();
    render(<ProviderToggle />);

    const azureTab = screen.getByRole('tab', { name: 'Azure' });
    const gcpTab = screen.getByRole('tab', { name: 'GCP' });

    expect(azureTab).toHaveClass('is-active');
    expect(azureTab).toHaveAttribute('aria-selected', 'true');
    expect(gcpTab).not.toHaveClass('is-active');

    await user.click(gcpTab);

    expect(gcpTab).toHaveClass('is-active');
    expect(gcpTab).toHaveAttribute('aria-selected', 'true');
    expect(azureTab).not.toHaveClass('is-active');
  });
});
