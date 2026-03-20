import { useCallback, useEffect, useMemo, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut, getApiErrorMessage } from '../../shared/api/client';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import './GitHubSync.css';

function parseRepoName(repo: string): { owner: string; name: string } | null {
  const trimmed = repo.trim();
  const [owner, name, ...rest] = trimmed.split('/');
  if (owner == null || name == null || owner.length === 0 || name.length === 0 || rest.length > 0) {
    return null;
  }

  return { owner, name };
}

function notifyError(message: string): void {
  try {
    window.alert(message);
  } catch {}
}

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';

  const [repoInput, setRepoInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('Sync architecture from CloudBlocks');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedRepo = useMemo(() => {
    if (workspace.repoOwner == null || workspace.repoName == null) {
      return null;
    }

    return `${workspace.repoOwner}/${workspace.repoName}`;
  }, [workspace.repoOwner, workspace.repoName]);

  const effectiveWorkspaceId = useMemo(
    () => workspace.backendWorkspaceId ?? null,
    [workspace.backendWorkspaceId],
  );

  const requireBackendWorkspaceId = useCallback((): string | null => {
    if (effectiveWorkspaceId) {
      return effectiveWorkspaceId;
    }

    const message = 'Missing backend workspace ID. Open Workspace Manager and connect this workspace to the backend first.';
    setError(message);
    notifyError(message);
    return null;
  }, [effectiveWorkspaceId]);

  useEffect(() => {
    if (linkedRepo != null) {
      setRepoInput(linkedRepo);
    }
  }, [linkedRepo]);

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
      const message = getApiErrorMessage(err, 'Failed to load commits.');
      setError(message);
      notifyError(message);
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

    const backendWorkspaceId = requireBackendWorkspaceId();
    if (!backendWorkspaceId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const repoInfo = parseRepoName(cleanedRepo);
      if (repoInfo == null) {
        setError('Repository must be in owner/repo format.');
        return;
      }

      await apiPut(`/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}`, {
        github_repo: cleanedRepo,
      });

      useArchitectureStore.setState((state) => ({
        workspace: state.workspace.id === workspace.id
          ? {
            ...state.workspace,
            repoOwner: repoInfo.owner,
            repoName: repoInfo.name,
          }
          : state.workspace,
        workspaces: state.workspaces.map((currentWorkspace) =>
          currentWorkspace.id === workspace.id
            ? {
              ...currentWorkspace,
              repoOwner: repoInfo.owner,
              repoName: repoInfo.name,
            }
            : currentWorkspace,
        ),
      }));
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to link repository.');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const backendWorkspaceId = requireBackendWorkspaceId();
    if (!backendWorkspaceId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: commitMessage,
      });
      await loadCommits();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to sync workspace.');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    const backendWorkspaceId = requireBackendWorkspaceId();
    if (!backendWorkspaceId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pull`
      );
      replaceArchitecture(response.architecture as ArchitectureSnapshot);
      await loadCommits();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to pull from GitHub.');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="github-sync">
      <div className="github-sync-header">
        <h3 className="github-sync-title">🔄 GitHub Sync</h3>
        <button className="github-sync-close" onClick={toggleGitHubSync} aria-label="Close GitHub sync panel">
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
