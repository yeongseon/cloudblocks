import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import { isValidGitBranchName } from '../../shared/utils/githubValidation';
import type { PullRequestResponse } from '../../shared/types/api';
import './GitHubPR.css';

export function GitHubPR() {
  const show = useUIStore((s) => s.showGitHubPR);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const workspace = useArchitectureStore((s) => s.workspace);
  // #759: Require both backendWorkspaceId and githubRepo
  const hasBackendWorkspaceLink = Boolean(workspace.backendWorkspaceId);
  const hasRepoLink = Boolean(workspace.githubRepo);
  const isFullyLinked = hasBackendWorkspaceLink && hasRepoLink;

  const [title, setTitle] = useState('Update cloud architecture');
  const [body, setBody] = useState('');
  const [branch, setBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('Update architecture via CloudBlocks');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestResponse | null>(null);
  const mountedRef = useRef(true);

  const cleanedTitle = title.trim();
  const cleanedBranch = branch.trim();
  const branchIsValid = !cleanedBranch || isValidGitBranchName(cleanedBranch);
  const canSubmit = !loading && cleanedTitle.length > 0 && commitMessage.trim().length > 0 && branchIsValid && isFullyLinked;

  // #752: Clear stale result when any form field changes
  const handleFieldChange = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    if (result) setResult(null);
  };

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

    const capturedWorkspaceId = workspace.id;
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
          commit_message: commitMessage,
        }
      );
      // #776: Persist result via toast even if panel closes
      if (!mountedRef.current || workspace.id !== capturedWorkspaceId) {
        toast.success(`PR #${response.number} created: ${response.pull_request_url}`);
        return;
      }
      setResult(response);
      toast.success(`PR #${response.number} created on branch ${response.branch}`);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(getApiErrorMessage(err, 'Failed to create pull request.'));
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="github-pr">
      <div className="github-pr-header">
        {/* #794: Show workspace name in header */}
        <h3 className="github-pr-title">Pull Request &mdash; {workspace.name}</h3>
        <button type="button" className="github-pr-close" onClick={toggleGitHubPR} aria-label="Close pull request panel">
          ✕
        </button>
      </div>

      {authStatus === 'unknown' ? (
        <div className="github-pr-loading">Checking authentication...</div>
      ) : !isAuthenticated ? (
        <div className="github-pr-empty">
          GitHub authentication required.
          {/* #782: Sign-in action from unauth state */}
          <button type="button" className="github-pr-signin-btn" onClick={toggleGitHubLogin}>
            Sign in with GitHub
          </button>
        </div>
      ) : !isFullyLinked ? (
        <div className="github-pr-empty">
          {!hasBackendWorkspaceLink
            ? 'Workspace must be linked to backend before creating a pull request.'
            : 'Workspace must be linked to a GitHub repository before creating a pull request.'}
          {/* #780: Route to setup flow */}
          <button type="button" className="github-pr-signin-btn" onClick={() => { toggleGitHubPR(); toggleGitHubSync(); }}>
            Open GitHub Sync
          </button>
        </div>
      ) : (
        <div className="github-pr-content">
          {loading && <div className="github-pr-loading">Creating pull request...</div>}
          {error && <div className="github-pr-error">{error}</div>}

          {/* #763: Show repo context; #748: Show linked branch */}
          <div className="github-pr-context">
            Repo: <strong>{workspace.githubRepo}</strong>
            {workspace.githubBranch && (
              <span> &middot; base: <code>{workspace.githubBranch}</code></span>
            )}
          </div>

          <label className="github-pr-label" htmlFor="github-pr-title">
            Title
          </label>
          <input
            id="github-pr-title"
            className="github-pr-input"
            value={title}
            onChange={(e) => handleFieldChange(setTitle)(e.target.value)}
            disabled={loading}
          />

          <label className="github-pr-label" htmlFor="github-pr-body">
            Body (optional)
          </label>
          <textarea
            id="github-pr-body"
            className="github-pr-textarea"
            rows={5}
            value={body}
            onChange={(e) => handleFieldChange(setBody)(e.target.value)}
            disabled={loading}
          />

          <label className="github-pr-label" htmlFor="github-pr-branch">
            Branch name (optional)
          </label>
          <input
            id="github-pr-branch"
            className="github-pr-input"
            value={branch}
            onChange={(e) => handleFieldChange(setBranch)(e.target.value)}
            placeholder="cloudblocks/update-architecture"
            disabled={loading}
          />
          {!branchIsValid && <div className="github-pr-error">Branch name contains invalid characters or format.</div>}

          <label className="github-pr-label" htmlFor="github-pr-commit-message">
            Commit message
          </label>
          <input
            id="github-pr-commit-message"
            className="github-pr-input"
            value={commitMessage}
            onChange={(e) => handleFieldChange(setCommitMessage)(e.target.value)}
            disabled={loading}
          />

          <button type="button" className="github-pr-submit" onClick={handleSubmit} disabled={!canSubmit}>
            Create Pull Request
          </button>

          {result && (
            <div className="github-pr-result">
              <div className="github-pr-result-info">
                PR #{result.number} &middot; Branch: <code>{result.branch}</code>
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
