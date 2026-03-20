import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  getApiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
import { GitHubSync } from './GitHubSync';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { apiGet, apiPost, apiPut } from '../../shared/api/client';
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

describe('GitHubSync', () => {
  const mockApiGet = vi.mocked(apiGet);
  const mockApiPost = vi.mocked(apiPost);
  const mockApiPut = vi.mocked(apiPut);
  const replaceArchitectureMock = vi.fn();
  const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showGitHubSync: true });
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
        backendWorkspaceId: 'backend-ws-1',
        name: 'My Workspace',
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

  it('shows sync and pull buttons when repo linked', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1', {
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
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/sync', {
        architecture: emptyArch,
        commit_message: 'Sync architecture from CloudBlocks',
      });
    });
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

  it('pull button calls API and replaces architecture in-place', async () => {
    const user = userEvent.setup();
    const archPayload = { id: 'pulled', name: 'Pulled', version: '1.0.0', plates: [], blocks: [], connections: [], externalActors: [], createdAt: '', updatedAt: '' };
    mockApiPost.mockResolvedValue({ architecture: archPayload });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pull');
    });
    expect(replaceArchitectureMock).toHaveBeenCalledWith(archPayload);
  });

  it('sync shows error when API call fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue(new Error('Network down'));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith('Network down');
  });

  it('pull shows error when API call fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue(new Error('Network down'));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith('Network down');
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
    expect(alertMock).toHaveBeenCalledWith('Commit fetch failed');
  });

  it('shows recent commits when available', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({
      commits: [
        { sha: 'abc1234567890', message: 'Initial commit', author: 'octocat', date: '2025-01-01T00:00:00Z' },
      ],
    });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    expect(await screen.findByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText(/abc1234/)).toBeInTheDocument();
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
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/sync', {
        architecture: emptyArch,
        commit_message: 'Custom commit from test',
      });
    });
  });

  it('handles sync error with non-Error thrown value', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue('string error');

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(await screen.findByText('Failed to sync workspace.')).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith('Failed to sync workspace.');
  });

  it('handles pull error with non-Error thrown value', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValue('string error');

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Pull from GitHub' }));

    expect(await screen.findByText('Failed to pull from GitHub.')).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith('Failed to pull from GitHub.');
  });

  it('close button toggles panel', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);
    await user.click(screen.getByRole('button', { name: 'Close GitHub sync panel' }));
    expect(useUIStore.getState().showGitHubSync).toBe(false);
  });

  it('open GitHub repos button toggles repos panel', async () => {
    const user = userEvent.setup();
    render(<GitHubSync />);
    await user.click(screen.getByText('Open GitHub Repos'));
    expect(useUIStore.getState().showGitHubRepos).toBe(true);
  });

  it('shows clear error and blocks calls when backendWorkspaceId is missing', async () => {
    const user = userEvent.setup();
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: undefined,
      },
    });

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    const message = 'Missing backend workspace ID. Open Workspace Manager and connect this workspace to the backend first.';
    expect(mockApiPut).not.toHaveBeenCalled();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(alertMock).toHaveBeenCalledWith(message);
  });

  it('shows loading indicator while operations are in progress', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValue(new Promise((r) => { resolvePost = r; }));

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolvePost({ message: 'ok', commit_sha: 'abc' });
  });
});
