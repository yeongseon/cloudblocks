import { create } from 'zustand';
import type { EnvironmentName } from '../../shared/types/ops';

export type { EnvironmentName };
export type EnvironmentStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'not_deployed';
export type PipelineStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type PipelineConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | null;

export interface EnvironmentInfo {
  name: EnvironmentName;
  status: EnvironmentStatus;
  lastDeployedAt: string | null;
  imageTag: string | null;
  commitSha: string | null;
  version: string | null;
}

export interface PipelineRun {
  id: number;
  name: string;
  status: PipelineStatus;
  conclusion: PipelineConclusion;
  branch: string;
  commitSha: string;
  commitMessage: string;
  startedAt: string;
  completedAt: string | null;
  url: string;
}

export interface DeploymentRecord {
  id: string;
  environment: EnvironmentName;
  imageTag: string;
  commitSha: string;
  commitMessage: string;
  deployedBy: string;
  deployedAt: string;
  status: 'success' | 'failed' | 'in_progress';
  duration: number | null; // seconds
}

export interface CostEstimate {
  environment: EnvironmentName;
  monthlyEstimate: number;
  currency: string;
  breakdown: { resource: string; monthlyCost: number }[];
  lastUpdated: string;
}

interface OpsState {
  // Environment status
  environments: EnvironmentInfo[];
  loadingEnvironments: boolean;

  // Pipeline status
  pipelineRuns: PipelineRun[];
  loadingPipelines: boolean;

  // Deployment history
  deploymentHistory: DeploymentRecord[];
  loadingDeployments: boolean;

  // Cost estimation
  costEstimates: CostEstimate[];
  loadingCosts: boolean;

  // Panel visibility
  showOpsCenter: boolean;
  activeOpsTab: 'dashboard' | 'pipelines' | 'deployments' | 'costs';

  // Actions
  toggleOpsCenter: () => void;
  setShowOpsCenter: (show: boolean) => void;
  setActiveOpsTab: (tab: OpsState['activeOpsTab']) => void;

  refreshEnvironments: () => Promise<void>;
  refreshPipelines: () => Promise<void>;
  refreshDeployments: () => Promise<void>;
  refreshCosts: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 500));
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const useOpsStore = create<OpsState>((set, get) => ({
  environments: [],
  loadingEnvironments: false,

  pipelineRuns: [],
  loadingPipelines: false,

  deploymentHistory: [],
  loadingDeployments: false,

  costEstimates: [],
  loadingCosts: false,

  showOpsCenter: false,
  activeOpsTab: 'dashboard',

  toggleOpsCenter: () => set((s) => ({ showOpsCenter: !s.showOpsCenter })),
  setShowOpsCenter: (show) => set({ showOpsCenter: show }),
  setActiveOpsTab: (tab) => set({ activeOpsTab: tab }),

  refreshEnvironments: async () => {
    set({ loadingEnvironments: true });
    try {
      await mockDelay();
      set({
        loadingEnvironments: false,
        environments: [
          {
            name: 'local',
            status: 'healthy',
            lastDeployedAt: null,
            imageTag: null,
            commitSha: null,
            version: null,
          },
          {
            name: 'staging',
            status: 'healthy',
            lastDeployedAt: hoursAgo(2),
            imageTag: 'sha-a1b2c3d',
            commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
            version: '0.18.1-rc.3',
          },
          {
            name: 'production',
            status: 'healthy',
            lastDeployedAt: daysAgo(1),
            imageTag: 'sha-f7e8d9c',
            commitSha: 'f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8',
            version: '0.17.0',
          },
        ],
      });
    } catch {
      set({ loadingEnvironments: false });
    }
  },

  refreshPipelines: async () => {
    set({ loadingPipelines: true });
    try {
      await mockDelay();
      set({
        loadingPipelines: false,
        pipelineRuns: [
          {
            id: 1001,
            name: 'CI / Build & Test',
            status: 'in_progress',
            conclusion: null,
            branch: 'feat/ops-center',
            commitSha: 'c4d5e6f7',
            commitMessage: 'feat(web): add Ops Control Center widget',
            startedAt: minutesAgo(3),
            completedAt: null,
            url: 'https://github.com/cloudblocks/cloudblocks/actions/runs/1001',
          },
          {
            id: 1000,
            name: 'CI / Build & Test',
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            commitSha: 'a1b2c3d4',
            commitMessage: 'fix(web): refine provider portrait visuals',
            startedAt: hoursAgo(1),
            completedAt: minutesAgo(55),
            url: 'https://github.com/cloudblocks/cloudblocks/actions/runs/1000',
          },
          {
            id: 999,
            name: 'Deploy / Staging',
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            commitSha: 'a1b2c3d4',
            commitMessage: 'fix(web): refine provider portrait visuals',
            startedAt: hoursAgo(1),
            completedAt: minutesAgo(50),
            url: 'https://github.com/cloudblocks/cloudblocks/actions/runs/999',
          },
          {
            id: 998,
            name: 'CI / Build & Test',
            status: 'completed',
            conclusion: 'failure',
            branch: 'feat/cost-panel',
            commitSha: 'b2c3d4e5',
            commitMessage: 'feat(web): add cost estimation panel',
            startedAt: hoursAgo(3),
            completedAt: hoursAgo(3),
            url: 'https://github.com/cloudblocks/cloudblocks/actions/runs/998',
          },
          {
            id: 997,
            name: 'Deploy / Production',
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            commitSha: 'f7e8d9c0',
            commitMessage: 'release: v0.17.0',
            startedAt: daysAgo(1),
            completedAt: daysAgo(1),
            url: 'https://github.com/cloudblocks/cloudblocks/actions/runs/997',
          },
        ],
      });
    } catch {
      set({ loadingPipelines: false });
    }
  },

  refreshDeployments: async () => {
    set({ loadingDeployments: true });
    try {
      await mockDelay();
      set({
        loadingDeployments: false,
        deploymentHistory: [
          {
            id: 'dep-008',
            environment: 'staging',
            imageTag: 'sha-a1b2c3d',
            commitSha: 'a1b2c3d4',
            commitMessage: 'fix(web): refine provider portrait visuals',
            deployedBy: 'github-actions',
            deployedAt: hoursAgo(2),
            status: 'success',
            duration: 142,
          },
          {
            id: 'dep-007',
            environment: 'production',
            imageTag: 'sha-f7e8d9c',
            commitSha: 'f7e8d9c0',
            commitMessage: 'release: v0.17.0',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(1),
            status: 'success',
            duration: 198,
          },
          {
            id: 'dep-006',
            environment: 'staging',
            imageTag: 'sha-f7e8d9c',
            commitSha: 'f7e8d9c0',
            commitMessage: 'release: v0.17.0',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(1),
            status: 'success',
            duration: 135,
          },
          {
            id: 'dep-005',
            environment: 'staging',
            imageTag: 'sha-e6d5c4b',
            commitSha: 'e6d5c4b3',
            commitMessage: 'fix(web): domain model and store logic improvements',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(2),
            status: 'success',
            duration: 140,
          },
          {
            id: 'dep-004',
            environment: 'production',
            imageTag: 'sha-d4c3b2a',
            commitSha: 'd4c3b2a1',
            commitMessage: 'release: v0.16.2',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(5),
            status: 'success',
            duration: 205,
          },
          {
            id: 'dep-003',
            environment: 'staging',
            imageTag: 'sha-c3b2a1f',
            commitSha: 'c3b2a1f0',
            commitMessage: 'feat(web): harden ConfirmDialog',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(6),
            status: 'failed',
            duration: 87,
          },
          {
            id: 'dep-002',
            environment: 'staging',
            imageTag: 'sha-b2a1f0e',
            commitSha: 'b2a1f0e9',
            commitMessage: 'fix(web): hide profile selector for global plates',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(7),
            status: 'success',
            duration: 131,
          },
          {
            id: 'dep-001',
            environment: 'production',
            imageTag: 'sha-a1f0e9d',
            commitSha: 'a1f0e9d8',
            commitMessage: 'release: v0.16.0',
            deployedBy: 'github-actions',
            deployedAt: daysAgo(10),
            status: 'success',
            duration: 210,
          },
        ],
      });
    } catch {
      set({ loadingDeployments: false });
    }
  },

  refreshCosts: async () => {
    set({ loadingCosts: true });
    try {
      await mockDelay();
      set({
        loadingCosts: false,
        costEstimates: [
          {
            environment: 'staging',
            monthlyEstimate: 45.2,
            currency: 'USD',
            breakdown: [
              { resource: 'App Service (B1)', monthlyCost: 13.14 },
              { resource: 'Azure SQL (Basic)', monthlyCost: 4.99 },
              { resource: 'Container Registry (Basic)', monthlyCost: 5.0 },
              { resource: 'Storage Account (LRS)', monthlyCost: 2.07 },
              { resource: 'Key Vault (Standard)', monthlyCost: 0.0 },
              { resource: 'Virtual Network', monthlyCost: 0.0 },
              { resource: 'Application Insights', monthlyCost: 10.0 },
              { resource: 'DNS Zone', monthlyCost: 0.5 },
              { resource: 'Other', monthlyCost: 9.5 },
            ],
            lastUpdated: hoursAgo(6),
          },
          {
            environment: 'production',
            monthlyEstimate: 127.8,
            currency: 'USD',
            breakdown: [
              { resource: 'App Service (S1)', monthlyCost: 69.35 },
              { resource: 'Azure SQL (S0)', monthlyCost: 14.72 },
              { resource: 'Container Registry (Standard)', monthlyCost: 10.0 },
              { resource: 'Storage Account (GRS)', monthlyCost: 4.14 },
              { resource: 'Key Vault (Standard)', monthlyCost: 0.03 },
              { resource: 'Virtual Network', monthlyCost: 0.0 },
              { resource: 'Application Insights', monthlyCost: 10.0 },
              { resource: 'Front Door (Standard)', monthlyCost: 10.06 },
              { resource: 'DNS Zone', monthlyCost: 0.5 },
              { resource: 'Other', monthlyCost: 9.0 },
            ],
            lastUpdated: hoursAgo(6),
          },
        ],
      });
    } catch {
      set({ loadingCosts: false });
    }
  },

  refreshAll: async () => {
    const state = get();
    await Promise.allSettled([
      state.refreshEnvironments(),
      state.refreshPipelines(),
      state.refreshDeployments(),
      state.refreshCosts(),
    ]);
  },
}));
