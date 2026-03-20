import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { isValidGitHubRepoFullName } from '../../shared/utils/githubValidation';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import './GitHubSync.css';

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const diffMode = useUIStore((s) => s.diffMode);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);
  const setStoreGithubBranch = useArchitectureStore((s) => s.setGithubBranch);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);

  const linkedRepo = workspace.githubRepo ?? null;
  const backendWorkspaceId = workspace.backendWorkspaceId ?? null;
  const githubBranch = workspace.githubBranch ?? null;

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
  const prevWorkspaceIdRef = useRef(workspace.id);
  const prevShowRef = useRef(show);

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

  // #773 / #774: Reset draft state when workspace changes or panel reopens
  useEffect(() => {
    const workspaceChanged = prevWorkspaceIdRef.current !== workspace.id;
    const panelReopened = !prevShowRef.current && show;

    prevWorkspaceIdRef.current = workspace.id;
    prevShowRef.current = show;

    if (workspaceChanged || panelReopened) {
      setRepoInput('');
      setBackendWorkspaceIdInput('');
      setCommitMessage('Sync architecture from CloudBlocks');
      setError(null);
      setCommitRefreshError(null);
      setPullConfirmPending(false);
      // #756 / #774: Clear stale commits immediately on workspace switch
      if (workspaceChanged) {
        setCommits([]);
      }
    }
  }, [workspace.id, show]);

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

  // #772: Create a stale-response guard for action handlers
  const createActionGuard = () => {
    const capturedWorkspaceId = workspace.id;
    const capturedLinkedRepo = linkedRepo;
    const capturedBackendId = effectiveWorkspaceId;
    return () => (
      mountedRef.current
      && showRef.current
      && authRef.current
      && workspaceIdRef.current === capturedWorkspaceId
      && linkedRepoRef.current === capturedLinkedRepo
      && effectiveWorkspaceIdRef.current === capturedBackendId
    );
  };

  const handleLinkRepo = async () => {
    const cleanedRepo = repoInput.trim();
    if (!isValidGitHubRepoFullName(cleanedRepo)) {
      setError('Repository must be in owner/repo format.');
      return;
    }

    // #771: Prefer existing backendWorkspaceId, then input, then workspace.id
    const bwsId = backendWorkspaceIdInput.trim()
      || workspace.backendWorkspaceId
      || workspace.id;

    const isStale = createActionGuard();
    setLinkLoading(true);
    setError(null);

    try {
      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, {
        github_repo: cleanedRepo,
      });

      if (!isStale()) return;

      setStoreGithubRepo(workspace.id, cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
      // #779: Success feedback
      toast.success(`Linked to ${cleanedRepo} (workspace: ${bwsId})`);
    } catch (err) {
      if (!isStale()) return;
      setError(err instanceof Error ? err.message : 'Failed to link repository.');
    } finally {
      if (isStale()) {
        setLinkLoading(false);
      }
    }
  };

  // #761: Confirm before unlink; #754: Send backend update
  const handleUnlink = async () => {
    const confirmed = await confirmDialog(
      'This will remove the GitHub repository link for this workspace.',
      'Unlink Repository?',
    );
    if (!confirmed) return;

    // #754: Clear on backend
    if (effectiveWorkspaceId) {
      try {
        await apiPut(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}`, {
          github_repo: '',
        });
      } catch {
        // Best-effort backend clear; local state is authoritative for UI
      }
    }

    // #751: Clear both repo and backend workspace id
    setStoreGithubRepo(workspace.id, undefined as unknown as string);
    setStoreGithubBranch(workspace.id, undefined);
    setCommits([]);
    setError(null);
    setCommitRefreshError(null);
    toast.success('Repository unlinked.');
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId || !canSync) return;

    const isStale = createActionGuard();
    setSyncLoading(true);
    setError(null);
    try {
      // #744: Surface commit SHA from sync response
      const response = await apiPost<SyncResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
          architecture: workspace.architecture,
          commit_message: commitMessage,
        }
      );
      if (!isStale()) return;
      const shortSha = response.commit_sha?.slice(0, 7) ?? '';
      toast.success(`Synced to GitHub${shortSha ? ` (${shortSha})` : ''}`);
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      if (!isStale()) return;
      setError(err instanceof Error ? err.message : 'Failed to sync workspace.');
    } finally {
      if (isStale()) {
        setSyncLoading(false);
      }
    }
  };

  // #755: Block pull during diff review
  const handlePullRequest = () => {
    if (diffMode) {
      toast.error('Exit diff review before pulling from GitHub.');
      return;
    }
    setPullConfirmPending(true);
  };

  const handlePullConfirm = async () => {
    setPullConfirmPending(false);
    if (!effectiveWorkspaceId) return;

    const isStale = createActionGuard();
    setPullLoading(true);
    setError(null);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      if (!isStale()) return;
      replaceArchitecture(response.architecture as ArchitectureSnapshot);
      saveToStorage();
      // #778: Explicit pull success feedback
      toast.success('Pulled latest architecture from GitHub.');
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      if (!isStale()) return;
      setError(err instanceof Error ? err.message : 'Failed to pull from GitHub.');
    } finally {
      if (isStale()) {
        setPullLoading(false);
      }
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
        {/* #794: Show workspace name in header */}
        <h3 className="github-sync-title">GitHub Sync &mdash; {workspace.name}</h3>
        <button type="button" className="github-sync-close" onClick={toggleGitHubSync} aria-label="Close GitHub sync panel">
          ✕
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-sync-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-sync-empty">
          GitHub authentication required.
          {/* #781: Sign-in action from unauth state */}
          <button type="button" className="github-sync-signin-btn" onClick={toggleGitHubLogin}>
            Sign in with GitHub
          </button>
        </div>
      ) : (
        <>
          {anyLoading && <div className="github-sync-loading">Loading...</div>}
          {error && <div className="github-sync-error">{error}</div>}
          {/* #793: Show commit refresh error separately */}
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
                placeholder={workspace.backendWorkspaceId || workspace.id}
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
                {/* #765: Show backend workspace id */}
                {backendWorkspaceId && (
                  <span className="github-sync-backend-id"> (backend: {backendWorkspaceId})</span>
                )}
                {/* #748: Show linked branch */}
                {githubBranch && (
                  <span className="github-sync-branch"> &middot; branch: <code>{githubBranch}</code></span>
                )}
                <button type="button" className="github-sync-unlink-btn" onClick={() => void handleUnlink()}>
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
                        {commitLinkUrl ? (
                          <a
                            className="github-sync-commit-link"
                            href={`${commitLinkUrl}${commit.sha}`}
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
