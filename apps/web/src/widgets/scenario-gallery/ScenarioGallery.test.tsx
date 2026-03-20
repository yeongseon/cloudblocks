import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioGallery } from './ScenarioGallery';
import { useUIStore } from '../../entities/store/uiStore';
import { registerBuiltinScenarios } from '../../features/learning/scenarios/builtin';
import {
  clearScenarioRegistry,
  listScenarios,
  registerScenario,
} from '../../features/learning/scenarios/registry';
import { startLearningScenario } from '../../features/learning/scenario-engine';
import type { Scenario } from '../../shared/types/learning';

vi.mock('../../features/learning/scenario-engine', () => ({
  startLearningScenario: vi.fn(),
}));

const beginnerOnlyScenario: Scenario = {
  id: 'scenario-beginner-only',
  name: 'Beginner Only Scenario',
  description: 'Used to verify empty-state filtering.',
  difficulty: 'beginner',
  category: 'general',
  tags: ['beginner', 'test'],
  estimatedMinutes: 3,
  initialArchitecture: {
    name: 'Beginner Only Scenario',
    version: '1',
    plates: [],
    blocks: [],
    connections: [],
    externalActors: [],
  },
  steps: [
    {
      id: 'step-1',
      order: 1,
      title: 'Do one thing',
      instruction: 'Test step',
      hints: ['Hint'],
      validationRules: [],
    },
  ],
};

describe('ScenarioGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerBuiltinScenarios();
  });

  afterEach(() => {
    useUIStore.setState({ showScenarioGallery: false, editorMode: 'build' });
    clearScenarioRegistry();
    vi.clearAllMocks();
  });

  it('shows gallery title "Scenario Gallery"', () => {
    render(<ScenarioGallery />);
    expect(screen.getByRole('heading', { name: 'Scenario Gallery' })).toBeInTheDocument();
  });

  it('renders all builtin scenarios', () => {
    render(<ScenarioGallery />);
    const scenarios = listScenarios();

    expect(scenarios).toHaveLength(3);
    scenarios.forEach((scenario) => {
      expect(screen.getByText(scenario.name)).toBeInTheDocument();
    });
  });

  it('All filter shows every builtin scenario card', async () => {
    const user = userEvent.setup();
    render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(document.querySelectorAll('.scenario-gallery-card')).toHaveLength(3);
  });

  it('Beginner filter shows only beginner scenarios', async () => {
    const user = userEvent.setup();
    render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'Beginner' }));

    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.queryByText('Serverless HTTP API')).not.toBeInTheDocument();
    expect(screen.queryByText('Event-Driven Data Pipeline')).not.toBeInTheDocument();
  });

  it('Intermediate filter shows only intermediate scenarios', async () => {
    const user = userEvent.setup();
    render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'Intermediate' }));

    expect(screen.getByText('Serverless HTTP API')).toBeInTheDocument();
    expect(screen.queryByText('Build a Three-Tier Web Application')).not.toBeInTheDocument();
    expect(screen.queryByText('Event-Driven Data Pipeline')).not.toBeInTheDocument();
  });

  it('Advanced filter shows only advanced scenarios', async () => {
    const user = userEvent.setup();
    render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'Advanced' }));

    expect(screen.getByText('Event-Driven Data Pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Build a Three-Tier Web Application')).not.toBeInTheDocument();
    expect(screen.queryByText('Serverless HTTP API')).not.toBeInTheDocument();
  });

  it('shows scenario name, description, difficulty badge, time estimate, and tags', () => {
    render(<ScenarioGallery />);

    const card = screen.getByText('Build a Three-Tier Web Application').closest('.scenario-gallery-card');
    if (!(card instanceof HTMLElement)) {
      throw new Error('Expected scenario card');
    }

    const cardScope = within(card);
    expect(cardScope.getByText(/Learn cloud architecture fundamentals/i)).toBeInTheDocument();
    const difficultyBadge = card.querySelector('.scenario-gallery-badge');
    if (!(difficultyBadge instanceof HTMLElement)) {
      throw new Error('Expected difficulty badge');
    }
    expect(difficultyBadge).toHaveTextContent('beginner');
    expect(cardScope.getByText('~10 min')).toBeInTheDocument();
    expect(cardScope.getByText('three-tier')).toBeInTheDocument();
    expect(cardScope.getByText('gateway')).toBeInTheDocument();
  });

  it('Start button calls startLearningScenario and closes gallery', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showScenarioGallery: true });
    render(<ScenarioGallery />);

    const card = screen.getByText('Build a Three-Tier Web Application').closest('.scenario-gallery-card');
    if (!(card instanceof HTMLElement)) {
      throw new Error('Expected scenario card');
    }

    await user.click(within(card).getByRole('button', { name: 'Start' }));

    expect(startLearningScenario).toHaveBeenCalledWith('scenario-three-tier');
    expect(useUIStore.getState().showScenarioGallery).toBe(false);
  });

  it('close button toggles gallery off', () => {
    useUIStore.setState({ showScenarioGallery: true });
    render(<ScenarioGallery />);
    fireEvent.click(screen.getByRole('button', { name: 'Close scenario gallery' }));
    expect(useUIStore.getState().showScenarioGallery).toBe(false);
  });

  it('shows empty message when filter has no matching scenarios', async () => {
    const user = userEvent.setup();
    render(<ScenarioGallery />);

    clearScenarioRegistry();
    registerScenario(beginnerOnlyScenario);

    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByText('No scenarios in this category.')).toBeInTheDocument();
  });

  it('resets difficulty filter to "all" after Start', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showScenarioGallery: true });

    const { unmount } = render(<ScenarioGallery />);

    // Filter to Beginner
    await user.click(screen.getByRole('button', { name: 'Beginner' }));
    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.queryByText('Serverless HTTP API')).not.toBeInTheDocument();

    // Click Start on the visible card
    const card = screen.getByText('Build a Three-Tier Web Application').closest('.scenario-gallery-card');
    if (!(card instanceof HTMLElement)) throw new Error('Expected scenario card');
    await user.click(within(card).getByRole('button', { name: 'Start' }));

    // Re-render (simulates reopening the gallery)
    unmount();
    useUIStore.setState({ showScenarioGallery: true });
    render(<ScenarioGallery />);

    // All scenarios should be visible — filter was reset to "all"
    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.getByText('Serverless HTTP API')).toBeInTheDocument();
    expect(screen.getByText('Event-Driven Data Pipeline')).toBeInTheDocument();
  });

  it('resets difficulty filter on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'Beginner' }));
    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.queryByText('Serverless HTTP API')).not.toBeInTheDocument();

    unmount();
    render(<ScenarioGallery />);

    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.getByText('Serverless HTTP API')).toBeInTheDocument();
    expect(screen.getByText('Event-Driven Data Pipeline')).toBeInTheDocument();
  });

  it('resets difficulty filter to All after starting a scenario', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showScenarioGallery: true });
    const { unmount } = render(<ScenarioGallery />);

    await user.click(screen.getByRole('button', { name: 'Beginner' }));
    expect(screen.queryByText('Serverless HTTP API')).not.toBeInTheDocument();

    const card = screen.getByText('Build a Three-Tier Web Application').closest('.scenario-gallery-card');
    if (!(card instanceof HTMLElement)) {
      throw new Error('Expected scenario card');
    }
    await user.click(within(card).getByRole('button', { name: 'Start' }));

    unmount();
    useUIStore.setState({ showScenarioGallery: true });
    registerBuiltinScenarios();
    render(<ScenarioGallery />);

    expect(screen.getByText('Build a Three-Tier Web Application')).toBeInTheDocument();
    expect(screen.getByText('Serverless HTTP API')).toBeInTheDocument();
    expect(screen.getByText('Event-Driven Data Pipeline')).toBeInTheDocument();
  });
});
