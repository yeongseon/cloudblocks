import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { BlockSvg } from '../BlockSvg';
import { getBlockFaceColors } from '../blockFaceColors';

describe('BlockSvg provider colors', () => {
  it('renders provider-specific face colors when provider is supplied', () => {
    const category = 'compute';
    const provider = 'aws';
    const expected = getBlockFaceColors(category, provider);

    const { container } = render(<BlockSvg category={category} provider={provider} />);
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0]).toHaveAttribute('fill', expected.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', expected.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', expected.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', expected.rightSideColor);
  });

  it('falls back to azure palette when provider is omitted', () => {
    const category = 'storage';
    const expectedAzure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} />);
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0]).toHaveAttribute('fill', expectedAzure.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', expectedAzure.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', expectedAzure.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', expectedAzure.rightSideColor);
  });

  it('keeps legacy blocks without provider visually azure by default', () => {
    const category = 'database';
    const azure = getBlockFaceColors(category, 'azure');

    const { container } = render(<BlockSvg category={category} provider={undefined} />);
    const polygons = container.querySelectorAll('polygon');

    expect(polygons[0]).toHaveAttribute('fill', azure.topFaceColor);
    expect(polygons[0]).toHaveAttribute('stroke', azure.topFaceStroke);
    expect(polygons[1]).toHaveAttribute('fill', azure.leftSideColor);
    expect(polygons[2]).toHaveAttribute('fill', azure.rightSideColor);
  });
});
