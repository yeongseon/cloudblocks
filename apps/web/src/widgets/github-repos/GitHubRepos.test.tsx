import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  isAuthError: vi.fn(() => false),
}));
import { GitHubRepos } from './GitHubRepos';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, isAuthError } from '../../shared/api/client';

describe('GitHubRepos', () => {
  const mockApiGet = vi.mocked(apiGet);
  const mockApiPost = vi.mocked(apiPost);
  const mockIsAuthError = vi.mocked(isAuthError);

  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showGitHubRepos: true, showGitHubSync: false, showGitHubLogin: false, pendingLinkRepo: null });
    useAuthStore.setState({
      status: 'authenticated',
      user: null,
      hydrated: true,
      error: null,
    });
    mockIsAuthError.mockReturnValue(false);
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
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/github/repos', {
      name: 'new-repo',
      description: '',
      private: true,
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('new-repo')).toBeInTheDocument();
  });

  it('keeps success message visible when refresh fails after create', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] }).mockRejectedValueOnce(new Error('Refresh failed'));
    mockApiPost.mockResolvedValueOnce({
      full_name: 'owner/new-repo',
      name: 'new-repo',
      private: true,
      default_branch: 'main',
      html_url: 'https://github.com/owner/new-repo',
    });

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Repository "new-repo" created successfully.')).toBeInTheDocument();
    expect(await screen.findByText('Refresh failed')).toBeInTheDocument();
  });

  it('resets private checkbox to true after successful create', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] }).mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockResolvedValueOnce({
      full_name: 'owner/new-repo',
      name: 'new-repo',
      private: false,
      default_branch: 'main',
      html_url: 'https://github.com/owner/new-repo',
    });

    render(<GitHubRepos />);

    const privateCheckbox = screen.getByRole('checkbox', { name: 'Private repository' });
    expect(privateCheckbox).toBeChecked();
    await user.click(privateCheckbox);
    expect(privateCheckbox).not.toBeChecked();

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByText('Repository "new-repo" created successfully.');
    expect(privateCheckbox).toBeChecked();
  });

  it('shows and wires Link this repo action after successful create', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] }).mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockResolvedValueOnce({
      full_name: 'owner/new-repo',
      name: 'new-repo',
      private: true,
      default_branch: 'main',
      html_url: 'https://github.com/owner/new-repo',
    });

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const linkButton = await screen.findByRole('button', { name: 'Link this repo' });
    expect(linkButton).toBeInTheDocument();
    await user.click(linkButton);

    expect(useUIStore.getState().pendingLinkRepo).toBe('owner/new-repo');
    expect(useUIStore.getState().showGitHubSync).toBe(true);
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

  it('routes auth error to login panel from repo fetch', async () => {
    const unauthorizedError = new Error('Unauthorized');
    mockApiGet.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubRepos />);

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('routes auth error to login panel from repo create', async () => {
    const user = userEvent.setup();
    const unauthorizedError = new Error('Unauthorized');
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockRejectedValueOnce(unauthorizedError);
    mockIsAuthError.mockReturnValueOnce(true);

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(useAuthStore.getState().error).toBe('Session expired. Please sign in again.');
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
  });

  it('does not create repo when name is empty', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });

    render(<GitHubRepos />);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('disables create button when repository name is empty', async () => {
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    render(<GitHubRepos />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    });
  });

  it('disables create button for invalid repository name characters', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'repo with spaces');

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('keeps create button disabled for invalid name and enabled for valid name', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    render(<GitHubRepos />);

    const createButton = screen.getByRole('button', { name: 'Create' });
    await user.type(screen.getByPlaceholderText('Repository name'), 'repo!name');
    expect(createButton).toBeDisabled();

    await user.clear(screen.getByPlaceholderText('Repository name'));
    await user.type(screen.getByPlaceholderText('Repository name'), 'repo-name');
    expect(createButton).toBeEnabled();
  });

  it('sends trimmed description when creating repository', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] }).mockResolvedValueOnce({ repos: [] });
    mockApiPost.mockResolvedValueOnce({
      full_name: 'owner/new-repo',
      name: 'new-repo',
      private: true,
      default_branch: 'main',
      html_url: 'https://github.com/owner/new-repo',
    });

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'new-repo');
    await user.type(screen.getByPlaceholderText('Description (optional)'), '  test description  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/github/repos', {
      name: 'new-repo',
      description: 'test description',
      private: true,
    });
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

  it('close button has accessible label and toggles panel', async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({ repos: [] });
    render(<GitHubRepos />);
    const closeBtn = screen.getByRole('button', { name: 'Close GitHub repos panel' });
    await user.click(closeBtn);
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
