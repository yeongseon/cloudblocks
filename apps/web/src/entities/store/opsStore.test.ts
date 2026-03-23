import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useOpsStore } from './opsStore';

describe('useOpsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useOpsStore.setState({
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
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useOpsStore.getState();
      expect(state.showOpsCenter).toBe(false);
      expect(state.activeOpsTab).toBe('dashboard');
      expect(state.environments).toEqual([]);
      expect(state.pipelineRuns).toEqual([]);
      expect(state.costEstimates).toEqual([]);
    });
  });

  describe('toggleOpsCenter', () => {
    it('toggles showOpsCenter', () => {
      useOpsStore.getState().toggleOpsCenter();
      expect(useOpsStore.getState().showOpsCenter).toBe(true);

      useOpsStore.getState().toggleOpsCenter();
      expect(useOpsStore.getState().showOpsCenter).toBe(false);
    });
  });

  describe('setActiveOpsTab', () => {
    it('changes the active tab', () => {
      useOpsStore.getState().setActiveOpsTab('pipelines');
      expect(useOpsStore.getState().activeOpsTab).toBe('pipelines');

      useOpsStore.getState().setActiveOpsTab('costs');
      expect(useOpsStore.getState().activeOpsTab).toBe('costs');
    });
  });

  describe('refreshEnvironments', () => {
    it('populates 3 environments', async () => {
      const promise = useOpsStore.getState().refreshEnvironments();
      expect(useOpsStore.getState().loadingEnvironments).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const { environments, loadingEnvironments } = useOpsStore.getState();
      expect(loadingEnvironments).toBe(false);
      expect(environments).toHaveLength(3);
      expect(environments.map((e) => e.name)).toEqual(['local', 'staging', 'production']);
    });
  });

  describe('refreshPipelines', () => {
    it('populates pipeline runs', async () => {
      const promise = useOpsStore.getState().refreshPipelines();

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const { pipelineRuns, loadingPipelines } = useOpsStore.getState();
      expect(loadingPipelines).toBe(false);
      expect(pipelineRuns.length).toBeGreaterThan(0);
      expect(pipelineRuns[0]).toHaveProperty('id');
      expect(pipelineRuns[0]).toHaveProperty('name');
      expect(pipelineRuns[0]).toHaveProperty('status');
    });
  });

  describe('refreshCosts', () => {
    it('populates cost estimates', async () => {
      const promise = useOpsStore.getState().refreshCosts();

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const { costEstimates, loadingCosts } = useOpsStore.getState();
      expect(loadingCosts).toBe(false);
      expect(costEstimates.length).toBeGreaterThan(0);
      expect(costEstimates[0]).toHaveProperty('monthlyEstimate');
      expect(costEstimates[0]).toHaveProperty('breakdown');
    });
  });

  describe('refreshAll', () => {
    it('populates environments, pipelines, deployments, and costs', async () => {
      const promise = useOpsStore.getState().refreshAll();

      await act(async () => {
        vi.advanceTimersByTime(600);
        await promise;
      });

      const state = useOpsStore.getState();
      expect(state.environments.length).toBeGreaterThan(0);
      expect(state.pipelineRuns.length).toBeGreaterThan(0);
      expect(state.deploymentHistory.length).toBeGreaterThan(0);
      expect(state.costEstimates.length).toBeGreaterThan(0);
    });
  });
});
