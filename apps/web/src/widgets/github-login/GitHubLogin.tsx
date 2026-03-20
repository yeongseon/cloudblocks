import { useEffect, useState } from 'react';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost } from '../../shared/api/client';
import './GitHubLogin.css';

interface GitHubAuthStartResponse {
  authorize_url: string;
}

export function GitHubLogin() {
  const show = useUIStore((s) => s.showGitHubLogin);

  if (!show) return null;

  return <GitHubLoginContent />;
}

function GitHubLoginContent() {
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);

  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const authError = useAuthStore((s) => s.error);
  const setError = useAuthStore((s) => s.setError);
  const setAnonymous = useAuthStore((s) => s.setAnonymous);

  const [isWorking, setIsWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear stale auth-store error on mount (panel open)
  useEffect(() => { setError(null); }, [setError]);

  const handleSignIn = async () => {
    setIsWorking(true);
    setLocalError(null);
    setError(null);

    try {
      const response = await apiPost<GitHubAuthStartResponse>('/api/v1/auth/github');
      window.location.href = response.authorize_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start GitHub login.';
      setLocalError(message);
      setError(message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSignOut = async () => {
    setIsWorking(true);
    setLocalError(null);
    setError(null);

    await apiPost<{ message: string }>('/api/v1/auth/logout').catch(() => {});
    setAnonymous();

    setIsWorking(false);
  };

  return (
    <div className="github-login">
      <div className="github-login-header">
        <h3 className="github-login-title">🔐 GitHub Login</h3>
        <button className="github-login-close" onClick={toggleGitHubLogin}>
          ✕
        </button>
      </div>

      <div className="github-login-content">
        {isWorking && <div className="github-login-loading">Loading...</div>}
        {(localError || authError) && <div className="github-login-error">{localError || authError}</div>}

        {status === 'authenticated' ? (
          <div className="github-login-user">
            {user?.avatar_url && (
              <img
                className="github-login-avatar"
                src={user.avatar_url}
                alt={user.display_name ?? user.github_username ?? 'GitHub user'}
              />
            )}
            <div className="github-login-user-info">
              <div className="github-login-user-name">{user?.display_name ?? 'Unknown User'}</div>
              <div className="github-login-user-username">@{user?.github_username ?? 'unknown'}</div>
            </div>
            <button className="github-login-signout" onClick={handleSignOut} disabled={isWorking}>
              Sign Out
            </button>
          </div>
        ) : (
          <button className="github-login-signin" onClick={handleSignIn} disabled={isWorking}>
            Sign in with GitHub
          </button>
        )}
      </div>
    </div>
  );
}
