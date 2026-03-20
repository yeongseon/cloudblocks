import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));
import { GitHubRepos } from './GitHubRepos';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost } from '../../shared/api/client';

describe('GitHubRepos', () => {
  const mockApiGet = vi.mocked(apiGet);
  const mockApiPost = vi.mocked(apiPost);

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showGitHubRepos: true });
    useAuthStore.setState({
      status: 'authenticated',
      user: null,
      hydrated: true,
      error: null,
    });
  });

  it('renders null when show is false', () => {
    useUIStore.setState({ showGitHubRepos: false });
    const { container } = render(<GitHubRepos />);
    expect(container.innerHTML).toBe('');
  });

  it('shows not authenticated message when not logged in', () => {
    useAuthStore.setState({ status: 'anonymous' });
    render(<GitHubRepos />);
    expect(screen.getByText('GitHub authentication required.')).toBeInTheDocument();
  });

  it('renders repo list after fetch', async () => {
    mockApiGet.mockResolvedValueOnce({
      repos: [
        {
          full_name: 'owner/repo-one',
          name: 'repo-one',
          private: false,
          default_branch: 'main',
          html_url: 'https://github.com/owner/repo-one',
        },
      ],
    });

    render(<GitHubRepos />);

    expect(await screen.findByText('repo-one')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/owner/repo-one')).toBeInTheDocument();
  });

  it('creates new repo and refreshes list', async () => {
    const user = userEvent.setup();
    mockApiGet
      .mockResolvedValueOnce({ repos: [] })
      .mockResolvedValueOnce({
        repos: [
          {
            full_name: 'owner/new-repo',
            name: 'new-repo',
            private: true,
            default_branch: 'main',
            html_url: 'https://github.com/owner/new-repo',
          },
        ],
      });
    mockApiPost.mockResolvedValueOnce({
      full_name: 'owner/new-repo',
      name: 'new-repo',
      private: true,
      default_branch: 'main',
      html_url: 'https://github.com/owner/new-repo',
    });

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByLabelText('Private repository'));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/github/repos', {
      name: 'new-repo',
      private: true,
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('new-repo')).toBeInTheDocument();
  });

  it('shows error when fetch repos fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    render(<GitHubRepos />);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('shows fallback error message when fetch throws non-Error', async () => {
    mockApiGet.mockRejectedValueOnce('string error');

    render(<GitHubRepos />);

    expect(await screen.findByText('Failed to load repositories.')).toBeInTheDocument();
  });

  it('does not create repo when name is empty', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });

    render(<GitHubRepos />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('shows error when create repo fails', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockRejectedValueOnce(new Error('Create failed'));

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback error when create repo throws non-Error', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockRejectedValueOnce('string error');

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Failed to create repository.')).toBeInTheDocument();
  });

  it('shows private badge for private repos', async () => {
    mockApiGet.mockResolvedValueOnce({
      repos: [
        {
          full_name: 'owner/private-repo',
          name: 'private-repo',
          private: true,
          default_branch: 'main',
          html_url: 'https://github.com/owner/private-repo',
        },
      ],
    });

    render(<GitHubRepos />);

    expect(await screen.findByText('private')).toBeInTheDocument();
  });

  it('close button toggles panel', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    render(<GitHubRepos />);
    await user.click(screen.getByText('✕'));
    expect(useUIStore.getState().showGitHubRepos).toBe(false);
  });

  it('shows loading state while creating', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValueOnce(new Promise((r) => { resolvePost = r; }));

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolvePost({ full_name: 'owner/new-repo', name: 'new-repo', private: false, default_branch: 'main', html_url: 'https://github.com/owner/new-repo' });
  });

  it('resets local state on remount (simulating panel close and reopen)', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({
      repos: [{ full_name: 'owner/repo', name: 'repo', private: false, default_branch: 'main', html_url: 'https://github.com/owner/repo' }],
    });

    const { unmount } = render(<GitHubRepos />);
    expect(await screen.findByText('repo')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Repository name'), 'draft-repo');

    mockApiGet.mockResolvedValueOnce({ repos: [] });
    unmount();
    render(<GitHubRepos />);

    expect(screen.getByPlaceholderText('Repository name')).toHaveValue('');
    expect(screen.queryByText('repo')).not.toBeInTheDocument();
  });
});
