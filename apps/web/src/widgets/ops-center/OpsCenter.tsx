import { useEffect, type ReactNode } from 'react';
import { useOpsStore } from '../../entities/store/opsStore';
import type { EnvironmentInfo, PipelineRun, DeploymentRecord, CostEstimate } from '../../entities/store/opsStore';
import { timeAgo } from '../../shared/utils/timeAgo';
import './OpsCenter.css';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function pipelineIcon(run: PipelineRun): ReactNode {
  if (run.status === 'in_progress') {
    return <span className="ops-spinner">&#9881;</span>;
  }
  if (run.conclusion === 'success') return <span style={{ color: '#4caf50' }}>&#10003;</span>;
  if (run.conclusion === 'failure') return <span style={{ color: '#ef5350' }}>&#10007;</span>;
  if (run.conclusion === 'cancelled') return <span style={{ color: '#999' }}>&#9679;</span>;
  if (run.status === 'queued') return <span style={{ color: '#ff9800' }}>&#9201;</span>;
  return <span style={{ color: '#666' }}>&#8212;</span>;
}

/* ─── Sub-components ─── */

function EnvironmentCards({ environments }: { environments: EnvironmentInfo[] }) {
  if (environments.length === 0) {
    return <div className="ops-empty">No environment data. Click Refresh to load.</div>;
  }
  return (
    <div className="ops-env-cards">
      {environments.map((env) => (
        <div key={env.name} className="ops-env-card">
          <div className="ops-env-card-header">
            <span className="ops-status-dot" data-status={env.status} />
            <span className="ops-env-name">{env.name}</span>
          </div>
          <div className="ops-env-detail">
            Status: <span>{env.status}</span>
          </div>
          {env.lastDeployedAt ? (
            <div className="ops-env-detail">
              Deployed: <span>{timeAgo(env.lastDeployedAt)}</span>
            </div>
          ) : (
            <div className="ops-env-detail">
              Deployed: <span>never</span>
            </div>
          )}
          {env.imageTag && (
            <div className="ops-env-detail">
              Image: <span>{env.imageTag}</span>
            </div>
          )}
          {env.version && (
            <div className="ops-env-detail">
              Version: <span>{env.version}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompareEnvironments({ environments }: { environments: EnvironmentInfo[] }) {
  const staging = environments.find((e) => e.name === 'staging');
  const production = environments.find((e) => e.name === 'production');

  if (!staging || !production) {
    return null;
  }

  const inSync = staging.imageTag !== null && staging.imageTag === production.imageTag;

  return (
    <div className="ops-compare-section">
      <h4 className="ops-section-title">Compare Environments</h4>
      {inSync ? (
        <p className="ops-compare-status ops-compare-synced">
          Staging and Production are in sync
        </p>
      ) : (
        <>
          <p className="ops-compare-status ops-compare-diverged">
            Staging and Production have diverged
          </p>
          <div className="ops-compare-diff">
            Staging: <code>{staging.imageTag ?? 'not deployed'}</code>
            {' / '}
            Production: <code>{production.imageTag ?? 'not deployed'}</code>
          </div>
        </>
      )}
    </div>
  );
}

function QuickPipelineStatus({ runs }: { runs: PipelineRun[] }) {
  const recent = runs.slice(0, 3);
  if (recent.length === 0) {
    return null;
  }
  return (
    <div className="ops-quick-pipelines">
      <h4 className="ops-section-title">Recent Pipelines</h4>
      {recent.map((run) => (
        <div key={run.id} className="ops-quick-pipeline">
          <span className="ops-quick-pipeline-icon">{pipelineIcon(run)}</span>
          <span className="ops-quick-pipeline-name">{run.name}</span>
          <span className="ops-quick-pipeline-msg">{run.commitMessage}</span>
          <span className="ops-quick-pipeline-time">{timeAgo(run.startedAt)}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardTab() {
  const environments = useOpsStore((s) => s.environments);
  const pipelineRuns = useOpsStore((s) => s.pipelineRuns);
  const loadingEnvironments = useOpsStore((s) => s.loadingEnvironments);
  const loadingPipelines = useOpsStore((s) => s.loadingPipelines);

  if (loadingEnvironments || loadingPipelines) {
    return <div className="ops-center-loading">Loading dashboard...</div>;
  }

  return (
    <>
      <h4 className="ops-section-title">Environment Status</h4>
      <EnvironmentCards environments={environments} />
      <CompareEnvironments environments={environments} />
      <QuickPipelineStatus runs={pipelineRuns} />
    </>
  );
}

function PipelinesTab() {
  const pipelineRuns = useOpsStore((s) => s.pipelineRuns);
  const loading = useOpsStore((s) => s.loadingPipelines);

  if (loading) {
    return <div className="ops-center-loading">Loading pipelines...</div>;
  }

  if (pipelineRuns.length === 0) {
    return <div className="ops-empty">No pipeline runs. Click Refresh to load.</div>;
  }

  return (
    <div className="ops-pipeline-list">
      {pipelineRuns.map((run) => {
        const duration =
          run.completedAt && run.startedAt
            ? Math.floor(
                (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
              )
            : null;
        return (
          <div key={run.id} className="ops-pipeline-item">
            <span className="ops-pipeline-icon">{pipelineIcon(run)}</span>
            <div className="ops-pipeline-info">
              <div className="ops-pipeline-name">{run.name}</div>
              <div className="ops-pipeline-meta">
                <span className="ops-pipeline-branch">{run.branch}</span>
                {' '}
                {run.commitMessage.length > 60
                  ? run.commitMessage.slice(0, 60) + '...'
                  : run.commitMessage}
              </div>
            </div>
            <span className="ops-pipeline-duration">
              {run.status === 'in_progress'
                ? 'Running...'
                : duration !== null
                  ? formatDuration(duration)
                  : ''}
            </span>
            <a
              className="ops-pipeline-link"
              href={run.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Details
            </a>
          </div>
        );
      })}
    </div>
  );
}

function DeploymentsTab() {
  const deploymentHistory = useOpsStore((s) => s.deploymentHistory);
  const loading = useOpsStore((s) => s.loadingDeployments);

  if (loading) {
    return <div className="ops-center-loading">Loading deployment history...</div>;
  }

  if (deploymentHistory.length === 0) {
    return <div className="ops-empty">No deployments. Click Refresh to load.</div>;
  }

  return (
    <div className="ops-deploy-list">
      {deploymentHistory.map((dep: DeploymentRecord) => (
        <div key={dep.id} className="ops-deploy-item">
          <span className="ops-deploy-env-badge" data-env={dep.environment}>
            {dep.environment}
          </span>
          <span className="ops-deploy-tag">{dep.imageTag}</span>
          <span className="ops-deploy-message" title={dep.commitMessage}>
            {dep.commitMessage}
          </span>
          <span className="ops-deploy-time">{timeAgo(dep.deployedAt)}</span>
          <span className="ops-deploy-status-badge" data-status={dep.status}>
            {dep.status === 'in_progress' ? 'deploying' : dep.status}
          </span>
          <span className="ops-deploy-duration">
            {dep.duration !== null ? formatDuration(dep.duration) : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

function CostsTab() {
  const costEstimates = useOpsStore((s) => s.costEstimates);
  const loading = useOpsStore((s) => s.loadingCosts);

  if (loading) {
    return <div className="ops-center-loading">Loading cost estimates...</div>;
  }

  if (costEstimates.length === 0) {
    return <div className="ops-empty">No cost data. Click Refresh to load.</div>;
  }

  const total = costEstimates.reduce((sum, c) => sum + c.monthlyEstimate, 0);

  return (
    <div className="ops-cost-section">
      <div className="ops-cost-total">
        ${total.toFixed(2)}
        <span className="ops-cost-total-label">/ month (total)</span>
      </div>
      {costEstimates.map((cost: CostEstimate) => (
        <div key={cost.environment} className="ops-cost-env">
          <div className="ops-cost-env-header">
            <span className="ops-cost-env-name">{cost.environment}</span>
            <span className="ops-cost-env-total">
              ${cost.monthlyEstimate.toFixed(2)}/mo
            </span>
          </div>
          <div className="ops-cost-breakdown">
            {cost.breakdown.map((item) => (
              <div key={item.resource} className="ops-cost-row">
                <span className="ops-cost-resource">{item.resource}</span>
                <span className="ops-cost-amount">${item.monthlyCost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="ops-cost-disclaimer">
        Estimates based on Azure pricing. Actual costs may vary.
      </div>
    </div>
  );
}

/* ─── Main OpsCenter ─── */

export function OpsCenter() {
  const showOpsCenter = useOpsStore((s) => s.showOpsCenter);
  const setShowOpsCenter = useOpsStore((s) => s.setShowOpsCenter);
  const activeOpsTab = useOpsStore((s) => s.activeOpsTab);
  const setActiveOpsTab = useOpsStore((s) => s.setActiveOpsTab);
  const refreshAll = useOpsStore((s) => s.refreshAll);
  const loadingEnvironments = useOpsStore((s) => s.loadingEnvironments);
  const loadingPipelines = useOpsStore((s) => s.loadingPipelines);
  const loadingDeployments = useOpsStore((s) => s.loadingDeployments);
  const loadingCosts = useOpsStore((s) => s.loadingCosts);

  const isLoading = loadingEnvironments || loadingPipelines || loadingDeployments || loadingCosts;

  // Load data on first open
  useEffect(() => {
    if (showOpsCenter) {
      void refreshAll();
    }
  }, [showOpsCenter, refreshAll]);

  if (!showOpsCenter) return null;

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'pipelines' as const, label: 'Pipelines' },
    { id: 'deployments' as const, label: 'Deployments' },
    { id: 'costs' as const, label: 'Costs' },
  ];

  return (
    <div className="ops-center">
      {/* Header */}
      <div className="ops-center-header">
        <div className="ops-center-header-left">
          <h3 className="ops-center-title">&#9881; Ops Control Center</h3>
        </div>
        <div className="ops-center-header-actions">
          <button
            type="button"
            className="ops-center-refresh-btn"
            onClick={() => void refreshAll()}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh All'}
          </button>
          <button
            type="button"
            className="ops-center-close"
            onClick={() => setShowOpsCenter(false)}
            aria-label="Close Ops Center"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ops-center-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="ops-center-tab"
            data-active={activeOpsTab === tab.id}
            onClick={() => setActiveOpsTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ops-center-body">
        {activeOpsTab === 'dashboard' && <DashboardTab />}
        {activeOpsTab === 'pipelines' && <PipelinesTab />}
        {activeOpsTab === 'deployments' && <DeploymentsTab />}
        {activeOpsTab === 'costs' && <CostsTab />}
      </div>
    </div>
  );
}
