import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  isAuthError: vi.fn(() => false),
  getApiErrorMessage: vi.fn((err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    return fallback;
  }),
}));

vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));

vi.mock('../../features/diff/engine', () => ({
  computeArchitectureDiff: vi.fn(),
}));

import { GitHubSync } from './GitHubSync';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { apiGet, apiPost, apiPut, isAuthError } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { computeArchitectureDiff } from '../../features/diff/engine';
import type { ArchitectureModel } from '@cloudblocks/schema';

const emptyArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('GitHubSync', () => {
  const mockApiGet = vi.mocked(apiGet);
  const mockApiPost = vi.mocked(apiPost);
  const mockApiPut = vi.mocked(apiPut);
  const mockIsAuthError = vi.mocked(isAuthError);
  const mockConfirmDialog = vi.mocked(confirmDialog);
  const mockComputeArchitectureDiff = vi.mocked(computeArchitectureDiff);
  const replaceArchitectureMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showGitHubSync: true, showGitHubLogin: false });
    useAuthStore.setState({
      status: 'authenticated',
      user: null,
      hydrated: true,
      error: null,
    });
    useArchitectureStore.setState({
      replaceArchitecture: replaceArchitectureMock,
      workspace: {
        id: 'ws-1',
        name: 'My Workspace',
        provider: 'azure' as const,
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
      },
    });
    mockApiGet.mockResolvedValue({ commits: [] });
    mockApiPut.mockResolvedValue({
      id: 'ws-1',
      owner_id: 'user-1',
      name: 'My Workspace',
      generator: 'terraform',
      provider: 'azure',
      github_repo: 'owner/repo-one',
      github_branch: 'main',
      last_synced_at: null,
      created_at: '',
      updated_at: '',
    });
    mockIsAuthError.mockReturnValue(false);
    mockConfirmDialog.mockResolvedValue(true);
    mockComputeArchitectureDiff.mockReturnValue({
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 0, hasBreakingChanges: false },
    } as ReturnType<typeof computeArchitectureDiff>);
  });

  it('renders null when hidden', () => {
    useUIStore.setState({ showGitHubSync: false });
    const { container } = render(<GitHubSync />);
    expect(container.innerHTML).toBe('');
  });

  it('shows auth required when not authenticated', () => {
    useAuthStore.setState({ status: 'anonymous' });
    render(<GitHubSync />);
    expect(screen.getByText('GitHub authentication required.')).toBeInTheDocument();
  });

  it('shows link repo form when no repo linked', () => {
    render(<GitHubSync />);
    expect(screen.getByText('No GitHub repo linked.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('owner/repo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
  });

  it('prefills repository input from pendingLinkRepo and clears handoff state', () => {
    useUIStore.setState({ pendingLinkRepo: 'owner/from-create' });

    render(<GitHubSync />);

    expect(screen.getByPlaceholderText('owner/repo')).toHaveValue('owner/from-create');
    expect(useUIStore.getState().pendingLinkRepo).toBe(null);
  });

  it('shows sync and pull buttons when repo linked', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/api/v1/workspaces/ws-1', {
        github_repo: 'owner/repo-one',
      });
    });

    expect(await screen.findByRole('button', { name: 'Sync to GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pull from GitHub' })).toBeInTheDocument();
  });

  it('sync button calls API', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sync', {
        architecture: emptyArch,
        commit_message: 'Sync architecture from CloudBlocks',
      });
    });
  });

  it('shows in-sync indicator after successful sync', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(await screen.findByText('✅ In sync')).toBeInTheDocument();
  });

  it('shows local-changes indicator when architecture changes after sync', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));
    await screen.findByText('✅ In sync');

    useArchitectureStore.setState((state) => ({
      workspace: {
        ...state.workspace,
        architecture: {
          ...state.workspace.architecture,
          name: 'Changed after sync',
        },
      },
    }));

    expect(await screen.findByText('⚠️ Local changes since last sync')).toBeInTheDocument();
  });

  it('shows error when link repo with invalid format', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    expect(screen.getByText('Repository must be in owner/repo format.')).toBeInTheDocument();
  });

  it('stays unlinked and shows error when link API fails', async () => {
    const user = userEvent.setup();
    mockApiPut.mockRejectedValueOnce(new Error('Link failed'));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    expect(await screen.findByText('Link failed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync to GitHub' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pull from GitHub' })).not.toBeInTheDocument();
  });

  it('routes auth error to login panel from link action', async () => {
    const user = userEvent.setup();
    const unauthorizedError = new Error('Unauthorized');
    mockApiPut.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('pull button calls API and replaces architecture in-place', async () => {
    const user = userEvent.setup();
    const archPayload = {
      id: 'pulled',
      name: 'Pulled',
      version: '1.0.0',
      nodes: [],
      connections: [],
      externalActors: [],
      createdAt: '',
      updatedAt: '',
    };
    mockApiPost.mockResolvedValue({ architecture: archPayload });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/pull');
    });
    expect(replaceArchitectureMock).toHaveBeenCalledWith(archPayload);
  });

  it('routes auth error to login panel from pull action', async () => {
    const user = userEvent.setup();
    const unauthorizedError = new Error('Unauthorized');
    mockApiPost.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('sync shows error when API call fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue(new Error('Network down'));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('pull shows error when API call fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue(new Error('Network down'));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('routes auth error to login panel from sync action', async () => {
    const user = userEvent.setup();
    const unauthorizedError = new Error('Unauthorized');
    mockApiPost.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('routes auth error to login panel from loadCommits', async () => {
    const user = userEvent.setup();
    const unauthorizedError = new Error('Unauthorized');
    mockApiGet.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    // After link, loadCommits fires and gets auth error from apiGet
    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('shows error when loadCommits fails', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ commits: [] });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    // After link, loadCommits fires via useEffect. Now make it fail on next call.
    mockApiGet.mockRejectedValueOnce(new Error('Commit fetch failed'));
    // Trigger a re-render that will call loadCommits again via sync button
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc' });
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    // The sync succeeds but loadCommits after sync fails
    await waitFor(() => {
      expect(screen.getByText('Commit fetch failed')).toBeInTheDocument();
    });
  });

  it('shows recent commits when available', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({
      commits: [
        {
          sha: 'abc1234567890',
          message: 'Initial commit',
          author: 'octocat',
          date: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo-one/commit/abc1234567890',
        },
      ],
    });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    expect(await screen.findByText('Initial commit')).toBeInTheDocument();
    const shaLink = screen.getByRole('link', { name: 'abc1234' });
    expect(shaLink).toBeInTheDocument();
    expect(shaLink).toHaveAttribute(
      'href',
      'https://github.com/owner/repo-one/commit/abc1234567890',
    );
    expect(shaLink).toHaveAttribute('target', '_blank');
    expect(shaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses backend workspace ID input when provided', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.type(screen.getByPlaceholderText('ws-1'), 'custom-ws-id');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/v1/workspaces/custom-ws-id/sync',
        expect.any(Object),
      );
    });
  });

  it('updates commit message and sends custom value on sync', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    const commitInput = await screen.findByDisplayValue('Sync architecture from CloudBlocks');
    await user.clear(commitInput);
    await user.type(commitInput, 'Custom commit from test');
    await user.click(screen.getByRole('button', { name: 'Sync to GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sync', {
        architecture: emptyArch,
        commit_message: 'Custom commit from test',
      });
    });
  });

  it('disables sync button when commit message is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    const commitInput = await screen.findByDisplayValue('Sync architecture from CloudBlocks');
    const syncButton = screen.getByRole('button', { name: 'Sync to GitHub' });

    await user.clear(commitInput);
    expect(syncButton).toBeDisabled();

    await user.type(commitInput, '   ');
    expect(syncButton).toBeDisabled();
  });

  it('allows unlinking and returns to repository form', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await screen.findByRole('button', { name: 'Sync to GitHub' });

    await user.click(screen.getByRole('button', { name: 'Unlink' }));

    expect(screen.getByText('No GitHub repo linked.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('owner/repo')).toBeInTheDocument();
    expect(useArchitectureStore.getState().workspace.githubRepo).toBeUndefined();
  });

  it('handles sync error with non-Error thrown value', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue('string error');

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(await screen.findByText('Failed to sync workspace.')).toBeInTheDocument();
  });

  it('handles pull error with non-Error thrown value', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue('string error');

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    expect(await screen.findByText('Failed to pull from GitHub.')).toBeInTheDocument();
  });

  it('close button toggles panel', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);
    await user.click(screen.getByRole('button', { name: 'Close GitHub sync panel' }));
    expect(useUIStore.getState().showGitHubSync).toBe(false);
  });

  it('asks for confirmation before closing when operation is in progress', async () => {
    const user = userEvent.setup();
    let resolveSync!: (value: unknown) => void;
    mockApiPost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );
    mockConfirmDialog.mockResolvedValueOnce(false);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));
    await user.click(screen.getByRole('button', { name: 'Close GitHub sync panel' }));

    expect(mockConfirmDialog).toHaveBeenCalledWith(
      'An operation is in progress. Closing may hide the result. Close anyway?',
      'Close GitHub Sync?',
    );
    expect(useUIStore.getState().showGitHubSync).toBe(true);
    resolveSync({ message: 'ok', commit_sha: 'abc' });
  });

  it('closes immediately when not busy without confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.click(screen.getByRole('button', { name: 'Close GitHub sync panel' }));

    expect(mockConfirmDialog).not.toHaveBeenCalled();
    expect(useUIStore.getState().showGitHubSync).toBe(false);
  });

  it('shows post-pull diff summary', async () => {
    const user = userEvent.setup();
    const pulledArchitecture = {
      nodes: [],
      connections: [],
      externalActors: [],
      name: 'Pulled architecture',
      version: '1.0.0',
    };
    mockApiPost.mockResolvedValueOnce({ architecture: pulledArchitecture });
    mockComputeArchitectureDiff.mockReturnValueOnce({
      plates: { added: [{ id: 'container-1' }], removed: [], modified: [] },
      blocks: { added: [{ id: 'block-1' }], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 2, hasBreakingChanges: false },
    } as unknown as ReturnType<typeof computeArchitectureDiff>);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    expect(
      await screen.findByText(
        'Pulled: 2 changes (1/0 containers added/removed, 1/0 nodes added/removed)',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo Pull' })).toBeInTheDocument();
  });

  it('undo pull restores pre-pull architecture snapshot', async () => {
    const user = userEvent.setup();
    const pulledArchitecture = {
      nodes: [],
      connections: [],
      externalActors: [],
      name: 'Pulled architecture',
      version: '1.0.0',
    };
    mockApiPost.mockResolvedValueOnce({ architecture: pulledArchitecture });
    mockComputeArchitectureDiff.mockReturnValueOnce({
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 0, hasBreakingChanges: false },
    } as ReturnType<typeof computeArchitectureDiff>);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));
    await user.click(await screen.findByRole('button', { name: 'Undo Pull' }));

    expect(replaceArchitectureMock).toHaveBeenNthCalledWith(2, {
      name: 'Test',
      version: '1.0.0',
      nodes: [],
      endpoints: [],
      connections: [],
      externalActors: [],
    });
  });

  it('open GitHub repos button toggles repos panel', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);
    await user.click(screen.getByText('Open GitHub Repos'));
    expect(useUIStore.getState().showGitHubRepos).toBe(true);
  });

  it('persists backend workspace ID to the store when linking', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.type(screen.getByPlaceholderText('ws-1'), 'backend-ws-id');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    const ws = useArchitectureStore.getState().workspace;
    expect(ws.backendWorkspaceId).toBe('backend-ws-id');
  });

  it('defaults backend workspace ID to workspace.id when input is empty', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    const ws = useArchitectureStore.getState().workspace;
    expect(ws.backendWorkspaceId).toBe('ws-1');
  });

  it('shows loading indicator while operations are in progress', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValue(
      new Promise((r) => {
        resolvePost = r;
      }),
    );

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(screen.getByText('Syncing to GitHub...')).toBeInTheDocument();
    resolvePost({ message: 'ok', commit_sha: 'abc' });
  });

  it('shows action-specific loading messages', async () => {
    const user = userEvent.setup();
    let resolvePut!: (value: unknown) => void;
    let resolvePull!: (value: unknown) => void;
    mockApiPut.mockReturnValueOnce(
      new Promise((r) => {
        resolvePut = r;
      }),
    );

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    expect(screen.getByText('Linking repository...')).toBeInTheDocument();
    resolvePut({});

    await screen.findByRole('button', { name: 'Pull from GitHub' });
    mockApiPost.mockReturnValueOnce(
      new Promise((r) => {
        resolvePull = r;
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Pull from GitHub' }));
    expect(screen.getByText('Pulling from GitHub...')).toBeInTheDocument();
    resolvePull({ architecture: emptyArch });
  });

  it('disables sync controls while syncing is in progress', async () => {
    const user = userEvent.setup();
    let resolveSync!: (value: unknown) => void;
    mockApiPost.mockReturnValueOnce(
      new Promise((r) => {
        resolveSync = r;
      }),
    );

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    const syncButton = await screen.findByRole('button', { name: 'Sync to GitHub' });
    const pullButton = screen.getByRole('button', { name: 'Pull from GitHub' });
    const commitInput = screen.getByLabelText('Commit message');

    await user.click(syncButton);

    expect(syncButton).toBeDisabled();
    expect(pullButton).toBeDisabled();
    expect(commitInput).toBeDisabled();
    resolveSync({ message: 'ok', commit_sha: 'abc' });
  });

  it('ignores stale commit responses after workspace changes', async () => {
    const user = userEvent.setup();
    let resolveCommits!: (value: {
      commits: Array<{
        sha: string;
        message: string;
        author: string;
        date: string;
        html_url: string;
      }>;
    }) => void;
    mockApiGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCommits = resolve;
        }),
    );

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        id: 'ws-2',
        backendWorkspaceId: 'backend-ws-2',
      },
    });

    resolveCommits({
      commits: [
        {
          sha: 'abc1234567890',
          message: 'stale commit',
          author: 'octocat',
          date: '2026-01-01T00:00:00.000Z',
          html_url: 'https://github.com/owner/repo-one/commit/abc1234567890',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByText('stale commit')).not.toBeInTheDocument();
    });
  });
});
