import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut, ApiError } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { isValidGitHubRepoFullName } from '../../shared/utils/githubValidation';
import type { ApiWorkspace, GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import './GitHubSync.css';

interface LinkedRepoState {
  repo: string;
  backendWorkspaceId: string;
}

/** Marker prefix added by CloudBlocks sync commits */
const CB_COMMIT_PREFIX = 'Sync architecture from CloudBlocks';

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const addActivity = useUIStore((s) => s.addActivity);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const [linkedRepoState, setLinkedRepoState] = useState<LinkedRepoState | null>(
    workspace.githubRepo
      ? {
        repo: workspace.githubRepo,
        backendWorkspaceId: workspace.backendWorkspaceId ?? workspace.id,
      }
      : null
  );
  const linkedRepo = linkedRepoState?.repo ?? null;
  const backendWorkspaceId = linkedRepoState?.backendWorkspaceId ?? null;

  const [repoInput, setRepoInput] = useState('');
  const [backendWorkspaceIdInput, setBackendWorkspaceIdInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('Sync architecture from CloudBlocks');
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitRefreshError, setCommitRefreshError] = useState<string | null>(null);
  const [pullConfirmPending, setPullConfirmPending] = useState(false);
  const [lastSyncSha, setLastSyncSha] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [dirtyFlag, setDirtyFlag] = useState(false);
  const [pullSummary, setPullSummary] = useState<string | null>(null);
  const [backendMeta, setBackendMeta] = useState<{ github_branch: string; default_branch?: string; repoPrivate?: boolean } | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const showRef = useRef(show);
  const authRef = useRef(isAuthenticated);
  const workspaceIdRef = useRef(workspace.id);
  const linkedRepoRef = useRef(linkedRepo);
  const effectiveWorkspaceIdRef = useRef<string | null>(null);
  const archSnapshotAtSyncRef = useRef<string | null>(null);

  const trimmedCommitMessage = commitMessage.trim();
  const busy = linking || syncing || pulling;

  useEffect(() => {
    if (workspace.githubRepo) {
      setLinkedRepoState({
        repo: workspace.githubRepo,
        backendWorkspaceId: workspace.backendWorkspaceId ?? workspace.id,
      });
      return;
    }

    setLinkedRepoState(null);
  }, [workspace.githubRepo, workspace.backendWorkspaceId, workspace.id]);

  useEffect(() => () => {
    mountedRef.current = false;
    requestSeqRef.current += 1;
  }, []);

  // Dirty detection: compare current architecture against snapshot at last sync
  useEffect(() => {
    if (!archSnapshotAtSyncRef.current) return;
    const currentSnapshot = JSON.stringify(workspace.architecture);
    setDirtyFlag(currentSnapshot !== archSnapshotAtSyncRef.current);
  }, [workspace.architecture]);

  const effectiveWorkspaceId = backendWorkspaceId;
  const anyLoading = busy || loadingCommits;
  const canSync = !anyLoading && trimmedCommitMessage.length > 0;

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

    setLoadingCommits(true);
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
        setLoadingCommits(false);
      }
    }
  }, [effectiveWorkspaceId, linkedRepo, workspace.id]);

  // Fetch backend workspace metadata for branch context (#851, #854, #855, #856)
  const loadBackendMeta = useCallback(async () => {
    if (!effectiveWorkspaceId) return;
    try {
      const meta = await apiGet<ApiWorkspace>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}`
      );
      setBackendMeta({
        github_branch: meta.github_branch,
        default_branch: undefined, // filled from repo list if available
        repoPrivate: undefined,
      });
      if (meta.last_synced_at) {
        setLastSyncedAt(meta.last_synced_at);
        // Take snapshot of current architecture for dirty comparison
        if (!archSnapshotAtSyncRef.current) {
          archSnapshotAtSyncRef.current = JSON.stringify(workspace.architecture);
        }
      }
    } catch {
      // non-critical
    }
  }, [effectiveWorkspaceId, workspace.architecture]);

  useEffect(() => {
    if (!show || !isAuthenticated || !linkedRepo) return;
    void loadCommits();
    void loadBackendMeta();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [show, isAuthenticated, linkedRepo, loadCommits, loadBackendMeta]);

  if (!show) return null;

  const isAuthError = (err: unknown): boolean =>
    err instanceof ApiError && (err.status === 401 || err.status === 403);

  const handleAuthFailure = () => {
    setError('Authentication expired. Please sign in again.');
    toggleGitHubSync();
    toggleGitHubLogin();
  };

  // Close handler: confirm if busy (#858)
  const handleClose = async () => {
    if (busy) {
      const ok = await confirmDialog(
        'A GitHub action is in progress. Closing hides the panel but the action continues. Close anyway?',
        'Action In Progress',
      );
      if (!ok) return;
    }
    toggleGitHubSync();
  };

  const handleLinkRepo = async () => {
    const cleanedRepo = repoInput.trim();
    if (!isValidGitHubRepoFullName(cleanedRepo)) {
      setError('Repository must be in owner/repo format.');
      return;
    }

    const bwsId = backendWorkspaceIdInput.trim() || workspace.id;

    setLinking(true);
    setError(null);

    try {
      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, {
        github_repo: cleanedRepo,
      });

      setLinkedRepoState({ repo: cleanedRepo, backendWorkspaceId: bwsId });
      setStoreGithubRepo(workspace.id, cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
      addActivity('link', `Linked repo ${cleanedRepo}`);
    } catch (err) {
      if (isAuthError(err)) { handleAuthFailure(); return; }
      setError(err instanceof Error ? err.message : 'Failed to link repository.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = () => {
    requestSeqRef.current += 1;
    setLinkedRepoState(null);
    setRepoInput('');
    setBackendWorkspaceIdInput('');
    setCommits([]);
    setError(null);
    setCommitRefreshError(null);
    setPullConfirmPending(false);
    setLastSyncSha(null);
    setLastSyncedAt(null);
    setDirtyFlag(false);
    setPullSummary(null);
    setBackendMeta(null);
    archSnapshotAtSyncRef.current = null;
    setStoreGithubRepo(workspace.id, undefined);
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId || !canSync) return;

    setSyncing(true);
    setError(null);
    try {
      const resp = await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: trimmedCommitMessage,
      });
      setLastSyncSha(resp.commit_sha);
      setLastSyncedAt(new Date().toISOString());
      archSnapshotAtSyncRef.current = JSON.stringify(workspace.architecture);
      setDirtyFlag(false);
      toast.success('Synced to GitHub');
      addActivity('sync', `Synced to GitHub (${resp.commit_sha.slice(0, 7)})`);
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      if (isAuthError(err)) { handleAuthFailure(); return; }
      setError(err instanceof Error ? err.message : 'Failed to sync workspace.');
      addActivity('sync-error', err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handlePullRequest = () => {
    setPullConfirmPending(true);
  };

  const handlePullConfirm = async () => {
    setPullConfirmPending(false);
    if (!effectiveWorkspaceId) return;

    setPulling(true);
    setError(null);
    setPullSummary(null);
    try {
      const prevArch = workspace.architecture;
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      replaceArchitecture(response.architecture as ArchitectureSnapshot);
      saveToStorage();

      // Generate a brief pull summary (#864)
      const newArch = response.architecture as Record<string, unknown>;
      const prevBlockCount = Array.isArray(prevArch.blocks) ? prevArch.blocks.length : 0;
      const newBlockCount = Array.isArray((newArch as { blocks?: unknown[] }).blocks) ? (newArch as { blocks: unknown[] }).blocks.length : 0;
      const summary = `Pulled from GitHub. Blocks: ${prevBlockCount} -> ${newBlockCount}. Use Undo (Ctrl+Z) to restore previous state.`;
      setPullSummary(summary);
      setLastSyncedAt(new Date().toISOString());
      archSnapshotAtSyncRef.current = JSON.stringify(response.architecture);
      setDirtyFlag(false);
      toast.success('Pulled from GitHub');
      addActivity('pull', summary);
      try {
        await loadCommits();
      } catch {
        // commit refresh failure is non-critical
      }
    } catch (err) {
      if (isAuthError(err)) { handleAuthFailure(); return; }
      setError(err instanceof Error ? err.message : 'Failed to pull from GitHub.');
      addActivity('pull-error', err instanceof Error ? err.message : 'Pull failed');
    } finally {
      setPulling(false);
    }
  };

  const handlePullCancel = () => {
    setPullConfirmPending(false);
  };

  const handleUndoPull = () => {
    const store = useArchitectureStore.getState();
    if (store.canUndo) {
      store.undo();
      setPullSummary(null);
      toast.success('Pull undone');
    }
  };

  const commitLinkUrl = linkedRepo
    ? `https://github.com/${linkedRepo}/commit/`
    : null;
  const repoUrl = linkedRepo ? `https://github.com/${linkedRepo}` : null;
  const branchUrl = linkedRepo && backendMeta?.github_branch
    ? `https://github.com/${linkedRepo}/tree/${backendMeta.github_branch}`
    : null;
  const isNonDefaultBranch = backendMeta && backendMeta.default_branch
    ? backendMeta.github_branch !== backendMeta.default_branch
    : false;

  return (
    <div className="github-sync">
      <div className="github-sync-header">
        <h3 className="github-sync-title">GitHub Sync</h3>
        <button type="button" className="github-sync-close" onClick={() => void handleClose()} aria-label="Close GitHub sync panel">
          ✕
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-sync-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-sync-empty">GitHub authentication required.</div>
      ) : (
        <>
          {/* Authenticated account context (#861) */}
          {user && (
            <div className="github-sync-account">
              Signed in as <strong>@{user.github_username ?? 'unknown'}</strong>
            </div>
          )}

          {linking && <div className="github-sync-loading">Linking repository...</div>}
          {syncing && <div className="github-sync-loading">Syncing to GitHub...</div>}
          {pulling && <div className="github-sync-loading">Pulling from GitHub...</div>}
          {loadingCommits && <div className="github-sync-loading">Loading recent commits...</div>}
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

              <button type="button" className="github-sync-primary-btn" onClick={() => void handleLinkRepo()} disabled={busy}>
                Link
              </button>
            </div>
          ) : (
            <div className="github-sync-content">
              {/* Linked repo with actionable link (#862) and visibility badge (#848) */}
              <div className="github-sync-meta">
                Linked repo:{' '}
                {repoUrl ? (
                  <a className="github-sync-repo-link" href={repoUrl} target="_blank" rel="noopener noreferrer">
                    <strong>{linkedRepo}</strong>
                  </a>
                ) : (
                  <strong>{linkedRepo}</strong>
                )}
                {backendMeta?.repoPrivate !== undefined && (
                  <span className={`github-sync-visibility-badge ${backendMeta.repoPrivate ? 'github-sync-badge-private' : 'github-sync-badge-public'}`}>
                    {backendMeta.repoPrivate ? 'private' : 'public'}
                  </span>
                )}
                <button type="button" className="github-sync-unlink-btn" onClick={handleUnlink}>
                  Unlink
                </button>
              </div>

              {/* Branch context (#851, #856) */}
              {backendMeta?.github_branch && (
                <div className="github-sync-branch-context">
                  Branch:{' '}
                  {branchUrl ? (
                    <a className="github-sync-repo-link" href={branchUrl} target="_blank" rel="noopener noreferrer">
                      <code>{backendMeta.github_branch}</code>
                    </a>
                  ) : (
                    <code>{backendMeta.github_branch}</code>
                  )}
                  {isNonDefaultBranch && (
                    <span className="github-sync-branch-warning"> (non-default; repo default is <code>{backendMeta.default_branch}</code>)</span>
                  )}
                </div>
              )}

              {/* Dirty indicator (#854) */}
              {lastSyncedAt && (
                <div className={`github-sync-dirty-indicator ${dirtyFlag ? 'github-sync-dirty' : 'github-sync-clean'}`}>
                  {dirtyFlag ? 'Local changes since last sync' : 'Clean (matches last sync)'}
                  {lastSyncedAt && <span className="github-sync-sync-time"> · Last sync: {new Date(lastSyncedAt).toLocaleString()}</span>}
                </div>
              )}

              <label className="github-sync-label" htmlFor="github-sync-commit-message">
                Commit message
              </label>
              <input
                id="github-sync-commit-message"
                className="github-sync-input"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                disabled={busy}
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

              {/* Post-pull diff summary and undo (#864) */}
              {pullSummary && (
                <div className="github-sync-pull-summary">
                  <div className="github-sync-pull-summary-text">{pullSummary}</div>
                  <button type="button" className="github-sync-secondary-btn" onClick={handleUndoPull}>
                    Undo Pull
                  </button>
                </div>
              )}

              {/* Recent commits with branch label (#855) and sync markers (#849, #865) */}
              <div className="github-sync-commits">
                <h4 className="github-sync-subtitle">
                  Recent commits
                  {backendMeta?.github_branch && (
                    <span className="github-sync-branch-label"> on <code>{backendMeta.github_branch}</code></span>
                  )}
                </h4>
                {commits.length === 0 ? (
                  <div className="github-sync-empty">No recent commits.</div>
                ) : (
                  commits.map((commit) => {
                    const isSyncPoint = lastSyncSha === commit.sha;
                    const isCloudBlocksCommit = commit.message.startsWith(CB_COMMIT_PREFIX);
                    return (
                      <div key={commit.sha} className={`github-sync-commit-item ${isSyncPoint ? 'github-sync-commit-sync-point' : ''}`}>
                        <div className="github-sync-commit-message">
                          {isCloudBlocksCommit && <span className="github-sync-cb-badge" title="Created by CloudBlocks">CB</span>}
                          {commit.message}
                        </div>
                        <div className="github-sync-commit-meta">
                          {isSyncPoint && <span className="github-sync-sync-marker">Last sync point · </span>}
                          {commit.author} · {new Date(commit.date).toLocaleString()} · {' '}
                          <a className="github-sync-commit-link" href={commit.html_url || `${commitLinkUrl ?? ''}${commit.sha}`} target="_blank" rel="noopener noreferrer">
                            {commit.sha.slice(0, 7)}
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
