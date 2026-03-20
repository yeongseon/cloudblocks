import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../shared/api/client', () => ({ apiPost: vi.fn(), apiGet: vi.fn() }));
import { GitHubLogin } from './GitHubLogin';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { apiPost } from '../../shared/api/client';

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

  it('sign out calls setAnonymous', async () => {
    const user = userEvent.setup();
    const setAnonymousSpy = vi.spyOn(useAuthStore.getState(), 'setAnonymous');
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        github_username: 'octocat',
        email: null,
        display_name: 'The Octocat',
        avatar_url: null,
      },
    });
    mockApiPost.mockResolvedValueOnce({ message: 'ok' });

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(setAnonymousSpy).toHaveBeenCalledOnce();
    setAnonymousSpy.mockRestore();
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

  it('shows user info without avatar', () => {
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
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
    expect(screen.getByText('@octocat')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
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

  it('close button toggles panel', async () => {
    const user = userEvent.setup();
    render(<GitHubLogin />);
    await user.click(screen.getByText('✕'));
    expect(useUIStore.getState().showGitHubLogin).toBe(false);
  });

  it('shows loading indicator during sign in', async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    mockApiPost.mockReturnValueOnce(new Promise((r) => { resolvePost = r; }));

    render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolvePost({ authorize_url: 'https://github.com' });
  });

  it('displays authError from store', () => {
    render(<GitHubLogin />);
    // Set auth error after mount (simulates external auth failure while panel is open)
    act(() => { useAuthStore.setState({ error: 'OAuth failed' }); });
    expect(screen.getByText('OAuth failed')).toBeInTheDocument();
  });

  it('resets local error and loading state on reopen', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));

    const { rerender } = render(<GitHubLogin />);
    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));
    expect(await screen.findByText('Network error')).toBeInTheDocument();

    // Close the panel
    useUIStore.setState({ showGitHubLogin: false });
    rerender(<GitHubLogin />);

    // Reopen the panel
    useUIStore.setState({ showGitHubLogin: true });
    rerender(<GitHubLogin />);

    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
