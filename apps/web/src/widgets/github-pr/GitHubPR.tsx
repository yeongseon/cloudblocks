import { useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import { isValidGitBranchName } from '../../shared/utils/githubValidation';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { validateArchitectureShape } from '../../entities/store/slices';
import type { PullRequestResponse, PullResponse } from '../../shared/types/api';
import type { ArchitectureModel } from '@cloudblocks/schema';
import './GitHubPR.css';

/** Extract unique provider set from blocks. */
function getArchitectureProviders(arch: ArchitectureModel): string[] {
  const set = new Set<string>();
  for (const b of arch.blocks) {
    if (b.provider) set.add(b.provider);
  }
  return Array.from(set).sort();
}

export function GitHubPR() {
  const show = useUIStore((s) => s.showGitHubPR);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const workspace = useArchitectureStore((s) => s.workspace);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const hasBackendWorkspaceLink = Boolean(workspace.backendWorkspaceId);

  // Provider-aware defaults (#810, #811, #818)
  const providerTag = (workspace.provider ?? activeProvider).toUpperCase();
  const wsName = workspace.name;
  const [title, setTitle] = useState(`Update ${wsName} (${providerTag})`);
  const [body, setBody] = useState('');
  const [branch, setBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState(workspace.githubBranch ?? '');
  const [commitMessage, setCommitMessage] = useState(`Update ${wsName} (${providerTag}) via CloudBlocks`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestResponse | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ added: number; modified: number; removed: number; total: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const cleanedTitle = title.trim();
  const cleanedBranch = branch.trim();
  const branchIsValid = !cleanedBranch || isValidGitBranchName(cleanedBranch);
  const canSubmit = !loading && cleanedTitle.length > 0 && commitMessage.trim().length > 0 && branchIsValid && hasBackendWorkspaceLink;

  // Provider context (#799, #800, #814)
  const archProviders = getArchitectureProviders(workspace.architecture);
  const isMixedProvider = archProviders.length > 1;
  const wsProvider = workspace.provider;
  const providerMismatch = wsProvider && archProviders.length > 0 && !archProviders.includes(wsProvider);
  const providerlessBlocks = workspace.architecture.blocks.filter((b) => !b.provider);
  const activeProviderMismatch = wsProvider && activeProvider !== wsProvider;

  // Validation warnings (#807)
  const validationWarnings = validationResult?.errors?.filter((e) => e.severity === 'warning') ?? [];

  // Stale diff warning (#828)
  const diffArchRef = useRef(workspace.architecture);
  const isDiffStale = diffMode && diffDelta && workspace.architecture !== diffArchRef.current;
  useEffect(() => {
    if (diffMode && diffDelta) {
      diffArchRef.current = workspace.architecture;
    }
  }, [diffMode, diffDelta, workspace.architecture]);

  // Reset on repo/backend linkage change (#824)
  const prevRepoRef = useRef(workspace.githubRepo);
  const prevBackendRef = useRef(workspace.backendWorkspaceId);
  useEffect(() => {
    if (prevRepoRef.current !== workspace.githubRepo || prevBackendRef.current !== workspace.backendWorkspaceId) {
      prevRepoRef.current = workspace.githubRepo;
      prevBackendRef.current = workspace.backendWorkspaceId;
      setError(null);
      setResult(null);
      setPreviewSummary(null);
    }
  }, [workspace.githubRepo, workspace.backendWorkspaceId]);

  if (!show) return null;

  /** Load diff preview (#820, #822). */
  const handleLoadPreview = async () => {
    const backendWorkspaceId = workspace.backendWorkspaceId;
    if (!backendWorkspaceId) return;

    setPreviewLoading(true);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pull`
      );
      validateArchitectureShape(response.architecture);
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const delta = computeArchitectureDiff(remoteArch, workspace.architecture);
      const added = delta.blocks.added.length + delta.plates.added.length + delta.connections.added.length + delta.externalActors.added.length;
      const modified = delta.blocks.modified.length + delta.plates.modified.length + delta.connections.modified.length + delta.externalActors.modified.length;
      const removed = delta.blocks.removed.length + delta.plates.removed.length + delta.connections.removed.length + delta.externalActors.removed.length;
      setPreviewSummary({ added, modified, removed, total: delta.summary.totalChanges });
      if (delta.summary.totalChanges === 0) {
        toast('No effective changes against GitHub.', { icon: 'i' });
      }
    } catch {
      setPreviewSummary(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    const backendWorkspaceId = workspace.backendWorkspaceId;
    if (!backendWorkspaceId) {
      setError('Workspace must be linked to backend before creating a pull request.');
      return;
    }
    if (!cleanedTitle) {
      setError('Pull request title is required.');
      return;
    }
    if (cleanedBranch && !isValidGitBranchName(cleanedBranch)) {
      setError('Branch name contains invalid characters or format.');
      return;
    }

    // No-op guard (#822)
    if (previewSummary && previewSummary.total === 0) {
      const proceed = await confirmDialog(
        'No effective changes detected against GitHub. Create PR anyway?',
        'No Changes',
      );
      if (!proceed) return;
    }

    // Stale diff warning (#828)
    if (isDiffStale) {
      const proceed = await confirmDialog(
        'The architecture has changed since the last compare review. The PR will submit the current state, not the reviewed snapshot.',
        'Stale Review Warning',
      );
      if (!proceed) return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        architecture: workspace.architecture,
        title: cleanedTitle,
        body,
        branch: cleanedBranch || undefined,
        commit_message: commitMessage,
      };
      if (baseBranch.trim()) {
        payload.base_branch = baseBranch.trim();
      }

      const response = await apiPost<PullRequestResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pr`,
        payload,
      );
      setResult(response);
      toast.success('Pull request created!');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create pull request.'));
    } finally {
      setLoading(false);
    }
  };

  // Branch placeholder (#818)
  const branchPlaceholder = `cloudblocks/${wsName.toLowerCase().replace(/\s+/g, '-')}-${providerTag.toLowerCase()}`;

  return (
    <div className="github-pr">
      <div className="github-pr-header">
        <h3 className="github-pr-title">Pull Request</h3>
        <button type="button" className="github-pr-close" onClick={toggleGitHubPR} aria-label="Close pull request panel">
          x
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-pr-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-pr-empty">GitHub authentication required.</div>
      ) : !hasBackendWorkspaceLink ? (
        <div className="github-pr-empty">Workspace must be linked to backend before creating a pull request.</div>
      ) : (
        <div className="github-pr-content">
          {loading && <div className="github-pr-loading">Loading...</div>}
          {error && <div className="github-pr-error">{error}</div>}

          {/* Provider context banner (#799, #800) */}
          <div className="github-pr-provider-ctx">
            Workspace: <strong>{wsName}</strong>
            {wsProvider && (
              <> | Provider: <strong>{wsProvider.toUpperCase()}</strong></>
            )}
            {workspace.githubBranch && (
              <> | Base: <strong>{workspace.githubBranch}</strong></>
            )}
          </div>

          {/* Active provider tab mismatch warning (#800, #819) */}
          {activeProviderMismatch && (
            <div className="github-pr-warning">
              Active provider tab ({activeProvider.toUpperCase()}) differs from linked workspace provider ({wsProvider?.toUpperCase()}).
            </div>
          )}

          {/* Mixed provider warning (#802) */}
          {isMixedProvider && (
            <div className="github-pr-warning">
              This architecture spans multiple providers: {archProviders.map((p) => p.toUpperCase()).join(', ')}.
            </div>
          )}

          {/* Provider mismatch warning (#814) */}
          {providerMismatch && (
            <div className="github-pr-warning">
              Linked backend is {wsProvider?.toUpperCase()}, but local has: {archProviders.map((p) => p.toUpperCase()).join(', ')}.
            </div>
          )}

          {/* Providerless blocks warning (#815) */}
          {providerlessBlocks.length > 0 && isMixedProvider && (
            <div className="github-pr-warning">
              {providerlessBlocks.length} block(s) without provider identity in a multi-provider architecture.
            </div>
          )}

          {/* Validation warnings (#807) */}
          {validationWarnings.length > 0 && (
            <div className="github-pr-warning">
              {validationWarnings.length} validation warning(s). Review before creating PR.
            </div>
          )}

          {/* Stale diff warning (#828) */}
          {isDiffStale && (
            <div className="github-pr-warning">
              Architecture has changed since the last compare review. The diff is stale.
            </div>
          )}

          {/* Diff preview (#820) */}
          {previewSummary && (
            <div className="github-pr-preview">
              Changes: +{previewSummary.added} added, ~{previewSummary.modified} modified, -{previewSummary.removed} removed
              {previewSummary.total === 0 && ' (no effective changes)'}
            </div>
          )}

          <label className="github-pr-label" htmlFor="github-pr-title">
            Title
          </label>
          <input
            id="github-pr-title"
            className="github-pr-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="github-pr-label" htmlFor="github-pr-body">
            Body (optional)
          </label>
          <textarea
            id="github-pr-body"
            className="github-pr-textarea"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Base branch control (#805) */}
          <label className="github-pr-label" htmlFor="github-pr-base-branch">
            Base branch
          </label>
          <input
            id="github-pr-base-branch"
            className="github-pr-input"
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            placeholder={workspace.githubBranch || 'main'}
          />

          <label className="github-pr-label" htmlFor="github-pr-branch">
            Head branch name (optional)
          </label>
          <input
            id="github-pr-branch"
            className="github-pr-input"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder={branchPlaceholder}
          />
          {!branchIsValid && <div className="github-pr-error">Branch name contains invalid characters or format.</div>}

          <label className="github-pr-label" htmlFor="github-pr-commit-message">
            Commit message
          </label>
          <input
            id="github-pr-commit-message"
            className="github-pr-input"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />

          <div className="github-pr-actions">
            <button type="button" className="github-pr-submit" onClick={handleSubmit} disabled={!canSubmit}>
              Create Pull Request
            </button>
            <button
              type="button"
              className="github-pr-preview-btn"
              onClick={() => void handleLoadPreview()}
              disabled={loading || previewLoading}
              title="Preview changes against GitHub before submitting"
            >
              Preview
            </button>
          </div>

          {result && (
            <div className="github-pr-result">
              <div className="github-pr-result-info">
                PR #{result.number} · Branch: <code>{result.branch}</code>
              </div>
              <a className="github-pr-result-link" href={result.pull_request_url} target="_blank" rel="noreferrer">
                {result.pull_request_url}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
