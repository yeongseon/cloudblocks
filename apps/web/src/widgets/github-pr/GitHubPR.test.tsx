import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));
import { GitHubPR } from './GitHubPR';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { apiPost } from '../../shared/api/client';
import type { ArchitectureModel } from '../../shared/types/index';

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
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('renders null when hidden', () => {
    useUIStore.setState({ showGitHubPR: false });
    const { container } = render(<GitHubPR />);
    expect(container.innerHTML).toBe('');
  });

  it('shows auth required when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(<GitHubPR />);
    expect(screen.getByText('GitHub authentication required.')).toBeInTheDocument();
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
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/github/workspaces/ws-1/pr', {
        architecture: emptyArch,
        title: 'Update cloud architecture',
        body: '',
        branch: undefined,
        commit_message: 'Update architecture via CloudBlocks',
      });
    });

    expect(await screen.findByText('https://github.com/owner/repo/pull/42')).toBeInTheDocument();
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
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/github/workspaces/ws-1/pr', expect.objectContaining({
        branch: 'custom-branch',
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
    await user.click(screen.getByText('✕'));
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
});
