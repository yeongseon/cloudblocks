import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({ apiPost: vi.fn(), apiGet: vi.fn() }));
import { GitHubLogin } from './GitHubLogin';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { apiPost } from '../../shared/api/client';
import type { BackendStatus } from '../../entities/store/uiStore';

describe('GitHubLogin', () => {
  const mockApiPost = vi.mocked(apiPost);

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useUIStore.setState({ showGitHubLogin: true });
    useAuthStore.setState({
      status: 'anonymous',
      user: null,
      hydrated: true,
      error: null,
    });
  });

  it('renders null when show is false', () => {
    useUIStore.setState({ showGitHubLogin: false });
    const { container } = render(<GitHubLogin />);
    expect(container.innerHTML).toBe('');
  });

  it('shows Sign in with GitHub when not authenticated', () => {
    render(<GitHubLogin />);
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();
  });

  it('shows user info when authenticated', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: 'octo@example.com',
        display_name: 'The Octocat',
        avatar_url: 'https://example.com/avatar.png',
      },
    });

    render(<GitHubLogin />);
    expect(screen.getByText('The Octocat')).toBeInTheDocument();
    expect(screen.getByText('@octocat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('sign in calls apiPost and redirects', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({
      authorize_url: `${window.location.origin}/#oauth-callback`,
    });

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/auth/github');
    expect(sessionStorage.getItem('github_oauth_state')).toBeNull();
    expect(window.location.href).toContain('#oauth-callback');
  });

  it('sign out calls logout from authStore and closes panel', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn<() => Promise<BackendStatus>>().mockImplementation(async () => {
      useAuthStore.setState({ status: 'anonymous', user: null });
    });
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: 'The Octocat',
        avatar_url: null,
      },
      logout: logoutMock,
    });

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(useUIStore.getState().showGitHubLogin).toBe(false);
  });

  it('keeps panel open when sign out does not change authenticated status', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn<() => Promise<BackendStatus>>().mockImplementation(async () => {
      useAuthStore.setState({ status: 'authenticated', error: 'Logout failed. Checking session…' });
    });
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: 'The Octocat',
        avatar_url: null,
      },
      logout: logoutMock,
    });

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
    expect(screen.getByText('Logout failed. Checking session…')).toBeInTheDocument();
  });

  it('clears pending GitHub action before OAuth redirect', async () => {
    const user = userEvent.setup();
    useUIStore.getState().setPendingGitHubAction('sync');
    mockApiPost.mockResolvedValueOnce({
      authorize_url: `${window.location.origin}/#oauth-callback`,
    });

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(useUIStore.getState().pendingGitHubAction).toBe(null);
    expect(sessionStorage.getItem('cloudblocks_pending_github_action')).toBeNull();
  });

  it('shows error when sign in fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('Server unavailable'));

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
  });

  it('shows fallback error message for non-Error thrown value on sign in', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce('string error');

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(await screen.findByText('Failed to start GitHub login.')).toBeInTheDocument();
  });

  it('shows user info without avatar, falls back to github_username', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });

    render(<GitHubLogin />);
    expect(screen.getByText('octocat')).toBeInTheDocument();
    expect(screen.getByText('@octocat')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows Unknown User when both display_name and github_username are null', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: null,
        email: null,
        display_name: null,
        avatar_url: null,
      },
    });

    render(<GitHubLogin />);
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('shows user info without github username', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: null,
        email: null,
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      },
    });

    render(<GitHubLogin />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@unknown')).toBeInTheDocument();
  });

  it('close button has accessible label and toggles panel', async () => {
    const user = userEvent.setup();
    render(<GitHubLogin />);
    const closeBtn = screen.getByRole('button', { name: 'Close GitHub login panel' });
    await user.click(closeBtn);
    expect(useUIStore.getState().showGitHubLogin).toBe(false);
  });

  it('shows loading indicator during sign in', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValueOnce(
      new Promise((r) => {
        resolvePost = r;
      }),
    );

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolvePost({ authorize_url: 'https://github.com' });
  });

  it('displays authError from store', () => {
    useAuthStore.setState({
      status: 'anonymous',
      error: 'OAuth failed',
    });
    render(<GitHubLogin />);
    expect(screen.getByText('OAuth failed')).toBeInTheDocument();
  });

  it('resets local state on remount (simulating panel close and reopen)', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('Server down'));

    const { unmount } = render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    expect(await screen.findByText('Server down')).toBeInTheDocument();

    unmount();
    useAuthStore.setState({ error: null });
    render(<GitHubLogin />);

    expect(screen.queryByText('Server down')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
