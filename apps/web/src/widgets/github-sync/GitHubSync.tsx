import { useCallback, useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut, isAuthError } from '../../shared/api/client';
import { isValidGitHubRepoFullName } from '../../shared/utils/githubValidation';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import './GitHubSync.css';

interface LinkedRepoState {
  repo: string;
  backendWorkspaceId: string;
}

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const pendingLinkRepo = useUIStore((s) => s.pendingLinkRepo);
  const setPendingLinkRepo = useUIStore((s) => s.setPendingLinkRepo);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);

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
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const showRef = useRef(show);
  const authRef = useRef(isAuthenticated);
  const workspaceIdRef = useRef(workspace.id);
  const linkedRepoRef = useRef(linkedRepo);
  const effectiveWorkspaceIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!pendingLinkRepo) return;
    setRepoInput(pendingLinkRepo);
    setPendingLinkRepo(null);
  }, [pendingLinkRepo, setPendingLinkRepo]);

  useEffect(() => () => {
    mountedRef.current = false;
    requestSeqRef.current += 1;
  }, []);

  const effectiveWorkspaceId = backendWorkspaceId;

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
    setError(null);
    try {
      const response = await apiGet<{ commits: GitHubCommit[] }>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/commits`
      );
      if (!canApply()) return;
      setCommits(response.commits);
    } catch (err) {
      if (!canApply()) return;
      if (isAuthError(err)) {
        const authStore = useAuthStore.getState();
        authStore.setAnonymous();
        authStore.setError('Session expired. Please sign in again.');
        useUIStore.getState().toggleGitHubLogin();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load commits.');
    } finally {
      if (canApply()) {
        setLoadingCommits(false);
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

    setLinking(true);
    setError(null);

    try {
      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, {
        github_repo: cleanedRepo,
      });

      setLinkedRepoState({ repo: cleanedRepo, backendWorkspaceId: bwsId });
      setStoreGithubRepo(workspace.id, cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
    } catch (err) {
      if (isAuthError(err)) {
        const authStore = useAuthStore.getState();
        authStore.setAnonymous();
        authStore.setError('Session expired. Please sign in again.');
        useUIStore.getState().toggleGitHubLogin();
        return;
      }
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
    setStoreGithubRepo(workspace.id, undefined);
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId) return;

    setSyncing(true);
    setError(null);
    try {
      await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: trimmedCommitMessage,
      });
      await loadCommits();
    } catch (err) {
      if (isAuthError(err)) {
        const authStore = useAuthStore.getState();
        authStore.setAnonymous();
        authStore.setError('Session expired. Please sign in again.');
        useUIStore.getState().toggleGitHubLogin();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to sync workspace.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!effectiveWorkspaceId) return;

    setPulling(true);
    setError(null);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      replaceArchitecture(response.architecture as ArchitectureSnapshot);
      await loadCommits();
    } catch (err) {
      if (isAuthError(err)) {
        const authStore = useAuthStore.getState();
        authStore.setAnonymous();
        authStore.setError('Session expired. Please sign in again.');
        useUIStore.getState().toggleGitHubLogin();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to pull from GitHub.');
    } finally {
      setPulling(false);
    }
  };

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
          {linking && <div className="github-sync-loading">Linking repository...</div>}
          {syncing && <div className="github-sync-loading">Syncing to GitHub...</div>}
          {pulling && <div className="github-sync-loading">Pulling from GitHub...</div>}
          {loadingCommits && <div className="github-sync-loading">Loading recent commits...</div>}
          {error && <div className="github-sync-error">{error}</div>}

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
              <div className="github-sync-meta">
                Linked repo: <strong>{linkedRepo}</strong>
              </div>
              <button type="button" className="github-sync-secondary-btn" onClick={handleUnlink} disabled={busy}>
                Unlink
              </button>

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
                <button type="button" className="github-sync-primary-btn" onClick={handleSync} disabled={busy || trimmedCommitMessage.length === 0}>
                  Sync to GitHub
                </button>
                <button type="button" className="github-sync-secondary-btn" onClick={handlePull} disabled={busy}>
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
                        {commit.author} · {new Date(commit.date).toLocaleString()} · {' '}
                        <a href={commit.html_url} target="_blank" rel="noopener noreferrer">
                          {commit.sha.slice(0, 7)}
                        </a>
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
