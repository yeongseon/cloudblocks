import { useCallback, useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut } from '../../shared/api/client';
import { isValidGitHubRepoFullName } from '../../shared/utils/githubValidation';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import './GitHubSync.css';

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);

  const linkedRepo = workspace.githubRepo ?? null;
  const backendWorkspaceId = workspace.backendWorkspaceId ?? null;

  const [repoInput, setRepoInput] = useState('');
  const [backendWorkspaceIdInput, setBackendWorkspaceIdInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('Sync architecture from CloudBlocks');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitRefreshError, setCommitRefreshError] = useState<string | null>(null);
  const [pullConfirmPending, setPullConfirmPending] = useState(false);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const showRef = useRef(show);
  const authRef = useRef(isAuthenticated);
  const workspaceIdRef = useRef(workspace.id);
  const linkedRepoRef = useRef(linkedRepo);
  const effectiveWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
    requestSeqRef.current += 1;
  }, []);

  const effectiveWorkspaceId = backendWorkspaceId;
  const anyLoading = linkLoading || syncLoading || pullLoading || commitsLoading;
  const canSync = !anyLoading && commitMessage.trim().length > 0;

  showRef.current = show;
  authRef.current = isAuthenticated;
  workspaceIdRef.current = workspace.id;
  linkedRepoRef.current = linkedRepo;
  effectiveWorkspaceIdRef.current = effectiveWorkspaceId;

  const loadCommits = useCallback(async () => {
    if (!linkedRepo || !effectiveWorkspaceId) return;

    const requestSeq = ++requestSeqRef.current;
    const requestWorkspaceId = workspace.id;
    const requestLinkedRepo = linkedRepo;
    const requestBackendWorkspaceId = effectiveWorkspaceId;

    const canApply = () => (
      mountedRef.current
      && requestSeq === requestSeqRef.current
      && showRef.current
      && authRef.current
      && workspaceIdRef.current === requestWorkspaceId
      && linkedRepoRef.current === requestLinkedRepo
      && effectiveWorkspaceIdRef.current === requestBackendWorkspaceId
    );

    setCommitsLoading(true);
    setCommitRefreshError(null);
    try {
      const response = await apiGet<{ commits: GitHubCommit[] }>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/commits`
      );
      if (!canApply()) return;
      setCommits(response.commits);
    } catch (err) {
      if (!canApply()) return;
      setCommitRefreshError(err instanceof Error ? err.message : 'Failed to load commits.');
    } finally {
      if (canApply()) {
        setCommitsLoading(false);
      }
    }
  }, [effectiveWorkspaceId, linkedRepo, workspace.id]);

  useEffect(() => {
    if (!show || !isAuthenticated || !linkedRepo) return;
    void loadCommits();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [show, isAuthenticated, linkedRepo, loadCommits]);

  if (!show) return null;

  const handleLinkRepo = async () => {
    const cleanedRepo = repoInput.trim();
    if (!isValidGitHubRepoFullName(cleanedRepo)) {
      setError('Repository must be in owner/repo format.');
      return;
    }

    const bwsId = backendWorkspaceIdInput.trim() || workspace.id;

    setLinkLoading(true);
    setError(null);

    try {
      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, {
        github_repo: cleanedRepo,
      });

      setStoreGithubRepo(workspace.id, cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repository.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlink = () => {
    setStoreGithubRepo(workspace.id, undefined as unknown as string);
    setCommits([]);
    setError(null);
    setCommitRefreshError(null);
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId || !canSync) return;

    setSyncLoading(true);
    setError(null);
    try {
      await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: commitMessage,
      });
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync workspace.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullRequest = () => {
    setPullConfirmPending(true);
  };

  const handlePullConfirm = async () => {
    setPullConfirmPending(false);
    if (!effectiveWorkspaceId) return;

    setPullLoading(true);
    setError(null);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      replaceArchitecture(response.architecture as ArchitectureSnapshot);
      saveToStorage();
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull from GitHub.');
    } finally {
      setPullLoading(false);
    }
  };

  const handlePullCancel = () => {
    setPullConfirmPending(false);
  };

  const commitLinkUrl = linkedRepo
    ? `https://github.com/${linkedRepo}/commit/`
    : null;

  return (
    <div className="github-sync">
      <div className="github-sync-header">
        <h3 className="github-sync-title">🔄 GitHub Sync</h3>
        <button type="button" className="github-sync-close" onClick={toggleGitHubSync} aria-label="Close GitHub sync panel">
          ✕
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-sync-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-sync-empty">GitHub authentication required.</div>
      ) : (
        <>
          {anyLoading && <div className="github-sync-loading">Loading...</div>}
          {error && <div className="github-sync-error">{error}</div>}
          {commitRefreshError && (
            <div className="github-sync-warning">Commit list refresh failed: {commitRefreshError}</div>
          )}

          {!linkedRepo ? (
            <div className="github-sync-linker">
              <div className="github-sync-empty">No GitHub repo linked.</div>
              <button type="button" className="github-sync-open-repos" onClick={toggleGitHubRepos}>
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

              <button type="button" className="github-sync-primary-btn" onClick={() => void handleLinkRepo()} disabled={linkLoading}>
                Link
              </button>
            </div>
          ) : (
            <div className="github-sync-content">
              <div className="github-sync-meta">
                Linked repo: <strong>{linkedRepo}</strong>
                <button type="button" className="github-sync-unlink-btn" onClick={handleUnlink}>
                  Unlink
                </button>
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
                <button type="button" className="github-sync-primary-btn" onClick={handleSync} disabled={!canSync}>
                  Sync to GitHub
                </button>
                <button type="button" className="github-sync-secondary-btn" onClick={handlePullRequest} disabled={anyLoading}>
                  Pull from GitHub
                </button>
              </div>

              {pullConfirmPending && (
                <div className="github-sync-confirm">
                  <div className="github-sync-confirm-message">
                    Pull will overwrite your local workspace. Continue?
                  </div>
                  <div className="github-sync-confirm-actions">
                    <button type="button" className="github-sync-primary-btn" onClick={() => void handlePullConfirm()}>
                      Confirm Pull
                    </button>
                    <button type="button" className="github-sync-secondary-btn" onClick={handlePullCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="github-sync-commits">
                <h4 className="github-sync-subtitle">Recent commits</h4>
                {commits.length === 0 ? (
                  <div className="github-sync-empty">No recent commits.</div>
                ) : (
                  commits.map((commit) => (
                    <div key={commit.sha} className="github-sync-commit-item">
                      <div className="github-sync-commit-message">{commit.message}</div>
                      <div className="github-sync-commit-meta">
                        {commit.author} · {new Date(commit.date).toLocaleString()} ·{' '}
                        {(commit.html_url || commitLinkUrl) ? (
                          <a
                            className="github-sync-commit-link"
                            href={commit.html_url || `${commitLinkUrl}${commit.sha}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {commit.sha.slice(0, 7)}
                          </a>
                        ) : (
                          commit.sha.slice(0, 7)
                        )}
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
