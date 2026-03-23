import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import type { DiffDelta } from '../../shared/types/diff';
import './DiffPanel.css';

function summarizeArchitecture(arch: ArchitectureModel) {
  const plates = arch.nodes.filter((node) => node.kind === 'container').length;
  const blocks = arch.nodes.filter((node) => node.kind === 'resource').length;
  return {
    plates,
    blocks,
    connections: arch.connections.length,
    externalActors: arch.externalActors?.length ?? 0,
  };
}

type SectionKey = 'plates' | 'blocks' | 'connections' | 'externalActors';

const SECTION_CONFIG: Array<{ key: SectionKey; label: string }> = [
  { key: 'plates', label: 'Containers' },
  { key: 'blocks', label: 'Nodes' },
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

function hasV3Endpoints(entity: {
  id: string;
}): entity is { id: string; sourceId: string; targetId: string } {
  return (
    'sourceId' in entity &&
    'targetId' in entity &&
    typeof (entity as { sourceId?: unknown }).sourceId === 'string' &&
    typeof (entity as { targetId?: unknown }).targetId === 'string'
  );
}

function hasV4Endpoints(entity: {
  id: string;
}): entity is { id: string; from: string; to: string } {
  return (
    'from' in entity &&
    'to' in entity &&
    typeof (entity as { from?: unknown }).from === 'string' &&
    typeof (entity as { to?: unknown }).to === 'string'
  );
}

function getEntityLabel(entity: { id: string }): string {
  if (hasName(entity)) return `${entity.name} (${entity.id})`;
  if (hasV4Endpoints(entity)) {
    const fromNode = parseEndpointId(entity.from)?.nodeId ?? entity.from;
    const toNode = parseEndpointId(entity.to)?.nodeId ?? entity.to;
    return `${entity.id} (${fromNode} -> ${toNode})`;
  }
  if (hasV3Endpoints(entity)) return `${entity.id} (${entity.sourceId} -> ${entity.targetId})`;
  return entity.id;
}

export function DiffPanel() {
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const diffBaseArchitecture = useUIStore((s) => s.diffBaseArchitecture);
  const workspaceName = useArchitectureStore((s) => s.workspace.name);
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
          <h3 className="diff-panel-title">🔍 Architecture Diff</h3>
          <button
            type="button"
            className="diff-panel-close"
            onClick={handleClose}
            aria-label="Close architecture diff panel"
          >
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
      diffBaseArchitecture={diffBaseArchitecture}
      workspaceName={workspaceName}
      onClose={handleClose}
    />
  );
}

export function DiffPanelContent({
  diffDelta,
  diffBaseArchitecture,
  workspaceName,
  onClose,
  showHeader = true,
}: {
  diffDelta: DiffDelta;
  diffBaseArchitecture: ArchitectureModel | null;
  workspaceName: string;
  onClose: () => void;
  showHeader?: boolean;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    plates: false,
    blocks: false,
    connections: false,
    externalActors: false,
  });
  const [expandedModified, setExpandedModified] = useState<Record<string, boolean>>({});

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModifiedDetails = (key: string) => {
    setExpandedModified((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  return (
    <div className="diff-panel">
      {showHeader && (
        <div className="diff-panel-header">
          <h3 className="diff-panel-title">🔍 Architecture Diff</h3>
          <button
            type="button"
            className="diff-panel-close"
            onClick={onClose}
            aria-label="Close architecture diff panel"
          >
            ✕
          </button>
        </div>
      )}

      <div className="diff-panel-context">Comparing: {workspaceName}</div>

      {diffBaseArchitecture &&
        (() => {
          const s = summarizeArchitecture(diffBaseArchitecture);
          return (
            <div className="diff-panel-remote-summary">
              Remote: {s.plates} containers · {s.blocks} nodes · {s.connections} connections ·{' '}
              {s.externalActors} actors
            </div>
          );
        })()}

      <div className="diff-summary-bar">
        <span className="diff-badge diff-badge-added">+{summaryCounts.added} added</span>
        <span className="diff-badge diff-badge-modified">~{summaryCounts.modified} modified</span>
        <span className="diff-badge diff-badge-removed">-{summaryCounts.removed} removed</span>
      </div>

      {diffDelta.summary.hasBreakingChanges && (
        <div className="diff-breaking-warning">
          Breaking changes detected. Review removed or modified entities carefully.
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
                    <span className="diff-property-arrow">
                      : {formatValue(change.oldValue)} -&gt; {formatValue(change.newValue)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {SECTION_CONFIG.map(({ key, label }) => {
            const section = diffDelta[key];
            const sectionTotal =
              section.added.length + section.modified.length + section.removed.length;
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
                  <span>
                    {isCollapsed ? '▸' : '▾'} {sectionTotal}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="diff-entity-items">
                    {section.added.map((entity) => (
                      <div key={`added-${entity.id}`} className="diff-item diff-item-added">
                        + {getEntityLabel(entity)}
                      </div>
                    ))}

                    {section.removed.map((entity) => (
                      <div key={`removed-${entity.id}`} className="diff-item diff-item-removed">
                        - {getEntityLabel(entity)}
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
                          </button>
                          {isExpanded && (
                            <div className="diff-property-changes">
                              {entity.changes.map((change) => (
                                <div
                                  key={`${entity.id}-${change.path}`}
                                  className="diff-property-change-row"
                                >
                                  <span className="diff-property-path">{change.path}</span>
                                  <span className="diff-property-arrow">
                                    : {formatValue(change.oldValue)} -&gt;{' '}
                                    {formatValue(change.newValue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {sectionTotal === 0 && (
                      <div className="diff-empty-entity">No changes in {label.toLowerCase()}.</div>
                    )}
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
