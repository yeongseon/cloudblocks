import { useState } from 'react';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost } from '../../shared/api/client';
import { persistPendingGitHubAction } from './pendingAction';
import './GitHubLogin.css';

interface GitHubAuthStartResponse {
  authorize_url: string;
}

export function GitHubLogin() {
  const show = useUIStore((s) => s.showGitHubLogin);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);

  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const authError = useAuthStore((s) => s.error);
  const setError = useAuthStore((s) => s.setError);
  const logout = useAuthStore((s) => s.logout);

  const [isWorking, setIsWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!show) return null;

  const handleSignIn = async () => {
    setIsWorking(true);
    setLocalError(null);
    setError(null);

    // Persist the pending action so we can resume after OAuth (#836)
    const ui = useUIStore.getState();
    if (ui.showGitHubSync) {
      persistPendingGitHubAction('sync');
    } else if (ui.showGitHubPR) {
      persistPendingGitHubAction('pr');
    } else if (ui.showGitHubRepos) {
      persistPendingGitHubAction('repos');
    } else {
      persistPendingGitHubAction('login');
    }

    try {
      const response = await apiPost<GitHubAuthStartResponse>('/api/v1/auth/github');
      window.location.href = response.authorize_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start GitHub login.';
      setLocalError(message);
      setError(message);
      persistPendingGitHubAction(null);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSignOut = async () => {
    setIsWorking(true);
    setLocalError(null);
    setError(null);

    await logout();

    setIsWorking(false);

    // Only close if logout actually succeeded (#838)
    const currentStatus = useAuthStore.getState().status;
    const currentError = useAuthStore.getState().error;
    if (currentStatus !== 'authenticated' && !currentError) {
      toggleGitHubLogin();
    }
    // If still authenticated or error set, panel stays open so user sees the problem
  };

  return (
    <div className="github-login">
      <div className="github-login-header">
        <h3 className="github-login-title">GitHub Login</h3>
        <button type="button" className="github-login-close" onClick={toggleGitHubLogin} aria-label="Close GitHub login panel">
          x
        </button>
      </div>

      <div className="github-login-content">
        {isWorking && <div className="github-login-loading">Loading...</div>}
        {(localError || authError) && <div className="github-login-error">{localError || authError}</div>}

        {status === 'unknown' ? (
          <div className="github-login-loading">Checking authentication...</div>
        ) : status === 'authenticated' ? (
          <div className="github-login-user">
            {user?.avatar_url && (
              <img
                className="github-login-avatar"
                src={user.avatar_url}
                alt={user.display_name ?? user.github_username ?? 'GitHub user'}
              />
            )}
            <div className="github-login-user-info">
              <div className="github-login-user-name">{user?.display_name ?? user?.github_username ?? 'Unknown User'}</div>
              <div className="github-login-user-username">@{user?.github_username ?? 'unknown'}</div>
            </div>
            <button type="button" className="github-login-signout" onClick={handleSignOut} disabled={isWorking}>
              Sign Out
            </button>
          </div>
        ) : (
          <button type="button" className="github-login-signin" onClick={handleSignIn} disabled={isWorking}>
            Sign in with GitHub
          </button>
        )}
      </div>
    </div>
  );
}
