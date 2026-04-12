import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { LandingPage } from './LandingPage';

const listTemplatesMock = vi.fn();

vi.mock('./LandingPage.css', () => ({}));
vi.mock('../../features/templates/registry', () => ({
  listTemplates: () => listTemplatesMock(),
}));

describe('LandingPage', () => {
  beforeEach(() => {
    listTemplatesMock.mockReturnValue([
      {
        id: 't1',
        name: 'Template 1',
        description: 'Desc 1',
        tags: ['a', 'b', 'c', 'd'],
        model: {},
      },
      { id: 't2', name: 'Template 2', description: 'Desc 2', tags: ['e'], model: {} },
      { id: 't3', name: 'Template 3', description: 'Desc 3', tags: ['f', 'g'], model: {} },
      { id: 't4', name: 'Template 4', description: 'Desc 4', tags: ['h'], model: {} },
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
});
