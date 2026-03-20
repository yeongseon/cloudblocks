import { create } from 'zustand';
import type {
  PromotionRecord,
  RollbackRecord,
  PromotionChecklist,
  DeploymentVersion,
} from '../../shared/types/ops';

const DEFAULT_CHECKLIST: PromotionChecklist = {
  stagingHealthy: false,
  ciPassed: false,
  noActiveIncidents: false,
  manualApproval: false,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface PromoteState {
  // Promote
  showPromoteDialog: boolean;
  promotionChecklist: PromotionChecklist;
  promoting: boolean;
  promotionError: string | null;

  // Rollback
  showRollbackDialog: boolean;
  availableVersions: DeploymentVersion[];
  selectedRollbackVersion: DeploymentVersion | null;
  rollingBack: boolean;
  rollbackError: string | null;

  // History
  promotionHistory: PromotionRecord[];
  rollbackHistory: RollbackRecord[];
  showPromoteHistory: boolean;
  loadingHistory: boolean;

  // Actions
  togglePromoteDialog: () => void;
  setShowPromoteDialog: (show: boolean) => void;
  updateChecklist: (key: keyof PromotionChecklist, value: boolean) => void;
  resetChecklist: () => void;
  promote: (imageTag: string) => Promise<void>;

  toggleRollbackDialog: () => void;
  setShowRollbackDialog: (show: boolean) => void;
  selectRollbackVersion: (version: DeploymentVersion | null) => void;
  loadAvailableVersions: () => Promise<void>;
  rollback: (version: DeploymentVersion, reason: string) => Promise<void>;

  togglePromoteHistory: () => void;
  loadHistory: () => Promise<void>;
}

export const usePromoteStore = create<PromoteState>((set, get) => ({
  // Promote
  showPromoteDialog: false,
  promotionChecklist: { ...DEFAULT_CHECKLIST },
  promoting: false,
  promotionError: null,

  // Rollback
  showRollbackDialog: false,
  availableVersions: [],
  selectedRollbackVersion: null,
  rollingBack: false,
  rollbackError: null,

  // History
  promotionHistory: [],
  rollbackHistory: [],
  showPromoteHistory: false,
  loadingHistory: false,

  // ── Promote actions ──────────────────────────────────────

  togglePromoteDialog: () =>
    set((s) => ({ showPromoteDialog: !s.showPromoteDialog })),

  setShowPromoteDialog: (show) => set({ showPromoteDialog: show }),

  updateChecklist: (key, value) =>
    set((s) => ({
      promotionChecklist: { ...s.promotionChecklist, [key]: value },
    })),

  resetChecklist: () =>
    set({ promotionChecklist: { ...DEFAULT_CHECKLIST } }),

  promote: async (imageTag: string) => {
    set({ promoting: true, promotionError: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const record: PromotionRecord = {
        id: generateId(),
        fromEnvironment: 'staging',
        toEnvironment: 'production',
        imageTag,
        commitSha: 'abc1234',
        commitMessage: `Promote ${imageTag} to production`,
        promotedBy: 'current-user',
        promotedAt: new Date().toISOString(),
        status: 'success',
      };
      set((s) => ({
        promoting: false,
        promotionHistory: [record, ...s.promotionHistory],
        promotionChecklist: { ...DEFAULT_CHECKLIST },
        showPromoteDialog: false,
      }));
    } catch {
      set({ promoting: false, promotionError: 'Promotion failed. Please try again.' });
    }
  },

  // ── Rollback actions ─────────────────────────────────────

  toggleRollbackDialog: () =>
    set((s) => ({ showRollbackDialog: !s.showRollbackDialog })),

  setShowRollbackDialog: (show) => set({ showRollbackDialog: show }),

  selectRollbackVersion: (version) =>
    set({ selectedRollbackVersion: version }),

  loadAvailableVersions: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const versions: DeploymentVersion[] = [
      {
        imageTag: 'v1.4.2-sha-e3f9a01',
        commitSha: 'e3f9a01',
        commitMessage: 'fix: resolve memory leak in worker pool',
        deployedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        environment: 'production',
      },
      {
        imageTag: 'v1.4.1-sha-b7c2d44',
        commitSha: 'b7c2d44',
        commitMessage: 'feat: add rate limiting to API gateway',
        deployedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
        environment: 'production',
      },
      {
        imageTag: 'v1.4.0-sha-91a8f33',
        commitSha: '91a8f33',
        commitMessage: 'feat: implement batch processing endpoint',
        deployedAt: new Date(Date.now() - 72 * 3600_000).toISOString(),
        environment: 'production',
      },
      {
        imageTag: 'v1.3.9-sha-4de56cc',
        commitSha: '4de56cc',
        commitMessage: 'fix: correct timezone handling in scheduler',
        deployedAt: new Date(Date.now() - 168 * 3600_000).toISOString(),
        environment: 'production',
      },
      {
        imageTag: 'v1.3.8-sha-f0a12bb',
        commitSha: 'f0a12bb',
        commitMessage: 'chore: upgrade database driver to v3.2',
        deployedAt: new Date(Date.now() - 336 * 3600_000).toISOString(),
        environment: 'production',
      },
    ];
    set({ availableVersions: versions });
  },

  rollback: async (version: DeploymentVersion, reason: string) => {
    set({ rollingBack: true, rollbackError: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const record: RollbackRecord = {
        id: generateId(),
        environment: 'production',
        fromImageTag: 'v1.4.3-sha-abc1234',
        toImageTag: version.imageTag,
        reason,
        rolledBackBy: 'current-user',
        rolledBackAt: new Date().toISOString(),
        status: 'success',
      };
      set((s) => ({
        rollingBack: false,
        rollbackHistory: [record, ...s.rollbackHistory],
        selectedRollbackVersion: null,
        showRollbackDialog: false,
      }));
    } catch {
      set({ rollingBack: false, rollbackError: 'Rollback failed. Please try again.' });
    }
  },

  // ── History actions ──────────────────────────────────────

  togglePromoteHistory: () =>
    set((s) => ({ showPromoteHistory: !s.showPromoteHistory })),

  loadHistory: async () => {
    set({ loadingHistory: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const promotions: PromotionRecord[] = [
      {
        id: 'hist-p1',
        fromEnvironment: 'staging',
        toEnvironment: 'production',
        imageTag: 'v1.4.3-sha-abc1234',
        commitSha: 'abc1234',
        commitMessage: 'feat: add dashboard widgets',
        promotedBy: 'alice',
        promotedAt: new Date(Date.now() - 3600_000).toISOString(),
        status: 'success',
      },
      {
        id: 'hist-p2',
        fromEnvironment: 'staging',
        toEnvironment: 'production',
        imageTag: 'v1.4.2-sha-e3f9a01',
        commitSha: 'e3f9a01',
        commitMessage: 'fix: resolve memory leak in worker pool',
        promotedBy: 'bob',
        promotedAt: new Date(Date.now() - 86400_000).toISOString(),
        status: 'success',
      },
      {
        id: 'hist-p3',
        fromEnvironment: 'staging',
        toEnvironment: 'production',
        imageTag: 'v1.4.1-sha-b7c2d44',
        commitSha: 'b7c2d44',
        commitMessage: 'feat: add rate limiting to API gateway',
        promotedBy: 'alice',
        promotedAt: new Date(Date.now() - 172800_000).toISOString(),
        status: 'failed',
      },
    ];
    const rollbacks: RollbackRecord[] = [
      {
        id: 'hist-r1',
        environment: 'production',
        fromImageTag: 'v1.4.1-sha-b7c2d44',
        toImageTag: 'v1.4.0-sha-91a8f33',
        reason: 'Rate limiter caused 502 errors under load',
        rolledBackBy: 'bob',
        rolledBackAt: new Date(Date.now() - 162000_000).toISOString(),
        status: 'success',
      },
      {
        id: 'hist-r2',
        environment: 'production',
        fromImageTag: 'v1.3.5-sha-dd00ee1',
        toImageTag: 'v1.3.4-sha-cc99ff2',
        reason: 'Database migration timeout in production',
        rolledBackBy: 'alice',
        rolledBackAt: new Date(Date.now() - 604800_000).toISOString(),
        status: 'success',
      },
    ];
    set({ promotionHistory: promotions, rollbackHistory: rollbacks, loadingHistory: false });
  },
}));
