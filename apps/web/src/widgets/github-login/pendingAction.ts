/** Key for persisting the pending GitHub action across OAuth redirect (#836). */
const GITHUB_PENDING_ACTION_KEY = 'cloudblocks:github-pending-action';

export function persistPendingGitHubAction(action: string | null) {
  if (action) {
    sessionStorage.setItem(GITHUB_PENDING_ACTION_KEY, action);
  } else {
    sessionStorage.removeItem(GITHUB_PENDING_ACTION_KEY);
  }
}

export function consumePendingGitHubAction(): string | null {
  const action = sessionStorage.getItem(GITHUB_PENDING_ACTION_KEY);
  sessionStorage.removeItem(GITHUB_PENDING_ACTION_KEY);
  return action;
}
