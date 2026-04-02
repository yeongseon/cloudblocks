import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BlockSvg } from './BlockSvg';
import { useUIStore } from '../store/uiStore';

describe('BlockSvg', () => {
  const initialUIState = useUIStore.getState();

  beforeEach(() => {
    useUIStore.setState(initialUIState, true);
  });

  it('renders an SVG element for compute category', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders an SVG element without provider', () => {
    const { container } = render(<BlockSvg category="compute" />);

    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders port dots group when showPorts is enabled (default)', () => {
    const { container } = render(<BlockSvg category="compute" provider="azure" />);

    expect(container.querySelector('[data-testid="port-dots"]')).not.toBeNull();
  });

  describe('face label rendering', () => {
    it('renders short label on block face in learning mode (default zoom)', () => {
      useUIStore.setState({ effectiveLabelMode: 'learning' });
      const { container } = render(
        <BlockSvg category="compute" provider="azure" subtype="vm" name="Virtual Machine" />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      // shortLabel 'VM' should be used, not display label 'Virtual Machine'
      expect(texts).toContain('VM');
      expect(texts).not.toContain('Virtual Machine');
    });

    it('renders short label on block face in compact mode', () => {
      useUIStore.setState({ effectiveLabelMode: 'compact' });
      const { container } = render(
        <BlockSvg category="compute" provider="azure" subtype="vm" name="Virtual Machine" />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      expect(texts).toContain('VM');
    });

    it('renders display label in inspect mode (high zoom)', () => {
      useUIStore.setState({ effectiveLabelMode: 'inspect' });
      const { container } = render(
        <BlockSvg category="compute" provider="azure" subtype="vm" name="Virtual Machine" />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      // displayLabel 'Virtual Machine' should be used in inspect mode
      expect(texts).toContain('Virtual Machine');
    });

    it('falls back to name when no shortLabel is available', () => {
      useUIStore.setState({ effectiveLabelMode: 'learning' });
      const { container } = render(
        <BlockSvg category="compute" provider="azure" name="My Custom Block" />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      expect(texts).toContain('My Custom Block');
    });

    it('renders AWS short labels correctly', () => {
      useUIStore.setState({ effectiveLabelMode: 'learning' });
      const { container } = render(
        <BlockSvg
          category="delivery"
          provider="aws"
          subtype="alb"
          name="Application Load Balancer"
        />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      expect(texts).toContain('ALB');
    });

    it('renders GCP short labels correctly', () => {
      useUIStore.setState({ effectiveLabelMode: 'learning' });
      const { container } = render(
        <BlockSvg
          category="compute"
          provider="gcp"
          subtype="compute-engine"
          name="Compute Engine"
        />,
      );

      const textEls = container.querySelectorAll('svg text');
      const texts = Array.from(textEls).map((t) => t.textContent);
      expect(texts).toContain('GCE');
    });
  });

  describe('external block icon rendering', () => {
    it('renders actor-sprite icon for internet resource type', () => {
      const { container } = render(
        <BlockSvg category="delivery" provider="azure" resourceType="internet" name="Internet" />,
      );

      const image = container.querySelector('image');
      expect(image).not.toBeNull();
      expect(image?.getAttribute('href')).toContain('actor-sprites/internet.svg');
    });

    it('renders actor-sprite icon for browser resource type', () => {
      const { container } = render(
        <BlockSvg category="delivery" provider="azure" resourceType="browser" name="Client" />,
      );

      const image = container.querySelector('image');
      expect(image).not.toBeNull();
      expect(image?.getAttribute('href')).toContain('actor-sprites/browser.svg');
    });

    it('does not render actor-sprite for regular resource blocks', () => {
      const { container } = render(
        <BlockSvg category="compute" provider="azure" subtype="vm" name="VM" />,
      );

      const image = container.querySelector('image');
      // Regular blocks use vendor icons (not actor-sprites) or no image
      if (image) {
        expect(image.getAttribute('href')).not.toContain('actor-sprites');
      }
    });
  });
});
