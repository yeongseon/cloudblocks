import { useState, useEffect } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost, getApiErrorMessage, isAuthError } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { isValidGitBranchName } from '../../shared/utils/githubValidation';
import type { PullRequestResponse } from '../../shared/types/api';
import './GitHubPR.css';

const DEFAULT_TITLE = 'Update cloud architecture';
const DEFAULT_BODY = '';
const DEFAULT_BRANCH = '';
const DEFAULT_COMMIT_MESSAGE = 'Update architecture via CloudBlocks';
const FALLBACK_BASE_BRANCHES = ['main', 'master'];

type WorkspaceBranchInfo = {
  githubBranch?: string;
  github_branch?: string;
  defaultBranch?: string;
  default_branch?: string;
};

export function GitHubPR() {
  const show = useUIStore((s) => s.showGitHubPR);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const workspace = useArchitectureStore((s) => s.workspace);
  const hasBackendWorkspaceLink = Boolean(workspace.backendWorkspaceId);

  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [body, setBody] = useState(DEFAULT_BODY);
  const compareReviewPrefill = useUIStore((s) => s.compareReviewPrefill);
  const setCompareReviewPrefill = useUIStore((s) => s.setCompareReviewPrefill);

  useEffect(() => {
    if (compareReviewPrefill) {
      setBody(compareReviewPrefill);
      setCompareReviewPrefill(null);
    }
  }, [compareReviewPrefill, setCompareReviewPrefill]);
  const [branch, setBranch] = useState(DEFAULT_BRANCH);
  const [commitMessage, setCommitMessage] = useState(DEFAULT_COMMIT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestResponse | null>(null);
  const cleanedTitle = title.trim();
  const cleanedBranch = branch.trim();
  const cleanedCommitMessage = commitMessage.trim();
  const workspaceBranchInfo = workspace as WorkspaceBranchInfo;
  const workspaceBaseBranch = workspaceBranchInfo.githubBranch
    ?? workspaceBranchInfo.github_branch
    ?? workspaceBranchInfo.defaultBranch
    ?? workspaceBranchInfo.default_branch
    ?? null;
  const candidateBaseBranches = [workspaceBaseBranch, ...FALLBACK_BASE_BRANCHES]
    .filter((candidate): candidate is string => Boolean(candidate?.trim()))
    .map((candidate) => candidate.trim().toLowerCase());
  const branchMatchesBase = cleanedBranch.length > 0
    && candidateBaseBranches.includes(cleanedBranch.toLowerCase());
  const branchMatchesBaseError = branchMatchesBase
    ? `Head branch must differ from base branch (${workspaceBaseBranch ?? 'main/master'}).`
    : null;
  const branchIsValid = !cleanedBranch || isValidGitBranchName(cleanedBranch);
  const isDirty = title !== DEFAULT_TITLE
    || body !== DEFAULT_BODY
    || branch !== DEFAULT_BRANCH
    || commitMessage !== DEFAULT_COMMIT_MESSAGE;
  const canSubmit = !loading
    && cleanedTitle.length > 0
    && cleanedCommitMessage.length > 0
    && branchIsValid
    && !branchMatchesBase
    && hasBackendWorkspaceLink;

  if (!show) return null;

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
    if (branchMatchesBase) {
      setError(branchMatchesBaseError);
      return;
    }
    if (!cleanedCommitMessage) {
      setError('Commit message is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiPost<PullRequestResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pr`,
        {
          architecture: workspace.architecture,
          title: cleanedTitle,
          body,
          branch: cleanedBranch || undefined,
          commit_message: cleanedCommitMessage,
        }
      );
      setResult(response);
    } catch (err) {
      if (isAuthError(err)) {
        const authStore = useAuthStore.getState();
        authStore.setAnonymous();
        authStore.setError('Session expired. Please sign in again.');
        useUIStore.getState().toggleGitHubLogin();
        return;
      }
      const apiErrorMessage = getApiErrorMessage(err, 'Failed to create pull request.');
      const lowerApiError = apiErrorMessage.toLowerCase();
      const branchAlreadyExists = lowerApiError.includes('branch already exists')
        || (lowerApiError.includes('already exists') && lowerApiError.includes('branch'))
        || lowerApiError.includes('reference already exists')
        || lowerApiError.includes('ref already exists');

      if (branchAlreadyExists) {
        const branchLabel = cleanedBranch ? `Branch '${cleanedBranch}'` : 'A branch with this name';
        setError(`${branchLabel} already exists. Please choose a different branch name.`);
      } else {
        setError(apiErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!isDirty) {
      toggleGitHubPR();
      return;
    }

    const shouldClose = await confirmDialog(
      'You have unsaved edits in the PR form. Discard them?',
      'Discard Draft?'
    );
    if (shouldClose) {
      toggleGitHubPR();
    }
  };

  return (
    <div className="github-pr">
      <div className="github-pr-header">
        <h3 className="github-pr-title">🔀 Pull Request</h3>
        <button type="button" className="github-pr-close" onClick={() => void handleClose()} aria-label="Close pull request panel">
          ✕
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

          <label className="github-pr-label" htmlFor="github-pr-branch">
            Branch name (optional)
          </label>
          <input
            id="github-pr-branch"
            className="github-pr-input"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="cloudblocks/update-architecture"
          />
          {!branchIsValid && <div className="github-pr-error">Branch name contains invalid characters or format.</div>}
          {branchMatchesBaseError && <div className="github-pr-error">{branchMatchesBaseError}</div>}

          <label className="github-pr-label" htmlFor="github-pr-commit-message">
            Commit message
          </label>
          <input
            id="github-pr-commit-message"
            className="github-pr-input"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />

          <button type="button" className="github-pr-submit" onClick={handleSubmit} disabled={!canSubmit}>
            Create Pull Request
          </button>

          {result && (
            <a className="github-pr-result-link" href={result.pull_request_url} target="_blank" rel="noreferrer">
              {result.pull_request_url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
