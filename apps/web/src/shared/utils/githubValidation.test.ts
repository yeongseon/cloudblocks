import { describe, expect, it } from 'vitest';
import {
  isValidGitBranchName,
  isValidGitHubRepoFullName,
  isValidGitHubRepoName,
} from './githubValidation';

describe('githubValidation', () => {
  describe('isValidGitHubRepoName', () => {
    it('accepts valid repository names', () => {
      expect(isValidGitHubRepoName('repo-name')).toBe(true);
      expect(isValidGitHubRepoName('repo_name')).toBe(true);
      expect(isValidGitHubRepoName('repo.name')).toBe(true);
      expect(isValidGitHubRepoName('123')).toBe(true);
    });

    it('rejects invalid repository names', () => {
      expect(isValidGitHubRepoName('')).toBe(false);
      expect(isValidGitHubRepoName('   ')).toBe(false);
      expect(isValidGitHubRepoName('repo name')).toBe(false);
      expect(isValidGitHubRepoName('repo!name')).toBe(false);
      expect(isValidGitHubRepoName('repo/name')).toBe(false);
    });
  });

  describe('isValidGitHubRepoFullName', () => {
    it('accepts owner/repo values with valid characters', () => {
      expect(isValidGitHubRepoFullName('owner/repo')).toBe(true);
      expect(isValidGitHubRepoFullName('owner-name/repo_name')).toBe(true);
      expect(isValidGitHubRepoFullName('owner.name/repo-name')).toBe(true);
    });

    it('rejects invalid owner/repo values', () => {
      expect(isValidGitHubRepoFullName('')).toBe(false);
      expect(isValidGitHubRepoFullName('owner')).toBe(false);
      expect(isValidGitHubRepoFullName('/repo')).toBe(false);
      expect(isValidGitHubRepoFullName('owner/')).toBe(false);
      expect(isValidGitHubRepoFullName('owner/repo/extra')).toBe(false);
      expect(isValidGitHubRepoFullName('owner/repo name')).toBe(false);
      expect(isValidGitHubRepoFullName('owner!/repo')).toBe(false);
    });
  });

  describe('isValidGitBranchName', () => {
    it('accepts valid branch names', () => {
      expect(isValidGitBranchName('feature/new-flow')).toBe(true);
      expect(isValidGitBranchName('fix.issue-629')).toBe(true);
      expect(isValidGitBranchName('release_2026-03')).toBe(true);
    });

    it('rejects invalid branch names', () => {
      expect(isValidGitBranchName('')).toBe(false);
      expect(isValidGitBranchName('feature name')).toBe(false);
      expect(isValidGitBranchName('feature..name')).toBe(false);
      expect(isValidGitBranchName('feature~name')).toBe(false);
      expect(isValidGitBranchName('feature^name')).toBe(false);
      expect(isValidGitBranchName('feature:name')).toBe(false);
      expect(isValidGitBranchName('feature?name')).toBe(false);
      expect(isValidGitBranchName('feature*name')).toBe(false);
      expect(isValidGitBranchName('feature[name')).toBe(false);
      expect(isValidGitBranchName('feature\\name')).toBe(false);
      expect(isValidGitBranchName('feature/name.')).toBe(false);
    });
  });
});
