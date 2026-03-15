export interface ApiUser {
  id: string;
  github_username: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: ApiUser;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
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
}
