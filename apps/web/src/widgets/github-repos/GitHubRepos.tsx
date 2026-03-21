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
  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const linkedRepo = useArchitectureStore((s) => s.workspace.githubRepo);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const cleanedRepoName = newRepoName.trim();
  const cleanedRepoDescription = newRepoDescription.trim();
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
    setSuccess(null);
    try {
      await apiPost<GitHubRepo>('/api/v1/github/repos', {
        name: cleanedRepoName,
        description: cleanedRepoDescription || undefined,
        private: isPrivate,
      });
      setSuccess(`Repository ${cleanedRepoName} created successfully.`);
      setNewRepoName('');
      setNewRepoDescription('');
      setIsPrivate(false);
      try {
        await fetchRepos();
      } catch {
        setSuccess((prev) => prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="github-repos">
      <div className="github-repos-header">
        <h3 className="github-repos-title">📦 GitHub Repos</h3>
        <button type="button" className="github-repos-close" onClick={toggleGitHubRepos} aria-label="Close GitHub repos panel">
          ✕
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
          {success && <div className="github-repos-success">{success}</div>}

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
                    <span className="github-repos-name">{repo.full_name}</span>
                    <span className="github-repos-name">{repo.name}</span>
                    <span className={`github-repos-badge ${repo.private ? 'github-repos-badge-private' : 'github-repos-badge-public'}`}>
                      {repo.private ? 'private' : 'public'}
                    </span>
                    {linkedRepo === repo.full_name && (
                      <span className="github-repos-badge github-repos-badge-public">Linked</span>
                    )}
                  </div>
                  <div className="github-repos-item-main">
                    <span className="github-repos-name">Default branch: {repo.default_branch}</span>
                  </div>
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
