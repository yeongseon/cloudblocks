import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import type { PullRequestResponse } from '../../shared/types/api';
import './GitHubPR.css';

function notifyError(message: string): void {
  try {
    window.alert(message);
  } catch {}
}

export function GitHubPR() {
  const show = useUIStore((s) => s.showGitHubPR);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const workspace = useArchitectureStore((s) => s.workspace);

  const [title, setTitle] = useState('Update cloud architecture');
  const [body, setBody] = useState('');
  const [branch, setBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('Update architecture via CloudBlocks');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullRequestResponse | null>(null);

  if (!show) return null;

  const handleSubmit = async () => {
    const backendWorkspaceId = workspace.backendWorkspaceId;
    if (!backendWorkspaceId) {
      const message = 'Missing backend workspace ID. Open Workspace Manager and connect this workspace to the backend first.';
      setError(message);
      notifyError(message);
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
          title,
          body,
          branch: branch.trim() || undefined,
          commit_message: commitMessage,
        }
      );
      setResult(response);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to create pull request.');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="github-pr">
      <div className="github-pr-header">
        <h3 className="github-pr-title">🔀 Pull Request</h3>
        <button className="github-pr-close" onClick={toggleGitHubPR} aria-label="Close pull request panel">
          ✕
        </button>
      </div>

      {!isAuthenticated ? (
        <div className="github-pr-empty">GitHub authentication required.</div>
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

          <label className="github-pr-label" htmlFor="github-pr-commit-message">
            Commit message
          </label>
          <input
            id="github-pr-commit-message"
            className="github-pr-input"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />

          <button className="github-pr-submit" onClick={handleSubmit} disabled={loading}>
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
