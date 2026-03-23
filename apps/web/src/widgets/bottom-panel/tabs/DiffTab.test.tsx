import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useUIStore } from '../../../entities/store/uiStore';
import { DiffTab } from './DiffTab';

const diffPanelContentMock = vi.fn((_props: Record<string, unknown>) => (
  <div data-testid="diff-panel-content" />
));

vi.mock('../../diff-panel/DiffPanel.css', () => ({}));
vi.mock('../../diff-panel/DiffPanel', () => ({
  DiffPanelContent: (props: Record<string, unknown>) => {
    diffPanelContentMock(props);
    return <div data-testid="diff-panel-content" />;
  },
}));

describe('DiffTab', () => {
  beforeEach(() => {
    diffPanelContentMock.mockClear();
    useUIStore.setState({
      diffDelta: null,
      diffBaseArchitecture: null,
    });
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        name: 'Workspace A',
      },
    });
  });

  it('shows fallback text when no diff data exists', () => {
    render(<DiffTab />);
    expect(
      screen.getByText('No diff data. Use Compare with GitHub to generate a diff.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('diff-panel-content')).not.toBeInTheDocument();
  });

  it('renders DiffPanelContent with expected props when diff exists', () => {
    const delta = {
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      endpoints: [],
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 0, hasBreakingChanges: false },
    };
    const base = {
      id: 'arch-base',
      name: 'Base',
      version: '1.0.0',
      nodes: [],
      connections: [],
      endpoints: [],
      externalActors: [],
      createdAt: '',
      updatedAt: '',
    };

    useUIStore.setState({
      diffDelta: delta as import('../../../shared/types/diff').DiffDelta,
      diffBaseArchitecture: base,
    });

    render(<DiffTab />);

    expect(screen.getByTestId('diff-panel-content')).toBeInTheDocument();
    expect(diffPanelContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        diffDelta: delta,
        diffBaseArchitecture: base,
        workspaceName: 'Workspace A',
        showHeader: false,
      }),
    );
  });
});
