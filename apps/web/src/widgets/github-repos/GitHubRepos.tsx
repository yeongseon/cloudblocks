import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost } from '../../shared/api/client';
import { isValidGitHubRepoName } from '../../shared/utils/githubValidation';
import { toast } from 'react-hot-toast';
import type { GitHubRepo } from '../../shared/types/api';
import './GitHubRepos.css';

export function GitHubRepos() {
  const show = useUIStore((s) => s.showGitHubRepos);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [lastCreatedRepo, setLastCreatedRepo] = useState<string | null>(null);
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
    setLastCreatedRepo(null);
    try {
      const created = await apiPost<GitHubRepo>('/api/v1/github/repos', {
        name: cleanedRepoName,
        description: newRepoDescription.trim() || undefined,
        private: isPrivate,
      });
      // Explicit success feedback (#840)
      toast.success(`Repository "${created.full_name}" created successfully!`);
      setLastCreatedRepo(created.full_name);
      setNewRepoName('');
      setNewRepoDescription('');
      setIsPrivate(false);
      try {
        await fetchRepos();
      } catch {
        // Repo refresh failure is non-critical — creation already succeeded (#840)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository.');
    } finally {
      setCreating(false);
    }
  };

  /** Hand created repo into the link flow (#841). */
  const handleLinkCreatedRepo = () => {
    if (!lastCreatedRepo) return;
    // Open GitHubSync panel so user can link the new repo
    const ui = useUIStore.getState();
    if (!ui.showGitHubSync) {
      ui.toggleGitHubSync();
    }
    toggleGitHubRepos();
    toast.success(`Open GitHub Sync and link "${lastCreatedRepo}" to continue.`);
  };

  return (
    <div className="github-repos">
      <div className="github-repos-header">
        <h3 className="github-repos-title">GitHub Repos</h3>
        <button type="button" className="github-repos-close" onClick={toggleGitHubRepos} aria-label="Close GitHub repos panel">
          x
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-repos-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-repos-empty">GitHub authentication required.</div>
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

          {/* Post-create handoff (#841) */}
          {lastCreatedRepo && (
            <div className="github-repos-created-banner">
              <span>Created: <strong>{lastCreatedRepo}</strong></span>
              <button type="button" className="github-repos-link-btn" onClick={handleLinkCreatedRepo}>
                Link to Workspace
              </button>
            </div>
          )}

          <div className="github-repos-list">
            {repos.length === 0 && !loading ? (
              <div className="github-repos-empty">No repositories found.</div>
            ) : (
              repos.map((repo) => (
                <div key={repo.full_name} className="github-repos-item">
                  <div className="github-repos-item-main">
                    {/* Full name + default branch (#833) */}
                    <span className="github-repos-name" title={repo.full_name}>{repo.full_name}</span>
                    <span className={`github-repos-badge ${repo.private ? 'github-repos-badge-private' : 'github-repos-badge-public'}`}>
                      {repo.private ? 'private' : 'public'}
                    </span>
                  </div>
                  {/* Default branch (#833) */}
                  <div className="github-repos-branch">Branch: {repo.default_branch}</div>
                  <a className="github-repos-link" href={repo.html_url} target="_blank" rel="noreferrer">
                    {repo.html_url}
                  </a>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
