import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { PlateSvg } from './PlateSvg';
import type { StudColorSpec } from '../../shared/types/index';

const studColors: StudColorSpec = {
  main: '#66BB6A',
  shadow: '#2E7D32',
  highlight: '#A5D6A7',
};

function renderPlateSvg(props?: Partial<ComponentProps<typeof PlateSvg>>) {
  return render(
    <PlateSvg
      studsX={4}
      studsY={6}
      worldHeight={0.5}
      studColors={studColors}
      topFaceColor="#22C55E"
      topFaceStroke="#4ADE80"
      leftSideColor="#16A34A"
      rightSideColor="#15803D"
      {...props}
    />,
  );
}

describe('PlateSvg', () => {
  it('renders both label and emoji text when both props are provided', () => {
    renderPlateSvg({ label: 'Public Subnet', emoji: '🌐' });

    expect(screen.getByText('Public Subnet')).toBeInTheDocument();
    expect(screen.getByText('🌐')).toBeInTheDocument();
  });

  it('renders label text and omits emoji text when only label is provided', () => {
    renderPlateSvg({ label: 'Private Subnet' });

    expect(screen.getByText('Private Subnet')).toBeInTheDocument();
    expect(screen.queryByText('🌐')).not.toBeInTheDocument();
  });

  it('renders emoji text and omits label text when only emoji is provided', () => {
    renderPlateSvg({ emoji: '🔒' });

    expect(screen.getByText('🔒')).toBeInTheDocument();
    expect(screen.queryByText('Public Subnet')).not.toBeInTheDocument();
  });

  it('renders no label or emoji text when neither prop is provided', () => {
    const { container } = renderPlateSvg();

    expect(container.querySelectorAll('text')).toHaveLength(0);
  });
});
