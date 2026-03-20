import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { DiffDelta, DiffDirection } from '../../shared/types/diff';
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

/** Build a name-lookup map for resolving connection endpoint ids to human-readable names. */
function buildNameMap(delta: DiffDelta): Map<string, string> {
  const map = new Map<string, string>();
  const sections: SectionKey[] = ['plates', 'blocks', 'externalActors'];
  for (const key of sections) {
    const section = delta[key];
    for (const entity of section.added) {
      if (hasName(entity)) map.set(entity.id, entity.name);
    }
    for (const entity of section.removed) {
      if (hasName(entity)) map.set(entity.id, entity.name);
    }
    for (const entity of section.modified) {
      if (hasName(entity.after)) map.set(entity.id, entity.after.name);
    }
  }
  return map;
}

function getEntityLabel(entity: { id: string }, nameMap?: Map<string, string>): string {
  if (hasName(entity)) return `${entity.name} (${entity.id})`;
  if (hasEndpoints(entity)) {
    const sourceName = nameMap?.get(entity.sourceId) ?? entity.sourceId;
    const targetName = nameMap?.get(entity.targetId) ?? entity.targetId;
    return `${entity.id} (${sourceName} -> ${targetName})`;
  }
  return entity.id;
}

function directionLabels(direction: DiffDirection): { base: string; head: string } {
  if (direction === 'github-to-local') {
    return { base: 'GitHub', head: 'Local' };
  }
  return { base: 'Base', head: 'Head' };
}

export function DiffPanel() {
  const diffMode = useUIStore((s) => s.diffMode);
  const diffPanelVisible = useUIStore((s) => s.diffPanelVisible);
  const diffDelta = useUIStore((s) => s.diffDelta);
  const [trackedDelta, setTrackedDelta] = useState(diffDelta);
  const [trackedMode, setTrackedMode] = useState(diffMode);
  const [generation, setGeneration] = useState(0);

  if (trackedDelta !== diffDelta || trackedMode !== diffMode) {
    setTrackedDelta(diffDelta);
    setTrackedMode(diffMode);
    setGeneration((g) => g + 1);
  }

  if (!diffMode || !diffPanelVisible) return null;

  const handleClose = () => {
    useUIStore.getState().setDiffPanelVisible(false);
  };

  const handleDiscard = () => {
    useUIStore.getState().clearDiffState();
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

  return <DiffPanelContent key={generation} diffDelta={diffDelta} onClose={handleClose} onDiscard={handleDiscard} />;
}

function DiffPanelContent({ diffDelta, onClose, onDiscard }: { diffDelta: DiffDelta; onClose: () => void; onDiscard: () => void }) {
  const diffSourceContext = useUIStore((s) => s.diffSourceContext);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
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

  /** Try to select an entity on the canvas if it exists in the current architecture. */
  const handleSelectEntity = (entityId: string) => {
    const allIds = [
      ...architecture.plates.map((p) => p.id),
      ...architecture.blocks.map((b) => b.id),
      ...architecture.connections.map((c) => c.id),
      ...architecture.externalActors.map((e) => e.id),
    ];
    if (allIds.includes(entityId)) {
      setSelectedId(entityId);
    }
  };

  const nameMap = buildNameMap(diffDelta);

  // Also populate nameMap from current architecture for connection endpoint resolution
  for (const plate of architecture.plates) {
    if (!nameMap.has(plate.id)) nameMap.set(plate.id, plate.name);
  }
  for (const block of architecture.blocks) {
    if (!nameMap.has(block.id)) nameMap.set(block.id, block.name);
  }
  for (const actor of architecture.externalActors) {
    if (!nameMap.has(actor.id)) nameMap.set(actor.id, actor.name);
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

  const isGitHub = diffDelta.direction === 'github-to-local';
  const labels = directionLabels(diffDelta.direction);

  return (
    <div className="diff-panel">
      <div className="diff-panel-header">
        <h3 className="diff-panel-title">Architecture Diff</h3>
        <div className="diff-panel-header-actions">
          <button type="button" className="diff-panel-discard" onClick={onDiscard} title="Discard diff session">
            Discard
          </button>
          <button type="button" className="diff-panel-close" onClick={onClose} aria-label="Close architecture diff panel">
            ✕
          </button>
        </div>
      </div>

      {isGitHub && (
        <div className="diff-direction-legend">
          Comparing: {labels.base} → {labels.head}
          {diffSourceContext && (
            <div className="diff-source-context">
              {diffSourceContext.repo} @ {diffSourceContext.branch}
              {diffSourceContext.commitSha && ` (${diffSourceContext.commitSha.slice(0, 7)})`}
            </div>
          )}
        </div>
      )}

      <div className="diff-summary-bar">
        <span className="diff-badge diff-badge-added">+{summaryCounts.added} added</span>
        <span className="diff-badge diff-badge-modified">~{summaryCounts.modified} modified</span>
        <span className="diff-badge diff-badge-removed">-{summaryCounts.removed} removed</span>
      </div>

      {diffDelta.summary.hasBreakingChanges && (
        <div className="diff-breaking-warning">Breaking changes detected. Review removed or modified entities carefully.</div>
      )}

      {diffDelta.summary.totalChanges === 0 ? (
        <div className="diff-no-changes">No changes</div>
      ) : (
        <div className="diff-sections">
          {diffDelta.metadata.length > 0 && (
            <section className="diff-entity-section">
              <div className="diff-entity-header diff-entity-header-static">
                <span>Metadata</span>
                <span>{diffDelta.metadata.length}</span>
              </div>
              <div className="diff-entity-items">
                {diffDelta.metadata.map((change) => (
                  <div key={change.path} className="diff-property-change-row">
                    <span className="diff-property-path">{change.path}</span>
                    <span className="diff-property-arrow">
                      : <span className="diff-value-label">{labels.base}:</span> {formatValue(change.oldValue)} → <span className="diff-value-label">{labels.head}:</span> {formatValue(change.newValue)}
                    </span>
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
                  <span>{isCollapsed ? '▸' : '▾'} {sectionTotal}</span>
                </button>

                {!isCollapsed && (
                  <div className="diff-entity-items">
                    {section.added.map((entity) => (
                      <div
                        key={`added-${entity.id}`}
                        className="diff-item diff-item-added diff-item-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectEntity(entity.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectEntity(entity.id); }}
                      >
                        + {getEntityLabel(entity, nameMap)}
                      </div>
                    ))}

                    {section.removed.map((entity) => (
                      <div
                        key={`removed-${entity.id}`}
                        className="diff-item diff-item-removed diff-item-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectEntity(entity.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectEntity(entity.id); }}
                      >
                        - {getEntityLabel(entity, nameMap)}
                      </div>
                    ))}

                    {section.modified.map((entity) => {
                      const modifiedKey = `${key}-${entity.id}`;
                      const isExpanded = expandedModified[modifiedKey] ?? false;

                      // Detect renames: show both old and new label if name changed (#757)
                      const beforeLabel = hasName(entity.before) ? entity.before.name : entity.id;
                      const afterLabel = hasName(entity.after) ? entity.after.name : entity.id;
                      const renamed = beforeLabel !== afterLabel;
                      const displayLabel = renamed
                        ? `${beforeLabel} → ${afterLabel} (${entity.id})`
                        : getEntityLabel(entity.after, nameMap);

                      return (
                        <div key={`modified-${entity.id}`} className="diff-item diff-item-modified">
                          <button
                            type="button"
                            className="diff-modified-toggle"
                            onClick={() => {
                              toggleModifiedDetails(modifiedKey);
                              handleSelectEntity(entity.id);
                            }}
                            aria-expanded={isExpanded}
                          >
                            ~ {displayLabel} ({entity.changes.length} changes)
                          </button>
                          {isExpanded && (
                            <div className="diff-property-changes">
                              {entity.changes.map((change) => (
                                <div key={`${entity.id}-${change.path}`} className="diff-property-change-row">
                                  <span className="diff-property-path">{change.path}</span>
                                  <span className="diff-property-arrow">
                                    : <span className="diff-value-label">{labels.base}:</span> {formatValue(change.oldValue)} → <span className="diff-value-label">{labels.head}:</span> {formatValue(change.newValue)}
                                  </span>
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
