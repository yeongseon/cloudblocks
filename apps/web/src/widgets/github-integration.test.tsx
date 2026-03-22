/**
 * Integration tests for GitHub panel flows.
 *
 * These tests cover cross-panel interactions that the per-widget unit tests
 * do not exercise.  Each group maps to a task listed in issue #1131.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel } from '@cloudblocks/schema';

/* ------------------------------------------------------------------ */
/*  Mocks — must be declared before importing any production module    */
/* ------------------------------------------------------------------ */

vi.mock('../shared/api/client', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  isApiConfigured: vi.fn(() => true),
  isAuthError: vi.fn(() => false),
  getApiErrorMessage: vi.fn((err: unknown, fallback: string) => {
    if (err instanceof Error) return err.message;
    return fallback;
  }),
}));

vi.mock('../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));

vi.mock('../features/diff/engine', () => ({
  computeArchitectureDiff: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { GitHubLogin } from './github-login/GitHubLogin';
import { GitHubRepos } from './github-repos/GitHubRepos';
import { GitHubPR } from './github-pr/GitHubPR';
import { GitHubSync } from './github-sync/GitHubSync';
import { DiffPanel } from './diff-panel/DiffPanel';
import { useUIStore } from '../entities/store/uiStore';
import { useAuthStore } from '../entities/store/authStore';
import { useArchitectureStore } from '../entities/store/architectureStore';
import { apiGet, apiPost, apiPut, isAuthError } from '../shared/api/client';
import { confirmDialog } from '../shared/ui/ConfirmDialog';
import { computeArchitectureDiff } from '../features/diff/engine';

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */

const emptyArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  nodes: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

const mockUser = {
  id: 'user-1',
  github_username: 'octocat',
  email: 'octo@example.com',
  display_name: 'The Octocat',
  avatar_url: 'https://example.com/avatar.png',
};

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);
const mockApiPut = vi.mocked(apiPut);
const mockIsAuthError = vi.mocked(isAuthError);
const mockConfirmDialog = vi.mocked(confirmDialog);
const mockComputeDiff = vi.mocked(computeArchitectureDiff);

/* ------------------------------------------------------------------ */
/*  Test-wide setup                                                    */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();

  useUIStore.setState({
    showGitHubLogin: false,
    showGitHubRepos: false,
    showGitHubSync: false,
    showGitHubPR: false,
    pendingGitHubAction: null,
    pendingLinkRepo: null,
    diffMode: false,
    diffDelta: null,
    diffBaseArchitecture: null,
    compareReviewPrefill: null,
  });

  useAuthStore.setState({
    status: 'anonymous',
    user: null,
    hydrated: true,
    error: null,
  });

  useArchitectureStore.setState({
    workspace: {
      id: 'ws-1',
      name: 'Workspace',
      architecture: emptyArch,
      createdAt: '',
      updatedAt: '',
    },
  });

  mockIsAuthError.mockReturnValue(false);
  mockConfirmDialog.mockResolvedValue(true);

  mockComputeDiff.mockReturnValue({
    plates: { added: [], removed: [], modified: [] },
    blocks: { added: [], removed: [], modified: [] },
    connections: { added: [], removed: [], modified: [] },
    externalActors: { added: [], removed: [], modified: [] },
    rootChanges: [],
    summary: { totalChanges: 0, hasBreakingChanges: false },
  } as ReturnType<typeof computeArchitectureDiff>);
});

/* ================================================================== */
/*  GROUP 1 — OAuth redirect → action preservation → panel restoration */
/*  Covers #836, #867                                                  */
/* ================================================================== */

describe('Group 1: OAuth redirect → action preservation → panel restoration', () => {
  it('preserves pending action across sign-in and clears it before redirect', async () => {
    // Simulate: user tried to sync while unauthenticated, triggering login
    useUIStore.setState({
      showGitHubLogin: true,
      pendingGitHubAction: 'sync',
    });

    mockApiPost.mockResolvedValueOnce({
      authorize_url: `${window.location.origin}/#oauth-callback`,
    });

    const user = userEvent.setup();
    render(<GitHubLogin />);

    // pendingGitHubAction should still be set before sign-in
    expect(useUIStore.getState().pendingGitHubAction).toBe('sync');

    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    // After sign-in redirect initiated, pending action is cleared
    expect(useUIStore.getState().pendingGitHubAction).toBe(null);
    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/auth/github');
  });

  it('restores login panel after failed sign-out preserves panel state', async () => {
    // Start authenticated with login panel open
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    useUIStore.setState({ showGitHubLogin: true });

    const logoutMock = vi.fn(async () => {
      // Logout failed — status stays authenticated
      useAuthStore.setState({
        status: 'authenticated',
        error: 'Logout failed. Checking session…',
      });
    });
    useAuthStore.setState({ logout: logoutMock });

    const user = userEvent.setup();
    render(<GitHubLogin />);

    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    // Panel stays open because logout didn't actually change status
    expect(useUIStore.getState().showGitHubLogin).toBe(true);
    expect(screen.getByText('Logout failed. Checking session…')).toBeInTheDocument();
  });

  it('login panel shows user info after authentication status transitions from anonymous to authenticated', () => {
    // Start anonymous
    useUIStore.setState({ showGitHubLogin: true });
    useAuthStore.setState({ status: 'anonymous' });

    const { rerender } = render(<GitHubLogin />);
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();

    // Simulate OAuth callback completing
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    rerender(<GitHubLogin />);

    expect(screen.getByText('The Octocat')).toBeInTheDocument();
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  GROUP 2 — GitHubRepos create → link → sync lifecycle               */
/*  Covers #840, #841, #883                                            */
/* ================================================================== */

describe('Group 2: GitHubRepos create → link → sync lifecycle', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    mockApiGet.mockResolvedValue({ commits: [] });
    mockApiPut.mockResolvedValue({});
  });

  it('creates repo, links it via handoff to GitHubSync, and syncs architecture', async () => {
    const user = userEvent.setup();

    // Step 1: Open repos panel — create a new repo
    useUIStore.setState({ showGitHubRepos: true });
    mockApiGet.mockResolvedValueOnce({ repos: [] }).mockResolvedValueOnce({
      repos: [{
        full_name: 'octocat/my-infra',
        name: 'my-infra',
        private: true,
        default_branch: 'main',
        html_url: 'https://github.com/octocat/my-infra',
      }],
    });
    mockApiPost.mockResolvedValueOnce({
      full_name: 'octocat/my-infra',
      name: 'my-infra',
      private: true,
      default_branch: 'main',
      html_url: 'https://github.com/octocat/my-infra',
    });

    render(<GitHubRepos />);

    await user.type(screen.getByPlaceholderText('Repository name'), 'my-infra');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    // Success message with link action visible
    expect(await screen.findByText('Repository "my-infra" created successfully.')).toBeInTheDocument();
    const linkButton = screen.getByRole('button', { name: 'Link this repo' });
    expect(linkButton).toBeInTheDocument();

    // Step 2: Click "Link this repo" → sets pendingLinkRepo and opens sync panel
    await user.click(linkButton);
    expect(useUIStore.getState().pendingLinkRepo).toBe('octocat/my-infra');
    expect(useUIStore.getState().showGitHubSync).toBe(true);
  });

  it('GitHubSync picks up pendingLinkRepo and pre-fills the repo input', () => {
    useUIStore.setState({
      showGitHubSync: true,
      pendingLinkRepo: 'octocat/my-infra',
    });

    render(<GitHubSync />);

    // Repo input should be pre-filled
    expect(screen.getByPlaceholderText('owner/repo')).toHaveValue('octocat/my-infra');
    // pendingLinkRepo should be consumed
    expect(useUIStore.getState().pendingLinkRepo).toBe(null);
  });

  it('full create → link → sync flow persists backendWorkspaceId to store', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ showGitHubSync: true, pendingLinkRepo: 'octocat/my-infra' });

    mockApiPost.mockResolvedValue({ message: 'ok', commit_sha: 'abc123' });

    render(<GitHubSync />);

    // Pre-filled from pendingLinkRepo
    expect(screen.getByPlaceholderText('owner/repo')).toHaveValue('octocat/my-infra');

    // Link the repo
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/api/v1/workspaces/ws-1', {
        github_repo: 'octocat/my-infra',
      });
    });

    // Workspace should now have the repo linked
    const ws = useArchitectureStore.getState().workspace;
    expect(ws.githubRepo).toBe('octocat/my-infra');
    expect(ws.backendWorkspaceId).toBe('ws-1');

    // Sync should be available
    const syncButton = await screen.findByRole('button', { name: 'Sync to GitHub' });
    await user.click(syncButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/sync', {
        architecture: emptyArch,
        commit_message: 'Sync architecture from CloudBlocks',
      });
    });
  });
});

/* ================================================================== */
/*  GROUP 3 — GitHubPR submission guards (head≠base, branch collision) */
/*  Covers #842, #843, #857                                            */
/* ================================================================== */

describe('Group 3: GitHubPR submission guards', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
        backendWorkspaceId: 'backend-ws-1',
      },
    });
    useUIStore.setState({ showGitHubPR: true });
  });

  it('blocks submission when head branch matches base branch "main"', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'main');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Head branch must differ from base branch (main/master).')).toBeInTheDocument();
  });

  it('blocks submission when head branch matches base branch "master" (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const branchField = screen.getByLabelText('Branch name (optional)');
    await user.type(branchField, 'MASTER');

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
    expect(screen.getByText('Head branch must differ from base branch (main/master).')).toBeInTheDocument();
  });

  it('shows branch collision error from backend and suggests different name', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('branch already exists'));

    render(<GitHubPR />);

    await user.type(screen.getByLabelText('Branch name (optional)'), 'feature/existing');
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    expect(
      await screen.findByText("Branch 'feature/existing' already exists. Please choose a different branch name.")
    ).toBeInTheDocument();
  });

  it('blocks submission when title is empty', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const titleField = screen.getByLabelText('Title');
    await user.clear(titleField);

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
  });

  it('blocks submission when commit message is empty', async () => {
    const user = userEvent.setup();
    render(<GitHubPR />);

    const commitField = screen.getByLabelText('Commit message');
    await user.clear(commitField);

    expect(screen.getByRole('button', { name: 'Create Pull Request' })).toBeDisabled();
  });

  it('blocks submission when workspace has no backend link', () => {
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        backendWorkspaceId: undefined,
      },
    });

    render(<GitHubPR />);

    expect(screen.getByText('Workspace must be linked to backend before creating a pull request.')).toBeInTheDocument();
  });
});

/* ================================================================== */
/*  GROUP 4 — GitHubSync panel state during async operations           */
/*  Covers #858, #854, #864                                            */
/* ================================================================== */

describe('Group 4: GitHubSync panel state during async operations', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    useUIStore.setState({ showGitHubSync: true });
    mockApiGet.mockResolvedValue({ commits: [] });
    mockApiPut.mockResolvedValue({});
  });

  it('disables all controls while sync operation is in progress', async () => {
    const user = userEvent.setup();

    let resolveSync!: (value: unknown) => void;

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    // Start sync with a pending promise
    mockApiPost.mockReturnValueOnce(new Promise((r) => { resolveSync = r; }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to GitHub' });
    const pullButton = screen.getByRole('button', { name: 'Pull from GitHub' });
    const commitInput = screen.getByLabelText('Commit message');

    await user.click(syncButton);

    // While syncing, everything is disabled
    expect(syncButton).toBeDisabled();
    expect(pullButton).toBeDisabled();
    expect(commitInput).toBeDisabled();
    expect(screen.getByText('Syncing to GitHub...')).toBeInTheDocument();

    // Resolve to clean up
    resolveSync({ message: 'ok', commit_sha: 'abc' });
  });

  it('disables all controls while pull operation is in progress', async () => {
    const user = userEvent.setup();

    let resolvePull!: (value: unknown) => void;

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    mockApiPost.mockReturnValueOnce(new Promise((r) => { resolvePull = r; }));

    const pullButton = await screen.findByRole('button', { name: 'Pull from GitHub' });
    await user.click(pullButton);

    expect(pullButton).toBeDisabled();
    expect(screen.getByText('Pulling from GitHub...')).toBeInTheDocument();

    resolvePull({ architecture: emptyArch });
  });

  it('asks for confirmation before closing panel while operation is in progress', async () => {
    const user = userEvent.setup();

    let resolveSync!: (value: unknown) => void;
    mockConfirmDialog.mockResolvedValueOnce(false);

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    mockApiPost.mockReturnValueOnce(new Promise((r) => { resolveSync = r; }));
    await user.click(await screen.findByRole('button', { name: 'Sync to GitHub' }));

    // Try to close while syncing
    await user.click(screen.getByRole('button', { name: 'Close GitHub sync panel' }));

    expect(mockConfirmDialog).toHaveBeenCalledWith(
      'An operation is in progress. Closing may hide the result. Close anyway?',
      'Close GitHub Sync?'
    );
    // Panel stays open because user cancelled
    expect(useUIStore.getState().showGitHubSync).toBe(true);

    resolveSync({ message: 'ok', commit_sha: 'abc' });
  });

  it('ignores stale commit responses after workspace changes', async () => {
    const user = userEvent.setup();

    let resolveCommits!: (value: { commits: Array<{ sha: string; message: string; author: string; date: string; html_url: string }> }) => void;
    mockApiGet.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCommits = resolve; })
    );

    render(<GitHubSync />);

    await user.type(screen.getByPlaceholderText('owner/repo'), 'owner/repo-one');
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });

    // Workspace changes while commits are loading
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        id: 'ws-2',
        backendWorkspaceId: 'backend-ws-2',
      },
    });

    // Resolve with stale data
    resolveCommits({
      commits: [{
        sha: 'stale1234567890',
        message: 'stale commit data',
        author: 'ghost',
        date: '2026-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo-one/commit/stale1234567890',
      }],
    });

    // Stale data should not appear
    await waitFor(() => {
      expect(screen.queryByText('stale commit data')).not.toBeInTheDocument();
    });
  });
});

/* ================================================================== */
/*  GROUP 5 — Compare mode isolation                                   */
/*  Covers #846, #847, #872, #873                                     */
/* ================================================================== */

describe('Group 5: Compare mode isolation (read-only, no workspace mutation)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
  });

  it('DiffPanel in compare mode is read-only and does not expose workspace mutation controls', () => {
    const diffDelta = {
      plates: { added: [], removed: [], modified: [] },
      blocks: { added: [], removed: [], modified: [] },
      connections: { added: [], removed: [], modified: [] },
      externalActors: { added: [], removed: [], modified: [] },
      rootChanges: [],
      summary: { totalChanges: 0, hasBreakingChanges: false },
    } as ReturnType<typeof computeArchitectureDiff>;

    useUIStore.setState({
      diffMode: true,
      diffDelta,
    });

    render(<DiffPanel />);

    // DiffPanel should be visible
    expect(screen.getByText('🔍 Architecture Diff')).toBeInTheDocument();

    // There should be no edit/delete/mutate buttons
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert/i })).not.toBeInTheDocument();
  });

  it('closing diff mode does not discard workspace architecture', async () => {
    const user = userEvent.setup();
    const archWithNodes: ArchitectureModel = {
      ...emptyArch,
      name: 'My Production Arch',
      nodes: [{
        id: 'node-1',
        name: 'VNet',
        kind: 'container',
        layer: 'region',
        resourceType: 'virtual_network',
        category: 'network',
        provider: 'azure',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        size: { width: 8, height: 1, depth: 8 },
        metadata: {},
      }],
    };

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: archWithNodes,
      },
    });

    useUIStore.setState({
      diffMode: true,
      diffDelta: {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        externalActors: { added: [], removed: [], modified: [] },
        rootChanges: [],
        summary: { totalChanges: 0, hasBreakingChanges: false },
      } as ReturnType<typeof computeArchitectureDiff>,
    });

    render(<DiffPanel />);
    await user.click(screen.getByRole('button', { name: 'Close architecture diff panel' }));

    // Diff mode off
    expect(useUIStore.getState().diffMode).toBe(false);

    // Architecture should be unchanged
    const currentArch = useArchitectureStore.getState().workspace.architecture;
    expect(currentArch.name).toBe('My Production Arch');
    expect(currentArch.nodes).toHaveLength(1);
    expect(currentArch.nodes[0].id).toBe('node-1');
  });

  it('diff panel does not mutate workspace when switching between providers', () => {
    const originalArch = { ...emptyArch, name: 'Original' };
    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: originalArch,
      },
    });

    useUIStore.setState({
      diffMode: true,
      diffDelta: {
        plates: { added: [], removed: [], modified: [] },
        blocks: { added: [], removed: [], modified: [] },
        connections: { added: [], removed: [], modified: [] },
        externalActors: { added: [], removed: [], modified: [] },
        rootChanges: [],
        summary: { totalChanges: 0, hasBreakingChanges: false },
      } as ReturnType<typeof computeArchitectureDiff>,
    });

    // Change active provider while diff mode is on
    useUIStore.getState().setActiveProvider('gcp');

    render(<DiffPanel />);

    // Workspace architecture should be untouched
    expect(useArchitectureStore.getState().workspace.architecture.name).toBe('Original');
  });
});

/* ================================================================== */
/*  GROUP 6 — PR body prefill from compare review                      */
/*  Covers #876                                                        */
/* ================================================================== */

describe('Group 6: PR body prefill from compare review', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      user: mockUser,
    });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        architecture: emptyArch,
        createdAt: '',
        updatedAt: '',
        backendWorkspaceId: 'backend-ws-1',
      },
    });
    useUIStore.setState({ showGitHubPR: true });
  });

  it('prefills PR body from compareReviewPrefill and clears the prefill state', () => {
    const reviewText = '## Changes\n- Added VNet\n- Removed legacy subnet';
    useUIStore.setState({ compareReviewPrefill: reviewText });

    render(<GitHubPR />);

    const bodyField = screen.getByLabelText('Body (optional)');
    expect(bodyField).toHaveValue(reviewText);

    // Prefill state should be consumed
    expect(useUIStore.getState().compareReviewPrefill).toBe(null);
  });

  it('does not overwrite body when compareReviewPrefill is null', () => {
    useUIStore.setState({ compareReviewPrefill: null });

    render(<GitHubPR />);

    const bodyField = screen.getByLabelText('Body (optional)');
    expect(bodyField).toHaveValue('');
  });

  it('submits PR with prefilled body content', async () => {
    const user = userEvent.setup();
    const reviewText = '## Review\n- Architecture validated';
    useUIStore.setState({ compareReviewPrefill: reviewText });

    mockApiPost.mockResolvedValueOnce({
      pull_request_url: 'https://github.com/owner/repo/pull/99',
      number: 99,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);

    // Body should be prefilled
    expect(screen.getByLabelText('Body (optional)')).toHaveValue(reviewText);

    // Submit the PR
    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/v1/workspaces/backend-ws-1/pr',
        expect.objectContaining({
          body: reviewText,
        })
      );
    });

    expect(await screen.findByText('https://github.com/owner/repo/pull/99')).toBeInTheDocument();
  });

  it('allows editing prefilled body before submission', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ compareReviewPrefill: 'Initial review' });

    mockApiPost.mockResolvedValueOnce({
      pull_request_url: 'https://github.com/owner/repo/pull/100',
      number: 100,
      branch: 'cloudblocks/update',
    });

    render(<GitHubPR />);

    const bodyField = screen.getByLabelText('Body (optional)');
    await user.clear(bodyField);
    await user.type(bodyField, 'Edited review with additional notes');

    await user.click(screen.getByRole('button', { name: 'Create Pull Request' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/v1/workspaces/backend-ws-1/pr',
        expect.objectContaining({
          body: 'Edited review with additional notes',
        })
      );
    });
  });
});
