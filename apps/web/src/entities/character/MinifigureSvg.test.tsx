import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MinifigureSvg } from './MinifigureSvg';
import { getMinifigureFaceColors } from './minifigureFaceColors';
import type { CloudProvider } from './minifigureFaceColors';

describe('MinifigureSvg', () => {
  describe('renders without crashing', () => {
    it('renders azure provider', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders aws provider', () => {
      const { container } = render(<MinifigureSvg provider="aws" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders gcp provider', () => {
      const { container } = render(<MinifigureSvg provider="gcp" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('SVG structure', () => {
    it('has correct SVG element with viewBox', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('viewBox', '0 0 100 130');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('has width and height attributes for default scale', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '130');
    });
  });

  describe('body parts', () => {
    it('contains all required body parts', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);

      const parts = [
        'back-arm',
        'torso',
        'head',
        'front-arm',
        'back-leg',
        'front-leg',
        'stud',
        'face',
        'hips',
      ];

      parts.forEach((part) => {
        const element = container.querySelector(`[data-part="${part}"]`);
        expect(element).toBeInTheDocument();
      });
    });

    it('has face part inside head part', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);

      const headPart = container.querySelector('[data-part="head"]');
      const facePart = headPart?.querySelector('[data-part="face"]');

      expect(facePart).toBeInTheDocument();
    });
  });

  describe('provider logos', () => {
    it('azure provider renders triangle logo in torso group', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);

      const torsoPart = container.querySelector('[data-part="torso"]');
      const polygons = torsoPart?.querySelectorAll('polygon');

      expect(polygons).toBeDefined();
      expect(polygons?.length).toBeGreaterThanOrEqual(2);

      const whitePolygon = Array.from(polygons || []).find((p) => p.getAttribute('fill') === '#FFFFFF');
      expect(whitePolygon).toBeInTheDocument();
    });

    it('aws provider renders text fallback in torso group', () => {
      const { container } = render(<MinifigureSvg provider="aws" />);

      const torsoPart = container.querySelector('[data-part="torso"]');
      const textElement = torsoPart?.querySelector('text');

      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveTextContent('AWS');
    });

    it('gcp provider renders text fallback in torso group', () => {
      const { container } = render(<MinifigureSvg provider="gcp" />);

      const torsoPart = container.querySelector('[data-part="torso"]');
      const textElement = torsoPart?.querySelector('text');

      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveTextContent('GCP');
    });
  });

  describe('scale prop', () => {
    it('default scale is 1', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '130');
    });

    it('scale prop affects width and height', () => {
      const { container } = render(<MinifigureSvg provider="azure" scale={2} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '200');
      expect(svg).toHaveAttribute('height', '260');
    });

    it('scale prop of 0.5 reduces dimensions', () => {
      const { container } = render(<MinifigureSvg provider="azure" scale={0.5} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '50');
      expect(svg).toHaveAttribute('height', '65');
    });

    it('scale prop of 3 increases dimensions', () => {
      const { container } = render(<MinifigureSvg provider="aws" scale={3} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('width', '300');
      expect(svg).toHaveAttribute('height', '390');
    });
  });

  describe('className prop', () => {
    it('passes className to svg element', () => {
      const { container } = render(<MinifigureSvg provider="azure" className="test-class" />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('test-class');
    });

    it('works with multiple classes', () => {
      const { container } = render(
        <MinifigureSvg provider="azure" className="class-one class-two" />,
      );
      const svg = container.querySelector('svg');

      expect(svg).toHaveClass('class-one');
      expect(svg).toHaveClass('class-two');
    });

    it('works without className prop', () => {
      const { container } = render(<MinifigureSvg provider="aws" />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
    });
  });

  describe('color function', () => {
    it('getMinifigureFaceColors returns correct colors for azure', () => {
      const colors = getMinifigureFaceColors('azure');

      expect(colors.torso.top).toBe('#078DCE');
      expect(colors.torso.front).toBe('#067AB3');
      expect(colors.torso.side).toBe('#0570A4');
      expect(colors.legs.front).toBe('#858585');
      expect(colors.legs.side).toBe('#787878');
      expect(colors.skin.main).toBe('#F2CD37');
      expect(colors.skin.shade).toBe('#D4B124');
    });

    it('getMinifigureFaceColors returns correct colors for aws', () => {
      const colors = getMinifigureFaceColors('aws');

      expect(colors.torso.top).toBe('#FF9900');
      expect(colors.torso.front).toBe('#E68A00');
      expect(colors.torso.side).toBe('#CC7A00');
      expect(colors.legs.front).toBe('#858585');
      expect(colors.legs.side).toBe('#787878');
      expect(colors.skin.main).toBe('#F2CD37');
      expect(colors.skin.shade).toBe('#D4B124');
    });

    it('getMinifigureFaceColors returns correct colors for gcp', () => {
      const colors = getMinifigureFaceColors('gcp');

      expect(colors.torso.top).toBe('#FFFFFF');
      expect(colors.torso.front).toBe('#EBEBEB');
      expect(colors.torso.side).toBe('#E0E0E0');
      expect(colors.legs.front).toBe('#858585');
      expect(colors.legs.side).toBe('#787878');
      expect(colors.skin.main).toBe('#F2CD37');
      expect(colors.skin.shade).toBe('#D4B124');
    });

    it('all providers share leg and skin colors', () => {
      const providers: CloudProvider[] = ['azure', 'aws', 'gcp'];

      const colors = providers.map((p) => getMinifigureFaceColors(p));

      colors.forEach((color) => {
        expect(color.legs.front).toBe('#858585');
        expect(color.legs.side).toBe('#787878');
        expect(color.skin.main).toBe('#F2CD37');
        expect(color.skin.shade).toBe('#D4B124');
      });
    });
  });

  describe('SVG styling', () => {
    it('aws text has correct fill color', () => {
      const { container } = render(<MinifigureSvg provider="aws" />);
      const textElement = container.querySelector('text');

      expect(textElement).toHaveAttribute('fill', '#FFFFFF');
    });

    it('gcp text has different fill color than aws', () => {
      const { container: containerAws } = render(<MinifigureSvg provider="aws" />);
      const { container: containerGcp } = render(<MinifigureSvg provider="gcp" />);

      const textAws = containerAws.querySelector('text');
      const textGcp = containerGcp.querySelector('text');

      expect(textAws?.getAttribute('fill')).not.toBe(textGcp?.getAttribute('fill'));
    });

    it('text elements have rotation transform', () => {
      const { container } = render(<MinifigureSvg provider="aws" />);
      const textElement = container.querySelector('text');

      expect(textElement).toHaveAttribute('transform', 'rotate(26.5 38 68)');
    });

    it('logos have opacity', () => {
      const { container: containerAzure } = render(<MinifigureSvg provider="azure" />);
      const { container: containerAws } = render(<MinifigureSvg provider="aws" />);

      const torsoPart = containerAzure.querySelector('[data-part="torso"]');
      const polygons = torsoPart?.querySelectorAll('polygon');
      const whitePolygon = Array.from(polygons || []).find((p) => p.getAttribute('fill') === '#FFFFFF');

      const textElement = containerAws.querySelector('text');

      expect(whitePolygon?.getAttribute('opacity')).toBe('0.9');
      expect(textElement?.getAttribute('opacity')).toBe('0.9');
    });
  });

  describe('memoization', () => {
    it('renders consistently with same props', () => {
      const { container: container1, rerender } = render(
        <MinifigureSvg provider="azure" scale={2} className="test" />,
      );

      const svg1 = container1.querySelector('svg');
      const width1 = svg1?.getAttribute('width');
      const height1 = svg1?.getAttribute('height');

      rerender(<MinifigureSvg provider="azure" scale={2} className="test" />);

      const svg2 = container1.querySelector('svg');
      const width2 = svg2?.getAttribute('width');
      const height2 = svg2?.getAttribute('height');

      expect(width1).toBe(width2);
      expect(height1).toBe(height2);
    });
  });

  describe('stud and grid components', () => {
    it('contains stud part with StudGrid', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      const studPart = container.querySelector('[data-part="stud"]');

      expect(studPart).toBeInTheDocument();
    });

    it('contains StudDefs in SVG', () => {
      const { container } = render(<MinifigureSvg provider="azure" />);
      const svg = container.querySelector('svg');
      const defs = svg?.querySelector('defs');

      expect(defs).toBeInTheDocument();
    });
  });
});
