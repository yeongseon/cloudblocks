import { denseFixture } from './denseFixture';
import { spikeFixture } from './fixture';

export const activeFixture =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('fixture') === 'dense'
    ? denseFixture
    : spikeFixture;

export const fixtureName = activeFixture === denseFixture ? 'dense' : 'baseline';
