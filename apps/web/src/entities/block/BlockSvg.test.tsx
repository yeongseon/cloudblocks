import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlockSvg } from './BlockSvg';

describe('BlockSvg', () => {
  it('does not render provider badge in single-provider mode', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    expect(container.querySelector('[data-testid="provider-badge"]')).toBeNull();
  });

  it('does not render provider badge for aws', () => {
    const { container } = render(<BlockSvg category="compute" provider="aws" />);

    expect(container.querySelector('[data-testid="provider-badge"]')).toBeNull();
  });

  it('does not render provider badge for gcp', () => {
    const { container } = render(<BlockSvg category="compute" provider="gcp" />);

    expect(container.querySelector('[data-testid="provider-badge"]')).toBeNull();
  });

  it('renders without provider badge when provider is not set', () => {
    const { container } = render(<BlockSvg category="compute" />);

    expect(container.querySelector('[data-testid="provider-badge"]')).toBeNull();
  });
});
