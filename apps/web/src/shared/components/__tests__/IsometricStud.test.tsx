import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { StudDefs, StudGrid } from '../IsometricStud';
import {
  STUD_HEIGHT,
  STUD_INNER_OPACITY,
  STUD_INNER_RX,
  STUD_INNER_RY,
  STUD_RX,
  STUD_RY,
} from '../../tokens/designTokens';

describe('IsometricStud - StudDefs', () => {
  it('renders inside defs element with correct structure', () => {
    const { container } = render(
      <svg aria-label="stud-basic">
        <title>Stud Basic</title>
        <StudDefs
          studId="stud-basic"
          studColors={{ shadow: '#333', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const defs = container.querySelector('defs');
    expect(defs).toBeInTheDocument();

    const group = defs?.querySelector('g');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('id', 'stud-basic');
  });

  it('renders exactly 3 ellipses for shadow + main + inner ring', () => {
    const { container } = render(
      <svg aria-label="stud-three-layer">
        <title>Stud Three Layer</title>
        <StudDefs
          studId="stud-three-layer"
          studColors={{ shadow: '#000', main: '#ccc', highlight: '#fff' }}
        />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses).toHaveLength(3);
  });

  it('renders shadow ellipse with correct dimensions and offset', () => {
    const { container } = render(
      <svg aria-label="stud-shadow">
        <title>Stud Shadow</title>
        <StudDefs
          studId="stud-shadow"
          studColors={{ shadow: '#333', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    const shadowEllipse = ellipses[0];

    expect(shadowEllipse).toHaveAttribute('cx', '0');
    expect(shadowEllipse).toHaveAttribute('cy', String(STUD_HEIGHT));
    expect(shadowEllipse).toHaveAttribute('rx', String(STUD_RX));
    expect(shadowEllipse).toHaveAttribute('ry', String(STUD_RY));
    expect(shadowEllipse).toHaveAttribute('fill', '#333');
  });

  it('shadow ellipse has cy matching STUD_HEIGHT constant (5)', () => {
    const { container } = render(
      <svg aria-label="stud-height">
        <title>Stud Height Check</title>
        <StudDefs
          studId="stud-height-check"
          studColors={{ shadow: '#000', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const shadowEllipse = container.querySelector('ellipse');
    expect(shadowEllipse).toHaveAttribute('cy', '5');
    expect(STUD_HEIGHT).toBe(5);
  });

  it('renders main ellipse with correct dimensions and no vertical offset', () => {
    const { container } = render(
      <svg aria-label="stud-main">
        <title>Stud Main</title>
        <StudDefs
          studId="stud-main"
          studColors={{ shadow: '#333', main: '#888', highlight: '#fff' }}
        />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    const mainEllipse = ellipses[1];

    expect(mainEllipse).toHaveAttribute('cx', '0');
    expect(mainEllipse).toHaveAttribute('cy', '0');
    expect(mainEllipse).toHaveAttribute('rx', String(STUD_RX));
    expect(mainEllipse).toHaveAttribute('ry', String(STUD_RY));
    expect(mainEllipse).toHaveAttribute('fill', '#888');
  });

  it('main ellipse uses STUD_RX (12) and STUD_RY (6)', () => {
    const { container } = render(
      <svg aria-label="stud-dimensions">
        <title>Stud Dimensions</title>
        <StudDefs
          studId="stud-dimensions"
          studColors={{ shadow: '#000', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const mainEllipse = container.querySelectorAll('ellipse')[1];
    expect(mainEllipse).toHaveAttribute('rx', '12');
    expect(mainEllipse).toHaveAttribute('ry', '6');
    expect(STUD_RX).toBe(12);
    expect(STUD_RY).toBe(6);
  });

  it('renders inner ring ellipse with correct dimensions', () => {
    const { container } = render(
      <svg aria-label="stud-inner">
        <title>Stud Inner</title>
        <StudDefs
          studId="stud-inner"
          studColors={{ shadow: '#333', main: '#555', highlight: '#ddd' }}
        />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    const innerEllipse = ellipses[2];

    expect(innerEllipse).toHaveAttribute('cx', '0');
    expect(innerEllipse).toHaveAttribute('cy', '0');
    expect(innerEllipse).toHaveAttribute('rx', String(STUD_INNER_RX));
    expect(innerEllipse).toHaveAttribute('ry', String(STUD_INNER_RY));
  });

  it('inner ring ellipse has correct STUD_INNER_RX (7.2) and STUD_INNER_RY (3.6)', () => {
    const { container } = render(
      <svg aria-label="stud-inner-dims">
        <title>Stud Inner Dims</title>
        <StudDefs
          studId="stud-inner-dims"
          studColors={{ shadow: '#333', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const innerEllipse = container.querySelectorAll('ellipse')[2];
    expect(innerEllipse).toHaveAttribute('rx', '7.2');
    expect(innerEllipse).toHaveAttribute('ry', '3.6');
    expect(STUD_INNER_RX).toBe(7.2);
    expect(STUD_INNER_RY).toBe(3.6);
  });

  it('inner ring ellipse has correct opacity (0.3)', () => {
    const { container } = render(
      <svg aria-label="stud-opacity">
        <title>Stud Opacity</title>
        <StudDefs
          studId="stud-opacity"
          studColors={{ shadow: '#333', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const innerEllipse = container.querySelectorAll('ellipse')[2];
    expect(innerEllipse).toHaveAttribute('opacity', String(STUD_INNER_OPACITY));
    expect(innerEllipse).toHaveAttribute('opacity', '0.3');
    expect(STUD_INNER_OPACITY).toBe(0.3);
  });

  it('inner ring ellipse uses highlight color', () => {
    const highlightColor = '#ffff00';
    const { container } = render(
      <svg aria-label="stud-highlight">
        <title>Stud Highlight</title>
        <StudDefs
          studId="stud-highlight"
          studColors={{ shadow: '#333', main: '#555', highlight: highlightColor }}
        />
      </svg>,
    );

    const innerEllipse = container.querySelectorAll('ellipse')[2];
    expect(innerEllipse).toHaveAttribute('fill', highlightColor);
  });

  it('accepts different color specifications', () => {
    const colors = { shadow: '#aaa', main: '#bbb', highlight: '#ccc' };
    const { container } = render(
      <svg aria-label="stud-colors">
        <title>Stud Colors</title>
        <StudDefs studId="stud-colors" studColors={colors} />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses[0]).toHaveAttribute('fill', '#aaa');
    expect(ellipses[1]).toHaveAttribute('fill', '#bbb');
    expect(ellipses[2]).toHaveAttribute('fill', '#ccc');
  });

  it('uses provided studId for group id', () => {
    const customId = 'my-custom-stud-id';
    const { container } = render(
      <svg aria-label="stud-custom-id">
        <title>Stud Custom ID</title>
        <StudDefs
          studId={customId}
          studColors={{ shadow: '#000', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const group = container.querySelector('g');
    expect(group).toHaveAttribute('id', customId);
  });

  it('is memoized and does not re-render on unchanged props', () => {
    const colors = { shadow: '#333', main: '#555', highlight: '#fff' };
    const { container, rerender } = render(
      <svg aria-label="stud-memo">
        <title>Stud Memo</title>
        <StudDefs studId="stud-memo" studColors={colors} />
      </svg>,
    );

    const ellipsesFirst = Array.from(container.querySelectorAll('ellipse'));
    rerender(
      <svg aria-label="stud-memo">
        <title>Stud Memo</title>
        <StudDefs studId="stud-memo" studColors={colors} />
      </svg>,
    );

    const ellipsesSecond = Array.from(container.querySelectorAll('ellipse'));
    expect(ellipsesFirst[0].isSameNode(ellipsesSecond[0])).toBe(true);
  });
});

describe('IsometricStud - StudGrid', () => {
  it('renders no use elements when studs array is empty', () => {
    const { container } = render(
      <svg aria-label="grid-empty">
        <title>Grid Empty</title>
        <StudGrid studId="grid-empty" studs={[]} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    expect(useElements).toHaveLength(0);
  });

  it('renders correct number of use elements matching studs array length', () => {
    const studs = [
      { x: 0, y: 0, key: 'stud-0' },
      { x: 10, y: 10, key: 'stud-1' },
      { x: 20, y: 20, key: 'stud-2' },
    ];

    const { container } = render(
      <svg aria-label="grid-three">
        <title>Grid Three</title>
        <StudGrid studId="grid-three" studs={studs} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    expect(useElements).toHaveLength(3);
  });

  it('renders use elements with correct href attribute', () => {
    const studId = 'my-stud-ref';
    const studs = [
      { x: 0, y: 0, key: 'stud-0' },
      { x: 10, y: 10, key: 'stud-1' },
    ];

    const { container } = render(
      <svg aria-label="grid-href">
        <title>Grid Href</title>
        <StudGrid studId={studId} studs={studs} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    useElements.forEach((el) => {
      expect(el).toHaveAttribute('href', `#${studId}`);
    });
  });

  it('use elements reference correct studId with hash prefix', () => {
    const customId = 'stud-variant-gold';
    const studs = [{ x: 5, y: 15, key: 'single-stud' }];

    const { container } = render(
      <svg aria-label="grid-ref">
        <title>Grid Ref</title>
        <StudGrid studId={customId} studs={studs} />
      </svg>,
    );

    const useElement = container.querySelector('use');
    expect(useElement).toHaveAttribute('href', '#stud-variant-gold');
  });

  it('renders use elements with correct x and y positions', () => {
    const studs = [
      { x: 10, y: 20, key: 'stud-a' },
      { x: 30, y: 40, key: 'stud-b' },
      { x: 50, y: 60, key: 'stud-c' },
    ];

    const { container } = render(
      <svg aria-label="grid-positions">
        <title>Grid Positions</title>
        <StudGrid studId="grid-positions" studs={studs} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    expect(useElements[0]).toHaveAttribute('x', '10');
    expect(useElements[0]).toHaveAttribute('y', '20');
    expect(useElements[1]).toHaveAttribute('x', '30');
    expect(useElements[1]).toHaveAttribute('y', '40');
    expect(useElements[2]).toHaveAttribute('x', '50');
    expect(useElements[2]).toHaveAttribute('y', '60');
  });

  it('use elements maintain order matching studs array order', () => {
    const studs = [
      { x: 100, y: 200, key: 'first' },
      { x: 300, y: 400, key: 'second' },
      { x: 500, y: 600, key: 'third' },
    ];

    const { container } = render(
      <svg aria-label="grid-order">
        <title>Grid Order</title>
        <StudGrid studId="grid-order" studs={studs} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    expect(useElements[0]).toHaveAttribute('x', '100');
    expect(useElements[1]).toHaveAttribute('x', '300');
    expect(useElements[2]).toHaveAttribute('x', '500');
  });

  it('uses key prop for React reconciliation without affecting DOM', () => {
    const studs = [
      { x: 0, y: 0, key: 'key-alpha' },
      { x: 10, y: 10, key: 'key-beta' },
    ];

    const { container, rerender } = render(
      <svg aria-label="grid-keys">
        <title>Grid Keys</title>
        <StudGrid studId="grid-keys" studs={studs} />
      </svg>,
    );

    const firstRender = container.querySelectorAll('use');
    expect(firstRender).toHaveLength(2);

    rerender(
      <svg aria-label="grid-keys">
        <title>Grid Keys</title>
        <StudGrid studId="grid-keys" studs={studs} />
      </svg>,
    );

    const secondRender = container.querySelectorAll('use');
    expect(secondRender).toHaveLength(2);
  });

  it('renders large number of studs efficiently', () => {
    const studs = Array.from({ length: 100 }, (_, i) => ({
      x: i * 10,
      y: i * 10,
      key: `stud-${i}`,
    }));

    const { container } = render(
      <svg aria-label="grid-large">
        <title>Grid Large</title>
        <StudGrid studId="grid-large" studs={studs} />
      </svg>,
    );

    const useElements = container.querySelectorAll('use');
    expect(useElements).toHaveLength(100);
    expect(useElements[0]).toHaveAttribute('x', '0');
    expect(useElements[99]).toHaveAttribute('x', '990');
  });

  it('is memoized and does not re-render on unchanged props', () => {
    const studs = [
      { x: 0, y: 0, key: 'stud-0' },
      { x: 10, y: 10, key: 'stud-1' },
    ];

    const { container, rerender } = render(
      <svg aria-label="grid-memo">
        <title>Grid Memo</title>
        <StudGrid studId="grid-memo" studs={studs} />
      </svg>,
    );

    const firstRender = container.querySelector('use');
    rerender(
      <svg aria-label="grid-memo">
        <title>Grid Memo</title>
        <StudGrid studId="grid-memo" studs={studs} />
      </svg>,
    );

    const secondRender = container.querySelector('use');
    expect(firstRender?.isSameNode(secondRender)).toBe(true);
  });

  it('updates use elements when studs array changes', () => {
    const initialStuds = [{ x: 0, y: 0, key: 'stud-0' }];
    const { container, rerender } = render(
      <svg aria-label="grid-update">
        <title>Grid Update</title>
        <StudGrid studId="grid-update" studs={initialStuds} />
      </svg>,
    );

    expect(container.querySelectorAll('use')).toHaveLength(1);

    const updatedStuds = [
      { x: 0, y: 0, key: 'stud-0' },
      { x: 10, y: 10, key: 'stud-1' },
      { x: 20, y: 20, key: 'stud-2' },
    ];

    rerender(
      <svg aria-label="grid-update">
        <title>Grid Update</title>
        <StudGrid studId="grid-update" studs={updatedStuds} />
      </svg>,
    );

    expect(container.querySelectorAll('use')).toHaveLength(3);
  });

  it('renders use elements without explicit class or data attributes', () => {
    const studs = [{ x: 5, y: 5, key: 'minimal' }];
    const { container } = render(
      <svg aria-label="grid-minimal">
        <title>Grid Minimal</title>
        <StudGrid studId="grid-minimal" studs={studs} />
      </svg>,
    );

    const useElement = container.querySelector('use');
    expect(useElement?.className.baseVal).toBe('');
    expect(useElement?.getAttributeNames()).toEqual(['href', 'x', 'y']);
  });
});

describe('IsometricStud - Universal Stud Standard Compliance', () => {
  it('StudDefs follows inviolable stud standard with exact dimensions', () => {
    const { container } = render(
      <svg aria-label="compliance-test">
        <title>Compliance Test</title>
        <StudDefs
          studId="compliance-test"
          studColors={{ shadow: '#000', main: '#555', highlight: '#fff' }}
        />
      </svg>,
    );

    const ellipses = container.querySelectorAll('ellipse');
    const [shadow, main, inner] = Array.from(ellipses);

    expect(shadow).toHaveAttribute('cy', '5');
    expect(shadow).toHaveAttribute('rx', '12');
    expect(shadow).toHaveAttribute('ry', '6');

    expect(main).toHaveAttribute('rx', '12');
    expect(main).toHaveAttribute('ry', '6');

    expect(inner).toHaveAttribute('rx', '7.2');
    expect(inner).toHaveAttribute('ry', '3.6');

    const innerRx = parseFloat(inner.getAttribute('rx') || '0');
    const mainRx = parseFloat(main.getAttribute('rx') || '0');
    expect(innerRx / mainRx).toBe(0.6);

    const innerRy = parseFloat(inner.getAttribute('ry') || '0');
    const mainRy = parseFloat(main.getAttribute('ry') || '0');
    expect(innerRy / mainRy).toBe(0.6);
  });

  it('all studs use identical dimensions regardless of color variant', () => {
    const colorVariants = [
      { shadow: '#333', main: '#555', highlight: '#fff' },
      { shadow: '#111', main: '#aaa', highlight: '#eee' },
      { shadow: '#222', main: '#888', highlight: '#ccc' },
    ];

    const renderedStuds = colorVariants.map((colors) => {
      const { container } = render(
        <svg aria-label="variant-test">
          <title>Variant Test</title>
          <StudDefs studId="variant-test" studColors={colors} />
        </svg>,
      );
      const ellipses = container.querySelectorAll('ellipse');
      return Array.from(ellipses);
    });

    renderedStuds.forEach((ellipses) => {
      expect(ellipses[0]).toHaveAttribute('rx', '12');
      expect(ellipses[0]).toHaveAttribute('ry', '6');
      expect(ellipses[1]).toHaveAttribute('rx', '12');
      expect(ellipses[1]).toHaveAttribute('ry', '6');
      expect(ellipses[2]).toHaveAttribute('rx', '7.2');
      expect(ellipses[2]).toHaveAttribute('ry', '3.6');
    });
  });
});
