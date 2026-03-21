import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  getApiErrorMessage: vi.fn((err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    return fallback;
  }),
}));
vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn() },
}));
vi.mock('../../entities/store/slices', () => ({
  validateArchitectureShape: vi.fn(),
}));
vi.mock('../../features/diff/engine', () => ({
  computeArchitectureDiff: vi.fn(() => ({
    plates: { added: [], removed: [], modified: [] },
    blocks: { added: [], removed: [], modified: [] },
    connections: { added: [], removed: [], modified: [] },
    externalActors: { added: [], removed: [], modified: [] },
    rootChanges: [],
    summary: { totalChanges: 0, hasBreakingChanges: false },
  })),
}));
import { GitHubPR } from './GitHubPR';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { apiPost } from '../../shared/api/client';
import type { ArchitectureModel } from '@cloudblocks/schema';

const emptyArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('GitHubPR', () => {
  const mockApiPost = vi.mocked(apiPost);

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showGitHubPR: true });
    useAuthStore.setState({
      status: 'authenticated',
      user: null,
      hydrated: true,
      error: null,
    });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
        backendWorkspaceId: 'backend-ws-1',
        githubRepo: 'owner/repo-one',
      },
    });
  });

  it('renders null when hidden', () => {
    useUIStore.setState({ showGitHubPR: false });
    const { container } = render(<GitHubPR />);
    expect(container.innerHTML).toBe('');
  });

  it('shows auth required when not authenticated', () => {
    useAuthStore.setState({ status: 'anonymous' });
    render(<GitHubPR />);
    expect(screen.getByText('GitHub authentication required.')).toBeInTheDocument();
  });

  it('shows checking authentication when auth status is unknown', () => {
    useAuthStore.setState({ status: 'unknown' });
    render(<GitHubPR />);
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('shows form fields', () => {
    render(<GitHubPR />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Body (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Branch name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Commit message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeInTheDocument();
  });

  it('submits PR and shows result URL', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pr', {
        architecture: emptyArch,
        title: 'Update cloud architecture',
        body: '',
        branch: undefined,
        commit_message: 'Update architecture via CloudBlocks',
      });
    });

    expect(await screen.findByText('https://github.com/owner/repo/pull/42')).toBeInTheDocument();
    expect(screen.getByText(/PR #42/)).toBeInTheDocument();
    expect(screen.getByText('cloudblocks/update')).toBeInTheDocument();
  });

  it('shows error when PR creation fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue(new Error('API error'));

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    expect(await screen.findByText('API error')).toBeInTheDocument();
  });

  it('shows fallback error for non-Error thrown value', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue('string error');

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    expect(await screen.findByText('Failed to create pull request.')).toBeInTheDocument();
  });

  it('sends custom branch name when provided', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'custom-branch',
    });

    render(<GitHubPR />);
    await user.type(screen.getByLabelText('Branch name (optional)'), 'custom-branch');
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pr', expect.objectContaining({
        branch: 'custom-branch',
      }));
    });
  });

  it('disables submit button when title is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const titleField = screen.getByLabelText('Title');
    const submitButton = screen.getByRole('button', { name: 'Create Pull Request' });

    await user.clear(titleField);
    expect(submitButton).toBeDisabled();

    await user.type(titleField, '   ');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when commit message is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const commitField = screen.getByLabelText('Commit message');
    const submitButton = screen.getByRole('button', { name: 'Create Pull Request' });

    await user.clear(commitField);
    expect(submitButton).toBeDisabled();
    await user.type(commitField, '   ');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button and shows error text when branch is invalid', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'feature bad');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Branch name contains invalid characters or format.')).toBeInTheDocument();
  });

  it('disables submit when head branch matches base branch', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'main');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Head branch must be different from the base branch.')).toBeInTheDocument();
  });

  it('shows effective backend workspace id in the form', () => {
    render(<GitHubPR />);

    expect(screen.getByText('backend-ws-1')).toBeInTheDocument();
  });

  it('trims PR title before submission', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'main',
    });

    render(<GitHubPR />);

    const titleField = screen.getByLabelText('Title');
    await user.clear(titleField);
    await user.type(titleField, '  Trimmed title  ');
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pr', expect.objectContaining({
        title: 'Trimmed title',
      }));
    });
  });

  it('shows loading indicator while submitting', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValue(new Promise((r) => { resolvePost = r; }));

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolvePost({ pull_request_url: 'https://github.com/owner/repo/pull/42', number: 42, branch: 'main' });
  });

  it('close button toggles panel', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Close pull request panel' }));
    expect(useUIStore.getState().showGitHubPR).toBe(false);
  });

  it('allows editing body and commit message fields', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const bodyField = screen.getByLabelText('Body (optional)');
    await user.type(bodyField, 'Custom body');
    expect(bodyField).toHaveValue('Custom body');

    const commitField = screen.getByLabelText('Commit message');
    await user.clear(commitField);
    await user.type(commitField, 'Custom commit');
    expect(commitField).toHaveValue('Custom commit');

  });

  it('resets form state on remount (simulating panel close and reopen)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<GitHubPR />);

    const bodyField = screen.getByLabelText('Body (optional)');
    await user.type(bodyField, 'Modified body');

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'my-branch');

    unmount();
    render(<GitHubPR />);

    expect(screen.getByLabelText('Title')).toHaveValue('Update cloud architecture');
    expect(screen.getByLabelText('Body (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Branch name (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Commit message')).toHaveValue('Update architecture via CloudBlocks');
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('uses backendWorkspaceId when set on workspace', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
        backendWorkspaceId: 'backend-ws-42',
      },
    });
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'main',
    });

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-42/pr', expect.any(Object));
    });
  });

  it('blocks submission when backendWorkspaceId is not set', async () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: undefined,
      },
    });
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'main',
    });

    render(<GitHubPR />);

    expect(screen.getByText('Workspace must be linked to backend before creating a pull request.')).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('resets result when linked repository changes', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));
    expect(await screen.findByText('https://github.com/owner/repo/pull/42')).toBeInTheDocument();

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        githubRepo: 'owner/repo-two',
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('https://github.com/owner/repo/pull/42')).not.toBeInTheDocument();
    });
  });

  it('uses workspace.github_branch as base branch when set', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        github_branch: 'develop',
      } as ReturnType<typeof useArchitectureStore.getState>['workspace'],
    });

    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'develop');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Head branch must be different from the base branch.')).toBeInTheDocument();
  });

  it('shows repo name in meta section when githubRepo is set', () => {
    render(<GitHubPR />);
    const repoElements = screen.getAllByText('owner/repo-one');
    expect(repoElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show repo in meta section when githubRepo is not set', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        githubRepo: undefined,
      },
    });

    render(<GitHubPR />);
    expect(screen.queryByText('owner/repo-one')).not.toBeInTheDocument();
  });

  it('shows local architecture summary (#878)', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: {
          ...emptyArch,
          plates: [{ id: 'p1' }, { id: 'p2' }] as typeof emptyArch.plates,
          blocks: [{ id: 'b1' }] as typeof emptyArch.blocks,
          connections: [{ id: 'c1' }] as typeof emptyArch.connections,
        },
      },
    });

    render(<GitHubPR />);
    expect(screen.getByText('Local: 2 plates · 1 blocks · 1 connections')).toBeInTheDocument();
  });

  it('shows remote baseline context with base branch (#880)', () => {
    render(<GitHubPR />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('shows Compare with GitHub button (#882)', () => {
    render(<GitHubPR />);
    expect(screen.getByRole('button', { name: 'Compare with GitHub' })).toBeInTheDocument();
  });

  it('compare button calls API and opens diff mode (#882)', async () => {
    const user = userEvent.setup();
    const remoteArch = { ...emptyArch, id: 'remote' };
    mockApiPost.mockResolvedValueOnce({ architecture: remoteArch });

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Compare with GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pull');
    });
  });

  it('persists PR result to workspace store on successful submission (#887)', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/99',
      number: 99,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      const ws = useArchitectureStore.getState().workspace;
      expect(ws.lastPrResult).toBeDefined();
      expect(ws.lastPrResult?.number).toBe(99);
      expect(ws.lastPrResult?.url).toBe('https://github.com/owner/repo/pull/99');
      expect(ws.lastPrResult?.branch).toBe('cloudblocks/update');
      expect(ws.lastPrResult?.createdAt).toBeTruthy();
    });
  });

  it('shows recent PR banner when lastPrResult exists and no current result (#888)', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        lastPrResult: {
          url: 'https://github.com/owner/repo/pull/55',
          number: 55,
          branch: 'feature/old',
          createdAt: '2025-03-20T10:00:00Z',
        },
      },
    });

    render(<GitHubPR />);
    expect(screen.getByText('Recent PR:')).toBeInTheDocument();
    expect(screen.getByText('#55')).toBeInTheDocument();
    expect(screen.getByText('feature/old')).toBeInTheDocument();
  });

  it('hides recent PR banner when current result is shown (#888)', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        lastPrResult: {
          url: 'https://github.com/owner/repo/pull/55',
          number: 55,
          branch: 'feature/old',
          createdAt: '2025-03-20T10:00:00Z',
        },
      },
    });

    mockApiPost.mockResolvedValue({
      pull_request_url: 'https://github.com/owner/repo/pull/56',
      number: 56,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);
    expect(screen.getByText('Recent PR:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(screen.queryByText('Recent PR:')).not.toBeInTheDocument();
    });
  });

  it('does not show recent PR banner when lastPrResult is absent (#888)', () => {
    render(<GitHubPR />);
    expect(screen.queryByText('Recent PR:')).not.toBeInTheDocument();
  });
});
