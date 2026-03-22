import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useUIStore } from '../entities/store/uiStore';

vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="app-toaster" />,
}));
vi.mock('./BuilderView', () => ({
  BuilderView: () => <div data-testid="builder-view" />,
}));
vi.mock('../widgets/landing-page/LandingPage', () => ({
  LandingPage: () => <div data-testid="landing-view" />,
}));
vi.mock('../features/templates/builtin', () => ({
  registerBuiltinTemplates: vi.fn(),
}));
vi.mock('../features/learning/scenarios/builtin', () => ({
  registerBuiltinScenarios: vi.fn(),
}));
vi.mock('../shared/utils/audioService', () => ({
  audioService: { preloadAll: vi.fn().mockResolvedValue(undefined) },
}));

describe('App branch coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    useUIStore.setState({ appView: 'landing', themeVariant: 'blueprint' });
    vi.stubEnv('MODE', 'production');
  });

  it('renders landing page in non-test mode and applies workshop theme', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    expect(screen.getByTestId('landing-view')).toBeInTheDocument();
    expect(screen.queryByTestId('builder-view')).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('workshop');
  });
});
