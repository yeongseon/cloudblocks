export interface ApiUser {
  id: string;
  github_username: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SessionUserResponse {
  id: string;
  github_username: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GitHubRepo {
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface ApiWorkspace {
  id: string;
  owner_id: string;
  name: string;
  generator: string;
  provider: string;
  github_repo: string | null;
  github_branch: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncResponse {
  message: string;
  commit_sha: string;
}

export interface PullResponse {
  architecture: Record<string, unknown>;
}

export interface PullRequestResponse {
  pull_request_url: string;
  number: number;
  branch: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  html_url: string;
}

// ─── Milestone 7: Collaboration + CI/CD ────────────────────

export interface PrInfo {
  number: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  baseBranch: string;
  htmlUrl: string;
}

export interface CheckInfo {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  detailsUrl: string;
}

export interface ArchitectureAtRefResponse {
  architecture: Record<string, unknown>;
  ref: string;
  commitSha: string;
}
