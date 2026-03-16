import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExternalActorSprite } from './ExternalActorSprite';
import type { ExternalActor } from '../../shared/types/index';

vi.mock('../../shared/assets/actor-sprites/internet.svg', () => ({ default: 'internet.svg' }));
vi.mock('./ExternalActorSprite.css', () => ({}));

const actor: ExternalActor = {
  id: 'actor-1',
  type: 'internet',
  name: 'Internet',
};

describe('ExternalActorSprite', () => {
  it('renders with correct position styles', () => {
    const { container } = render(
      <ExternalActorSprite actor={actor} screenX={135} screenY={246} zIndex={11} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ left: '135px', top: '246px', zIndex: '11' });
  });

  it('renders internet sprite image', () => {
    render(<ExternalActorSprite actor={actor} screenX={0} screenY={0} zIndex={1} />);

    const image = screen.getByAltText('Internet') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('internet.svg');
  });
});
