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
    expect(screen.getByLabelText('Head branch name (optional)')).toBeInTheDocument();
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
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/backend-ws-1/pr', expect.objectContaining({
        architecture: emptyArch,
        title: 'Update Workspace (AZURE)',
        body: '',
        branch: undefined,
        commit_message: 'Update Workspace (AZURE) via CloudBlocks',
      }));
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
    await user.type(screen.getByLabelText('Head branch name (optional)'), 'custom-branch');
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

  it('disables submit button when commit message is empty', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const commitField = screen.getByLabelText('Commit message');
    const submitButton = screen.getByRole('button', { name: 'Create Pull Request' });

    await user.clear(commitField);
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button and shows error text when branch is invalid', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Head branch name (optional)');
    await user.type(branchField, 'feature bad');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Branch name contains invalid characters or format.')).toBeInTheDocument();
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

    const branchField = screen.getByLabelText('Head branch name (optional)');
    await user.type(branchField, 'my-branch');

    unmount();
    render(<GitHubPR />);

    expect(screen.getByLabelText('Title')).toHaveValue('Update Workspace (AZURE)');
    expect(screen.getByLabelText('Body (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Head branch name (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Commit message')).toHaveValue('Update Workspace (AZURE) via CloudBlocks');
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
});
