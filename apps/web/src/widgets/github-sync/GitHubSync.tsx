import { useCallback, useEffect, useMemo, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut } from '../../shared/api/client';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import './GitHubSync.css';

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);

  const workspace = useArchitectureStore((s) => s.workspace);
  const importArchitecture = useArchitectureStore((s) => s.importArchitecture);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';

  const [repoInput, setRepoInput] = useState('');
  const [backendWorkspaceIdInput, setBackendWorkspaceIdInput] = useState('');
  const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
  const [backendWorkspaceId, setBackendWorkspaceIdState] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('Sync architecture from CloudBlocks');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveWorkspaceId = useMemo(() => {
    if (backendWorkspaceId) return backendWorkspaceId;
    return workspace.id;
  }, [backendWorkspaceId, workspace.id]);

  const loadCommits = useCallback(async () => {
    if (!linkedRepo || !effectiveWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<{ commits: GitHubCommit[] }>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/commits`
      );
      setCommits(response.commits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commits.');
    } finally {
      setLoading(false);
    }
  }, [linkedRepo, effectiveWorkspaceId]);

  useEffect(() => {
    if (!show || !isAuthenticated || !linkedRepo) return;
    void loadCommits();
  }, [show, isAuthenticated, linkedRepo, effectiveWorkspaceId, loadCommits]);

  if (!show) return null;

  const handleLinkRepo = async () => {
    const cleanedRepo = repoInput.trim();
    if (!cleanedRepo || !cleanedRepo.includes('/')) {
      setError('Repository must be in owner/repo format.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bwsId = backendWorkspaceIdInput.trim() || workspace.id;
      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, {
        github_repo: cleanedRepo,
      });

      setLinkedRepo(cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
      setBackendWorkspaceIdState(bwsId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repository.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: commitMessage,
      });
      await loadCommits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!effectiveWorkspaceId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      importArchitecture(JSON.stringify(response.architecture));
      await loadCommits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull from GitHub.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="github-sync">
      <div className="github-sync-header">
        <h3 className="github-sync-title">🔄 GitHub Sync</h3>
        <button className="github-sync-close" onClick={toggleGitHubSync}>
          ✕
        </button>
      </div>

      {!isAuthenticated ? (
        <div className="github-sync-empty">GitHub authentication required.</div>
      ) : (
        <>
          {loading && <div className="github-sync-loading">Loading...</div>}
          {error && <div className="github-sync-error">{error}</div>}

          {!linkedRepo ? (
            <div className="github-sync-linker">
              <div className="github-sync-empty">No GitHub repo linked.</div>
              <button className="github-sync-open-repos" onClick={toggleGitHubRepos}>
                Open GitHub Repos
              </button>

              <label className="github-sync-label" htmlFor="github-sync-repo-input">
                Link Repository
              </label>
              <input
                id="github-sync-repo-input"
                className="github-sync-input"
                placeholder="owner/repo"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
              />

              <label className="github-sync-label" htmlFor="github-sync-backend-id-input">
                Backend Workspace ID (optional)
              </label>
              <input
                id="github-sync-backend-id-input"
                className="github-sync-input"
                placeholder={workspace.id}
                value={backendWorkspaceIdInput}
                onChange={(e) => setBackendWorkspaceIdInput(e.target.value)}
              />

              <button className="github-sync-primary-btn" onClick={() => void handleLinkRepo()} disabled={loading}>
                Link
              </button>
            </div>
          ) : (
            <div className="github-sync-content">
              <div className="github-sync-meta">
                Linked repo: <strong>{linkedRepo}</strong>
              </div>

              <label className="github-sync-label" htmlFor="github-sync-commit-message">
                Commit message
              </label>
              <input
                id="github-sync-commit-message"
                className="github-sync-input"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />

              <div className="github-sync-actions">
                <button className="github-sync-primary-btn" onClick={handleSync} disabled={loading}>
                  Sync to GitHub
                </button>
                <button className="github-sync-secondary-btn" onClick={handlePull} disabled={loading}>
                  Pull from GitHub
                </button>
              </div>

              <div className="github-sync-commits">
                <h4 className="github-sync-subtitle">Recent commits</h4>
                {commits.length === 0 ? (
                  <div className="github-sync-empty">No recent commits.</div>
                ) : (
                  commits.map((commit) => (
                    <div key={commit.sha} className="github-sync-commit-item">
                      <div className="github-sync-commit-message">{commit.message}</div>
                      <div className="github-sync-commit-meta">
                        {commit.author} · {new Date(commit.date).toLocaleString()} · {commit.sha.slice(0, 7)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
