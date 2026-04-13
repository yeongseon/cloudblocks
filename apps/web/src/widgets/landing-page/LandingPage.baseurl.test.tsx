/**
 * Regression tests for non-root BASE_URL (GitHub Pages subpath deployment).
 *
 * When Vite builds with --base /cloudblocks/, import.meta.env.BASE_URL is
 * inlined as "/cloudblocks/".  The hero illustration <img> must use that
 * base so the browser fetches the correct path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { LandingPage } from './LandingPage';

const listTemplatesMock = vi.fn();

vi.mock('./LandingPage.css', () => ({}));
vi.mock('../../features/templates/registry', () => ({
  listTemplates: () => listTemplatesMock(),
}));

const SUBPATH_BASE = '/cloudblocks/';

describe('LandingPage with non-root BASE_URL', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', SUBPATH_BASE);

    listTemplatesMock.mockReturnValue([
      { id: 't1', name: 'Template 1', description: 'Desc 1', tags: ['a'], model: {} },
    ]);

    useUIStore.setState({
      activeProvider: 'azure',
      goToBuilder: vi.fn(),
    });

    useArchitectureStore.setState({
      loadFromTemplate: vi.fn(),
      saveToStorage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefixes hero illustration src with subpath base URL', () => {
    render(<LandingPage />);

    const illustration = screen.getByAltText(
      'Isometric cloud architecture diagram showing container blocks, resource blocks, and connections',
    );
    expect(illustration).toHaveAttribute('src', '/cloudblocks/hero-illustration.svg');
  });

  it('does not produce double slashes in hero illustration src', () => {
    render(<LandingPage />);

    const illustration = screen.getByAltText(
      'Isometric cloud architecture diagram showing container blocks, resource blocks, and connections',
    );
    const src = illustration.getAttribute('src') ?? '';
    expect(src).not.toMatch(/\/\//);
  });
});
