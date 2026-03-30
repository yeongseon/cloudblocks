import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlockSvg } from './BlockSvg';

describe('BlockSvg', () => {
  it('renders an SVG element for compute category', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG element without provider', () => {
    const { container } = render(<BlockSvg category="compute" />);

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('does not render port dots group (port dots removed)', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    expect(container.querySelector('[data-testid="port-dots"]')).toBeNull();
  });
});
