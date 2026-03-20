import { useCallback, useEffect, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost } from '../../shared/api/client';
import { isValidGitHubRepoName } from '../../shared/utils/githubValidation';
import type { GitHubRepo } from '../../shared/types/api';
import './GitHubRepos.css';

export function GitHubRepos() {
  const show = useUIStore((s) => s.showGitHubRepos);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);

  // #783: Access store to pre-fill repo input in GitHubSync
  const workspace = useArchitectureStore((s) => s.workspace);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const cleanedRepoName = newRepoName.trim();
  const canCreateRepo = isValidGitHubRepoName(cleanedRepoName);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ repos: GitHubRepo[] }>('/api/v1/github/repos');
      setRepos(response.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!show || !isAuthenticated) return;
    void fetchRepos();
  }, [show, isAuthenticated, fetchRepos]);

  if (!show) return null;

  const handleCreateRepo = async () => {
    if (!canCreateRepo) {
      setError('Repository name can only include letters, numbers, hyphens, underscores, and dots.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await apiPost<GitHubRepo>('/api/v1/github/repos', {
        name: cleanedRepoName,
        description: newRepoDescription.trim() || undefined,
        private: isPrivate,
      });
      setNewRepoName('');
      setNewRepoDescription('');
      setIsPrivate(false);
      await fetchRepos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository.');
    } finally {
      setCreating(false);
    }
  };

  // #783: Select a repo and hand it to GitHubSync
  const handleSelectRepo = (fullName: string) => {
    // Set the repo directly in the store if there's a backend workspace id
    // Otherwise just open the Sync panel pre-linked
    if (workspace.backendWorkspaceId) {
      setStoreGithubRepo(workspace.id, fullName);
    } else {
      // Set the repo + use workspace.id as fallback backend workspace id
      setStoreGithubRepo(workspace.id, fullName);
      setStoreBackendWorkspaceId(workspace.id, workspace.id);
    }
    toggleGitHubRepos();
    toggleGitHubSync();
  };

  return (
    <div className="github-repos">
      <div className="github-repos-header">
        <h3 className="github-repos-title">GitHub Repos</h3>
        <button type="button" className="github-repos-close" onClick={toggleGitHubRepos} aria-label="Close GitHub repos panel">
          ✕
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-repos-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-repos-empty">
          GitHub authentication required.
          {/* #786: Sign-in action from unauth state */}
          <button type="button" className="github-repos-signin-btn" onClick={toggleGitHubLogin}>
            Sign in with GitHub
          </button>
        </div>
      ) : (
        <>
          {(loading || creating) && <div className="github-repos-loading">Loading...</div>}
          {error && <div className="github-repos-error">{error}</div>}

          <div className="github-repos-create">
            <h4 className="github-repos-subtitle">Create New Repo</h4>
            <input
              className="github-repos-input"
              type="text"
              placeholder="Repository name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
            />
            <input
              className="github-repos-input"
              type="text"
              placeholder="Description (optional)"
              value={newRepoDescription}
              onChange={(e) => setNewRepoDescription(e.target.value)}
            />
            <label className="github-repos-checkbox-row">
              <input
                className="github-repos-checkbox"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span>Private repository</span>
            </label>
            <button type="button" className="github-repos-create-btn" onClick={handleCreateRepo} disabled={creating || !canCreateRepo}>
              Create
            </button>
          </div>

          <div className="github-repos-list">
            {repos.length === 0 && !loading ? (
              <div className="github-repos-empty">No repositories found.</div>
            ) : (
              repos.map((repo) => (
                <div key={repo.full_name} className="github-repos-item">
                  <div className="github-repos-item-main">
                    <span className="github-repos-name">{repo.name}</span>
                    <span className={`github-repos-badge ${repo.private ? 'github-repos-badge-private' : 'github-repos-badge-public'}`}>
                      {repo.private ? 'private' : 'public'}
                    </span>
                  </div>
                  <div className="github-repos-item-actions">
                    <a className="github-repos-link" href={repo.html_url} target="_blank" rel="noreferrer">
                      {repo.html_url}
                    </a>
                    {/* #783: Use this repo button */}
                    <button
                      type="button"
                      className="github-repos-select-btn"
                      onClick={() => handleSelectRepo(repo.full_name)}
                      title={`Link ${repo.full_name} to this workspace`}
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
