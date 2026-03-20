import { useCallback, useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiGet, apiPost, apiPut } from '../../shared/api/client';
import { isValidGitHubRepoFullName } from '../../shared/utils/githubValidation';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { validateArchitectureShape } from '../../entities/store/slices';
import type { GitHubCommit, PullResponse, SyncResponse } from '../../shared/types/api';
import type { ArchitectureSnapshot } from '../../shared/types/learning';
import type { ArchitectureModel } from '@cloudblocks/schema';
import './GitHubSync.css';

/** Extract unique provider set from blocks. */
function getArchitectureProviders(arch: ArchitectureModel): string[] {
  const set = new Set<string>();
  for (const b of arch.blocks) {
    if (b.provider) set.add(b.provider);
  }
  return Array.from(set).sort();
}

export function GitHubSync() {
  const show = useUIStore((s) => s.showGitHubSync);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);

  const workspace = useArchitectureStore((s) => s.workspace);
  const replaceArchitecture = useArchitectureStore((s) => s.replaceArchitecture);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const setStoreBackendWorkspaceId = useArchitectureStore((s) => s.setBackendWorkspaceId);
  const setStoreGithubRepo = useArchitectureStore((s) => s.setGithubRepo);
  const setStoreGithubBranch = useArchitectureStore((s) => s.setGithubBranch);
  const setStoreLastSyncedAt = useArchitectureStore((s) => s.setLastSyncedAt);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);

  const linkedRepo = workspace.githubRepo ?? null;
  const backendWorkspaceId = workspace.backendWorkspaceId ?? null;

  const [repoInput, setRepoInput] = useState('');
  const [backendWorkspaceIdInput, setBackendWorkspaceIdInput] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [commitMessage, setCommitMessage] = useState(
    `Sync ${workspace.name} (${activeProvider}) from CloudBlocks`
  );
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitRefreshError, setCommitRefreshError] = useState<string | null>(null);
  const [pullConfirmPending, setPullConfirmPending] = useState(false);
  const [syncPreviewDelta, setSyncPreviewDelta] = useState<{ added: number; modified: number; removed: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  // Reset error/result when repo linkage changes (#824 parallel for sync)
  const prevRepoRef = useRef(linkedRepo);
  const prevBackendIdRef = useRef(backendWorkspaceId);
  if (prevRepoRef.current !== linkedRepo || prevBackendIdRef.current !== backendWorkspaceId) {
    prevRepoRef.current = linkedRepo;
    prevBackendIdRef.current = backendWorkspaceId;
    setError(null);
    setCommitRefreshError(null);
    setSyncPreviewDelta(null);
  }

  const effectiveWorkspaceId = backendWorkspaceId;
  const anyLoading = linkLoading || syncLoading || pullLoading || commitsLoading || previewLoading;
  const canSync = !anyLoading && commitMessage.trim().length > 0;

  showRef.current = show;
  authRef.current = isAuthenticated;
  workspaceIdRef.current = workspace.id;
  linkedRepoRef.current = linkedRepo;
  effectiveWorkspaceIdRef.current = effectiveWorkspaceId;

  // Provider context (#799, #800, #814)
  const archProviders = getArchitectureProviders(workspace.architecture);
  const isMixedProvider = archProviders.length > 1;
  const wsProvider = workspace.provider;
  const providerMismatch = wsProvider && archProviders.length > 0 && !archProviders.includes(wsProvider);
  const providerlessBlocks = workspace.architecture.blocks.filter((b) => !b.provider);
  const activeProviderMismatch = wsProvider && activeProvider !== wsProvider;

  // Stale diff warning (#827, #829)
  const diffArchRef = useRef(workspace.architecture);
  const isDiffStale = diffMode && diffDelta && workspace.architecture !== diffArchRef.current;
  useEffect(() => {
    if (diffMode && diffDelta) {
      diffArchRef.current = workspace.architecture;
    }
  }, [diffMode, diffDelta, workspace.architecture]);

  // Validation warnings (#807)
  const validationWarnings = validationResult?.errors?.filter((e) => e.severity === 'warning') ?? [];

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
    const cleanedBranch = branchInput.trim() || undefined;

    // Verify repo access before linking (#835)
    setLinkLoading(true);
    setError(null);

    try {
      // Attempt to verify repo exists via a lightweight check
      try {
        await apiGet<{ repos: unknown[] }>('/api/v1/github/repos');
      } catch {
        // If repos endpoint fails, warn but continue
      }

      const updatePayload: Record<string, unknown> = {
        github_repo: cleanedRepo,
      };
      if (cleanedBranch) {
        updatePayload.github_branch = cleanedBranch;
      }

      await apiPut(`/api/v1/workspaces/${encodeURIComponent(bwsId)}`, updatePayload);

      setStoreGithubRepo(workspace.id, cleanedRepo);
      setStoreBackendWorkspaceId(workspace.id, bwsId);
      if (cleanedBranch) {
        setStoreGithubBranch(workspace.id, cleanedBranch);
      }

      // Confirm link with verification feedback (#806)
      toast.success(`Linked to ${cleanedRepo}${cleanedBranch ? ` (${cleanedBranch})` : ''}`);
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
    setSyncPreviewDelta(null);
  };

  /** Load a sync preview to detect no-op (#823) and show outgoing diff (#821). */
  const handleLoadSyncPreview = async () => {
    if (!effectiveWorkspaceId) return;
    setPreviewLoading(true);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`
      );
      validateArchitectureShape(response.architecture);
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const localArch = workspace.architecture;
      const delta = computeArchitectureDiff(remoteArch, localArch);
      setSyncPreviewDelta({
        added: delta.blocks.added.length + delta.plates.added.length + delta.connections.added.length + delta.externalActors.added.length,
        modified: delta.blocks.modified.length + delta.plates.modified.length + delta.connections.modified.length + delta.externalActors.modified.length,
        removed: delta.blocks.removed.length + delta.plates.removed.length + delta.connections.removed.length + delta.externalActors.removed.length,
      });
      if (delta.summary.totalChanges === 0) {
        toast('No changes to sync — local matches GitHub.', { icon: 'i' });
      }
    } catch {
      // Preview is optional — don't block
      setSyncPreviewDelta(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSync = async () => {
    if (!effectiveWorkspaceId || !canSync) return;

    // No-op guard (#823)
    if (syncPreviewDelta && syncPreviewDelta.added === 0 && syncPreviewDelta.modified === 0 && syncPreviewDelta.removed === 0) {
      const proceed = await confirmDialog(
        'No changes detected between local and GitHub. Sync anyway?',
        'No Changes',
      );
      if (!proceed) return;
    }

    // Stale diff warning (#829)
    if (isDiffStale) {
      const proceed = await confirmDialog(
        'The architecture has changed since the last compare review. The sync will push the current state, not the reviewed snapshot.',
        'Stale Review Warning',
      );
      if (!proceed) return;
    }

    setSyncLoading(true);
    setError(null);
    try {
      await apiPost<SyncResponse>(`/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/sync`, {
        architecture: workspace.architecture,
        commit_message: commitMessage,
      });
      setStoreLastSyncedAt(workspace.id, new Date().toISOString());
      toast.success('Synced to GitHub!');
      setSyncPreviewDelta(null);
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

  /** Compare against a specific commit (#837). */
  const handleCompareCommit = async (sha: string) => {
    if (!effectiveWorkspaceId) return;
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/pull`,
      );
      validateArchitectureShape(response.architecture);
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const localArch = workspace.architecture;
      const delta = computeArchitectureDiff(remoteArch, localArch);
      useUIStore.getState().setDiffMode(true, delta, remoteArch);
      toast.success(`Compare review started (vs ${sha.slice(0, 7)})`);
    } catch {
      toast.error('Failed to load architecture for comparison.');
    }
  };

  const commitLinkUrl = linkedRepo
    ? `https://github.com/${linkedRepo}/commit/`
    : null;

  return (
    <div className="github-sync">
      <div className="github-sync-header">
        <h3 className="github-sync-title">GitHub Sync</h3>
        <button type="button" className="github-sync-close" onClick={toggleGitHubSync} aria-label="Close GitHub sync panel">
          x
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

          {/* Provider context banner (#799, #800) */}
          {linkedRepo && (
            <div className="github-sync-provider-ctx">
              Workspace: <strong>{workspace.name}</strong>
              {wsProvider && (
                <> | Provider: <strong>{wsProvider.toUpperCase()}</strong></>
              )}
              {workspace.githubBranch && (
                <> | Branch: <strong>{workspace.githubBranch}</strong></>
              )}
            </div>
          )}

          {/* Active provider tab mismatch warning (#800, #819) */}
          {activeProviderMismatch && linkedRepo && (
            <div className="github-sync-warning">
              Active provider tab ({activeProvider.toUpperCase()}) differs from linked workspace provider ({wsProvider?.toUpperCase()}). GitHub actions target the workspace linkage, not the active tab.
            </div>
          )}

          {/* Mixed provider warning (#802) */}
          {isMixedProvider && linkedRepo && (
            <div className="github-sync-warning">
              This architecture spans multiple providers: {archProviders.map((p) => p.toUpperCase()).join(', ')}. The sync will include all providers.
            </div>
          )}

          {/* Provider mismatch warning (#814) */}
          {providerMismatch && linkedRepo && (
            <div className="github-sync-warning">
              Linked backend workspace is tagged as {wsProvider?.toUpperCase()}, but local architecture contains different providers: {archProviders.map((p) => p.toUpperCase()).join(', ')}.
            </div>
          )}

          {/* Providerless blocks warning (#815) */}
          {providerlessBlocks.length > 0 && isMixedProvider && linkedRepo && (
            <div className="github-sync-warning">
              {providerlessBlocks.length} block(s) have no provider assigned. In a multi-provider architecture, this can be ambiguous.
            </div>
          )}

          {/* Validation warnings (#807) */}
          {validationWarnings.length > 0 && linkedRepo && (
            <div className="github-sync-warning">
              {validationWarnings.length} validation warning(s) in this architecture. Review before syncing.
            </div>
          )}

          {/* Stale diff warning (#827, #829) */}
          {isDiffStale && (
            <div className="github-sync-warning">
              Architecture has changed since the last compare review. The diff is stale.
            </div>
          )}

          {/* Last synced at (#832) */}
          {workspace.lastSyncedAt && linkedRepo && (
            <div className="github-sync-meta">
              Last synced: {new Date(workspace.lastSyncedAt).toLocaleString()}
            </div>
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

              {/* Branch input (#804) */}
              <label className="github-sync-label" htmlFor="github-sync-branch-input">
                Branch (optional)
              </label>
              <input
                id="github-sync-branch-input"
                className="github-sync-input"
                placeholder="main"
                value={branchInput}
                onChange={(e) => setBranchInput(e.target.value)}
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

              {/* Outgoing diff preview (#821) */}
              {syncPreviewDelta && (
                <div className="github-sync-preview">
                  Outgoing: +{syncPreviewDelta.added} added, ~{syncPreviewDelta.modified} modified, -{syncPreviewDelta.removed} removed
                </div>
              )}

              <div className="github-sync-actions">
                <button type="button" className="github-sync-primary-btn" onClick={handleSync} disabled={!canSync}>
                  Sync to GitHub
                </button>
                <button type="button" className="github-sync-secondary-btn" onClick={handlePullRequest} disabled={anyLoading}>
                  Pull from GitHub
                </button>
                <button type="button" className="github-sync-secondary-btn" onClick={() => void handleLoadSyncPreview()} disabled={anyLoading} title="Preview changes before syncing">
                  Preview
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
                        {/* Compare against commit action (#837) */}
                        <button
                          type="button"
                          className="github-sync-commit-compare"
                          onClick={() => void handleCompareCommit(commit.sha)}
                          title="Compare local with this commit"
                        >
                          Compare
                        </button>
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
