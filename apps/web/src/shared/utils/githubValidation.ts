const GITHUB_NAME_PART_REGEX = /^[A-Za-z0-9._-]+$/;
// eslint-disable-next-line no-control-regex, no-useless-escape
const GIT_FORBIDDEN_BRANCH_CHARS_REGEX = /[\u0000-\u001F\u007F~^:?*\[\\]/;

export function isValidGitHubRepoName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && GITHUB_NAME_PART_REGEX.test(trimmed);
}

export function isValidGitHubRepoFullName(value: string): boolean {
  const trimmed = value.trim();
  const parts = trimmed.split('/');
  if (parts.length !== 2) return false;

  const [owner, repo] = parts;
  return Boolean(owner) && Boolean(repo) && GITHUB_NAME_PART_REGEX.test(owner) && GITHUB_NAME_PART_REGEX.test(repo);
}

export function isValidGitBranchName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  if (trimmed.includes('..') || trimmed.includes('@{')) return false;
  if (trimmed.startsWith('-') || trimmed.startsWith('/') || trimmed.endsWith('/')) return false;
  if (trimmed.endsWith('.') || trimmed.endsWith('.lock') || trimmed.includes('//')) return false;
  if (GIT_FORBIDDEN_BRANCH_CHARS_REGEX.test(trimmed)) return false;

  return true;
}
