import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { validateArchitectureShape } from '../../entities/store/slices';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import type { PullResponse } from '../../shared/types/api';
import type { ArchitectureModel } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import './DiffPanel.css';

type SectionKey = 'plates' | 'blocks' | 'connections' | 'externalActors';

const SECTION_CONFIG: Array<{ key: SectionKey; label: string }> = [
  { key: 'plates', label: 'Plates' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'connections', label: 'Connections' },
  { key: 'externalActors', label: 'External Actors' },
];

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  if (value === null) return 'null';

  const json = JSON.stringify(value);
  if (typeof json === 'undefined') return String(value);
  return json;
}

function hasName(entity: { id: string }): entity is { id: string; name: string } {
  return 'name' in entity && typeof (entity as { name?: unknown }).name === 'string';
}

function hasEndpoints(entity: { id: string }): entity is { id: string; sourceId: string; targetId: string } {
  return (
    'sourceId' in entity
    && 'targetId' in entity
    && typeof (entity as { sourceId?: unknown }).sourceId === 'string'
    && typeof (entity as { targetId?: unknown }).targetId === 'string'
  );
}

function getEntityLabel(entity: { id: string }): string {
  if (hasName(entity)) return `${entity.name} (${entity.id})`;
  if (hasEndpoints(entity)) return `${entity.id} (${entity.sourceId} -> ${entity.targetId})`;
  return entity.id;
}

/** Build a plaintext summary of the diff for copy/export (#875) */
function buildDiffText(delta: DiffDelta): string {
  const lines: string[] = ['Architecture Diff Summary', '========================', ''];
  const { added, modified, removed } = ['plates', 'blocks', 'connections', 'externalActors'].reduce(
    (acc, key) => {
      const section = delta[key as keyof DiffDelta] as { added: { id: string }[]; modified: { id: string }[]; removed: { id: string }[] };
      return {
        added: acc.added + section.added.length,
        modified: acc.modified + section.modified.length,
        removed: acc.removed + section.removed.length,
      };
    },
    { added: 0, modified: 0, removed: 0 },
  );
  lines.push(`+${added} added, ~${modified} modified, -${removed} removed`);
  if (delta.summary.hasBreakingChanges) lines.push('!! Breaking changes detected');
  lines.push('');

  for (const { key, label } of SECTION_CONFIG) {
    const section = delta[key];
    const total = section.added.length + section.modified.length + section.removed.length;
    if (total === 0) continue;
    lines.push(`${label}:`);
    for (const e of section.added) lines.push(`  + ${getEntityLabel(e)}`);
    for (const e of section.removed) lines.push(`  - ${getEntityLabel(e)}`);
    for (const e of section.modified) lines.push(`  ~ ${getEntityLabel(e.after)} (${e.changes.length} changes)`);
    lines.push('');
  }

  return lines.join('\n');
}

export function DiffPanel() {
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const diffFetchedAt = useUIStore((s) => s.diffFetchedAt);
  const diffRepoContext = useUIStore((s) => s.diffRepoContext);
  const [trackedDelta, setTrackedDelta] = useState(diffDelta);
  const [trackedMode, setTrackedMode] = useState(diffMode);
  const [generation, setGeneration] = useState(0);

  if (trackedDelta !== diffDelta || trackedMode !== diffMode) {
    setTrackedDelta(diffDelta);
    setTrackedMode(diffMode);
    setGeneration((g) => g + 1);
  }

  if (!diffMode) return null;

  const handleClose = () => {
    useUIStore.getState().setDiffMode(false);
  };

  if (!diffDelta) {
    return (
      <div className="diff-panel">
        <div className="diff-panel-header">
          <h3 className="diff-panel-title">Architecture Diff</h3>
          <button type="button" className="diff-panel-close" onClick={handleClose} aria-label="Close architecture diff panel">
            ✕
          </button>
        </div>
        <div className="diff-no-changes">No diff data available.</div>
      </div>
    );
  }

  return (
    <DiffPanelContent
      key={generation}
      diffDelta={diffDelta}
      fetchedAt={diffFetchedAt}
      repoContext={diffRepoContext}
      onClose={handleClose}
    />
  );
}

interface DiffPanelContentProps {
  diffDelta: DiffDelta;
  fetchedAt: string | null;
  repoContext: { repo: string; branch: string } | null;
  onClose: () => void;
}

function DiffPanelContent({ diffDelta, fetchedAt, repoContext, onClose }: DiffPanelContentProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    plates: false,
    blocks: false,
    connections: false,
    externalActors: false,
  });
  const [expandedModified, setExpandedModified] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const addActivity = useUIStore((s) => s.addActivity);

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModifiedDetails = (key: string) => {
    setExpandedModified((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Collect entity IDs that have validation warnings (#859, #860)
  const warningEntityIds = new Set<string>();
  if (validationResult && !validationResult.valid) {
    for (const err of validationResult.errors) {
      if (err.targetId) warningEntityIds.add(err.targetId);
    }
  }

  const entities: Array<DiffDelta[SectionKey]> = [
    diffDelta.plates,
    diffDelta.blocks,
    diffDelta.connections,
    diffDelta.externalActors,
  ];
  const summaryCounts = entities.reduce(
    (acc, section) => ({
      added: acc.added + section.added.length,
      modified: acc.modified + section.modified.length,
      removed: acc.removed + section.removed.length,
    }),
    { added: 0, modified: 0, removed: 0 },
  );

  // #853: Refresh action
  const handleRefresh = async () => {
    const backendWorkspaceId = useArchitectureStore.getState().workspace.backendWorkspaceId;
    if (!backendWorkspaceId) {
      toast.error('Workspace must be linked to backend.');
      return;
    }
    setRefreshing(true);
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pull`,
      );
      validateArchitectureShape(response.architecture);
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const localArch = useArchitectureStore.getState().workspace.architecture;
      const delta = computeArchitectureDiff(remoteArch, localArch);
      const repo = useArchitectureStore.getState().workspace.githubRepo;
      useUIStore.getState().setDiffMode(true, delta, remoteArch, new Date().toISOString(), repo ? { repo, branch: 'main' } : null);
      toast.success('Compare refreshed');
      addActivity('compare-refresh', 'Refreshed GitHub compare');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to refresh compare'));
    } finally {
      setRefreshing(false);
    }
  };

  // #875: Copy diff summary
  const handleCopyDiff = () => {
    const text = buildDiffText(diffDelta);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast.success('Diff summary copied'),
        () => toast.error('Failed to copy'),
      );
    }
  };

  // #875: Export diff summary as file
  const handleExportDiff = () => {
    const text = buildDiffText(diffDelta);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture-diff.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // GitHub context links (#863)
  const repoUrl = repoContext ? `https://github.com/${repoContext.repo}` : null;
  const branchUrl = repoContext ? `https://github.com/${repoContext.repo}/tree/${repoContext.branch}` : null;

  return (
    <div className="diff-panel">
      <div className="diff-panel-header">
        <h3 className="diff-panel-title">Architecture Diff</h3>
        <div className="diff-panel-header-actions">
          <button type="button" className="diff-panel-action-btn" onClick={() => void handleRefresh()} disabled={refreshing} title="Refresh compare">
            {refreshing ? '...' : 'Refresh'}
          </button>
          <button type="button" className="diff-panel-close" onClick={onClose} aria-label="Close architecture diff panel">
            ✕
          </button>
        </div>
      </div>

      {/* Repo/branch context with direct links (#863) */}
      {repoContext && (
        <div className="diff-panel-context">
          {repoUrl && (
            <a className="diff-panel-context-link" href={repoUrl} target="_blank" rel="noopener noreferrer">
              {repoContext.repo}
            </a>
          )}
          {branchUrl && (
            <>
              {' / '}
              <a className="diff-panel-context-link" href={branchUrl} target="_blank" rel="noopener noreferrer">
                {repoContext.branch}
              </a>
            </>
          )}
        </div>
      )}

      {/* Freshness timestamp (#852) */}
      {fetchedAt && (
        <div className="diff-panel-freshness">
          Fetched: {new Date(fetchedAt).toLocaleString()}
        </div>
      )}

      <div className="diff-summary-bar">
        <span className="diff-badge diff-badge-added">+{summaryCounts.added} added</span>
        <span className="diff-badge diff-badge-modified">~{summaryCounts.modified} modified</span>
        <span className="diff-badge diff-badge-removed">-{summaryCounts.removed} removed</span>
      </div>

      {/* Copy/Export actions (#875) */}
      <div className="diff-panel-export-actions">
        <button type="button" className="diff-panel-action-btn" onClick={handleCopyDiff}>
          Copy Summary
        </button>
        <button type="button" className="diff-panel-action-btn" onClick={handleExportDiff}>
          Export
        </button>
      </div>

      {diffDelta.summary.hasBreakingChanges && (
        <div className="diff-breaking-warning">Breaking changes detected. Review removed or modified entities carefully.</div>
      )}

      {/* Validation warnings toggle (#859) */}
      {warningEntityIds.size > 0 && (
        <div className="diff-validation-warning">
          <button type="button" className="diff-validation-toggle" onClick={() => setShowWarnings((v) => !v)}>
            {warningEntityIds.size} entity warning(s) overlap with diff changes {showWarnings ? '(hide)' : '(show)'}
          </button>
          {showWarnings && validationResult && (
            <div className="diff-validation-list">
              {validationResult.errors.filter((e) => e.targetId && warningEntityIds.has(e.targetId)).map((e, i) => (
                <div key={i} className="diff-validation-item">{e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {diffDelta.summary.totalChanges === 0 ? (
        <div className="diff-no-changes">No changes</div>
      ) : (
        <div className="diff-sections">
          {diffDelta.rootChanges.length > 0 && (
            <section className="diff-entity-section">
              <div className="diff-entity-header diff-entity-header-static">
                <span>Metadata</span>
                <span>{diffDelta.rootChanges.length}</span>
              </div>
              <div className="diff-entity-items">
                {diffDelta.rootChanges.map((change) => (
                  <div key={change.path} className="diff-property-change-row">
                    <span className="diff-property-path">{change.path}</span>
                    <span className="diff-property-arrow">: {formatValue(change.oldValue)} -&gt; {formatValue(change.newValue)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {SECTION_CONFIG.map(({ key, label }) => {
            const section = diffDelta[key];
            const sectionTotal = section.added.length + section.modified.length + section.removed.length;
            const isCollapsed = collapsedSections[key];

            return (
              <section key={key} className="diff-entity-section">
                <button
                  type="button"
                  className="diff-entity-header"
                  onClick={() => toggleSection(key)}
                  aria-expanded={!isCollapsed}
                >
                  <span>{label}</span>
                  <span>{isCollapsed ? '>' : 'v'} {sectionTotal}</span>
                </button>

                {!isCollapsed && (
                  <div className="diff-entity-items">
                    {section.added.map((entity) => (
                      <div key={`added-${entity.id}`} className="diff-item diff-item-added">
                        + {getEntityLabel(entity)}
                        {/* #860: badge entities with warnings */}
                        {warningEntityIds.has(entity.id) && <span className="diff-entity-warning-badge" title="Has validation warnings">!</span>}
                      </div>
                    ))}

                    {section.removed.map((entity) => (
                      <div key={`removed-${entity.id}`} className="diff-item diff-item-removed">
                        - {getEntityLabel(entity)}
                        {warningEntityIds.has(entity.id) && <span className="diff-entity-warning-badge" title="Has validation warnings">!</span>}
                      </div>
                    ))}

                    {section.modified.map((entity) => {
                      const modifiedKey = `${key}-${entity.id}`;
                      const isExpanded = expandedModified[modifiedKey] ?? false;

                      return (
                        <div key={`modified-${entity.id}`} className="diff-item diff-item-modified">
                          <button
                            type="button"
                            className="diff-modified-toggle"
                            onClick={() => toggleModifiedDetails(modifiedKey)}
                            aria-expanded={isExpanded}
                          >
                            ~ {getEntityLabel(entity.after)} ({entity.changes.length} changes)
                            {warningEntityIds.has(entity.id) && <span className="diff-entity-warning-badge" title="Has validation warnings">!</span>}
                          </button>
                          {isExpanded && (
                            <div className="diff-property-changes">
                              {entity.changes.map((change) => (
                                <div key={`${entity.id}-${change.path}`} className="diff-property-change-row">
                                  <span className="diff-property-path">{change.path}</span>
                                  <span className="diff-property-arrow">: {formatValue(change.oldValue)} -&gt; {formatValue(change.newValue)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {sectionTotal === 0 && <div className="diff-empty-entity">No changes in {label.toLowerCase()}.</div>}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
