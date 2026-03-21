import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlockSvg } from './BlockSvg';

describe('BlockSvg', () => {
  it('renders without provider badge when provider is not set', () => {
    const { container } = render(<BlockSvg category="compute" />);

    expect(container.querySelector('[data-testid="provider-badge"]')).toBeNull();
  });

  it('renders provider badge with Az label for azure', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    const badge = container.querySelector('[data-testid="provider-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.querySelector('text')?.textContent).toBe('Az');
  });

  it('renders provider badge with AW label for aws', () => {
    const { container } = render(<BlockSvg category="compute" provider="aws" />);

    const badge = container.querySelector('[data-testid="provider-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.querySelector('text')?.textContent).toBe('AW');
  });

  it('renders provider badge with GC label for gcp', () => {
    const { container } = render(<BlockSvg category="compute" provider="gcp" />);

    const badge = container.querySelector('[data-testid="provider-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.querySelector('text')?.textContent).toBe('GC');
  });
});
