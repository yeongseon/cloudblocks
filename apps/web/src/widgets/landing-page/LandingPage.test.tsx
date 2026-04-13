import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { LandingPage } from './LandingPage';

const listTemplatesMock = vi.fn();
const getScenarioMock = vi.fn();

vi.mock('./LandingPage.css', () => ({}));
vi.mock('../../features/templates/registry', () => ({
  listTemplates: () => listTemplatesMock(),
}));
vi.mock('../../features/learning/scenarios/registry', () => ({
  getScenario: (id: string) => getScenarioMock(id),
}));

describe('LandingPage', () => {
  beforeEach(() => {
    listTemplatesMock.mockReturnValue([
      {
        id: 't1',
        name: 'Template 1',
        description: 'Desc 1',
        difficulty: 'beginner',
        scenarioId: 'scenario-1',
        tags: ['a', 'b', 'c', 'd'],
        model: {},
      },
      {
        id: 't2',
        name: 'Template 2',
        description: 'Desc 2',
        difficulty: 'intermediate',
        scenarioId: 'scenario-2',
        tags: ['e'],
        model: {},
      },
      {
        id: 't3',
        name: 'Template 3',
        description: 'Desc 3',
        difficulty: 'advanced',
        tags: ['f', 'g'],
        model: {},
      },
      {
        id: 't4',
        name: 'Template 4',
        description: 'Desc 4',
        difficulty: 'beginner',
        tags: ['h'],
        model: {},
      },
    ]);

    getScenarioMock.mockImplementation((id: string) => {
      const scenarios: Record<string, { estimatedMinutes: number }> = {
        'scenario-1': { estimatedMinutes: 10 },
        'scenario-2': { estimatedMinutes: 8 },
      };
      return scenarios[id] ?? undefined;
    });

    useUIStore.setState({
      activeProvider: 'azure',
      goToBuilder: vi.fn(),
    });

    useArchitectureStore.setState({
      loadFromTemplate: vi.fn(),
      saveToStorage: vi.fn(),
    });
  });

  it('shows all templates and slices tags to three', () => {
    render(<LandingPage />);

    expect(screen.getByText('Template 1')).toBeInTheDocument();
    expect(screen.getByText('Template 2')).toBeInTheDocument();
    expect(screen.getByText('Template 3')).toBeInTheDocument();
    expect(screen.getByText('Template 4')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.queryByText('d')).not.toBeInTheDocument();
  });

  it('navigates to builder when Get Started is clicked', async () => {
    const user = userEvent.setup();
    const goToBuilder = vi.fn();
    useUIStore.setState({ activeProvider: 'azure', goToBuilder });

    render(<LandingPage />);

    await user.click(screen.getAllByRole('button', { name: 'Get Started' })[0]);
    expect(goToBuilder).toHaveBeenCalledOnce();
  });

  it('loads template, saves, and navigates when Use This Template is clicked', async () => {
    const user = userEvent.setup();
    const goToBuilder = vi.fn();
    const loadFromTemplate = vi.fn();
    const saveToStorage = vi.fn();

    useUIStore.setState({ activeProvider: 'azure', goToBuilder });
    useArchitectureStore.setState({ loadFromTemplate, saveToStorage });

    render(<LandingPage />);

    await user.click(screen.getAllByRole('button', { name: 'Use This Template' })[0]);

    expect(loadFromTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), 'azure');
    expect(saveToStorage).toHaveBeenCalledOnce();
    expect(goToBuilder).toHaveBeenCalledOnce();
  });

  it('renders hero illustration with alt text', () => {
    render(<LandingPage />);

    const illustration = screen.getByAltText(
      'Isometric cloud architecture diagram showing container blocks, resource blocks, and connections',
    );
    expect(illustration).toBeInTheDocument();
    expect(illustration.tagName.toLowerCase()).toBe('img');
    expect(illustration).toHaveAttribute('src', '/hero-illustration.svg');
  });

  it('shows desktop hint text', () => {
    render(<LandingPage />);

    expect(screen.getByText('Best experienced on desktop')).toBeInTheDocument();
  });

  it('shows Azure-first badges in hero and template cards', () => {
    render(<LandingPage />);

    expect(screen.getByText('Azure-first templates')).toBeInTheDocument();
    const templateCards = screen.getAllByText('Use This Template');
    const providerBadges = screen.getAllByText('Azure');
    expect(providerBadges).toHaveLength(templateCards.length);
  });

  it('shows difficulty badges on all template cards', () => {
    render(<LandingPage />);

    const templateCards = screen.getAllByRole('button', { name: 'Use This Template' });
    const beginnerBadges = screen.getAllByText('beginner');
    const intermediateBadges = screen.getAllByText('intermediate');
    const advancedBadges = screen.getAllByText('advanced');

    expect(templateCards).toHaveLength(4);
    expect(beginnerBadges).toHaveLength(2);
    expect(intermediateBadges).toHaveLength(1);
    expect(advancedBadges).toHaveLength(1);
  });

  it('shows estimated time for templates with linked scenarios', () => {
    render(<LandingPage />);

    expect(screen.getByText('~10 min')).toBeInTheDocument();
    expect(screen.getByText('~8 min')).toBeInTheDocument();
  });

  it('does not show time tag when template has no scenario', () => {
    render(<LandingPage />);

    // Templates t3 and t4 have no scenarioId — only 2 time tags should exist
    const timeTags = screen.getAllByText(/~\d+ min/);
    expect(timeTags).toHaveLength(2);
  });
});
