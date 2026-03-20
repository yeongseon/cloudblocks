import { useState } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import type { DiffDelta } from '../../shared/types/diff';
import type { Block, Connection } from '../../shared/types/index';
import './DiffPanel.css';

type SectionKey = 'plates' | 'blocks' | 'connections' | 'externalActors';

const SECTION_CONFIG: Array<{ key: SectionKey; label: string }> = [
  { key: 'plates', label: 'Plates' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'connections', label: 'Connections' },
  { key: 'externalActors', label: 'External Actors' },
];

/** Provider badge color map. */
const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078D4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

/** Map well-known subtype ids to human-readable names (#801). */
const SUBTYPE_DISPLAY_NAMES: Record<string, string> = {
  vm: 'Virtual Machine',
  'container-instances': 'Container Instances',
  functions: 'Azure Functions',
  'sql-database': 'SQL Database',
  'cosmos-db': 'Cosmos DB',
  'blob-storage': 'Blob Storage',
  'app-gateway': 'Application Gateway',
  'api-management': 'API Management',
  lambda: 'AWS Lambda',
  'ecs-fargate': 'ECS Fargate',
  ec2: 'EC2 Instance',
  'rds-postgres': 'RDS PostgreSQL',
  'rds-mysql': 'RDS MySQL',
  dynamodb: 'DynamoDB',
  s3: 'S3 Bucket',
  'cloud-run': 'Cloud Run',
  'cloud-functions': 'Cloud Functions',
  'gke-autopilot': 'GKE Autopilot',
  'cloud-sql': 'Cloud SQL',
  firestore: 'Firestore',
  'cloud-storage': 'Cloud Storage',
  'service-bus': 'Service Bus',
  'event-grid': 'Event Grid',
  sqs: 'Amazon SQS',
  sns: 'Amazon SNS',
  'pub-sub': 'Pub/Sub',
};

function getSubtypeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return String(raw ?? '');
  return SUBTYPE_DISPLAY_NAMES[raw] ?? raw;
}

function formatValue(value: unknown, path?: string): string {
  if (path === 'subtype' || path === 'provider') {
    if (path === 'subtype') return getSubtypeDisplayName(value);
    if (typeof value === 'string') return value.charAt(0).toUpperCase() + value.slice(1);
  }
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

function hasProvider(entity: { id: string }): entity is { id: string; provider?: string; subtype?: string } {
  return 'provider' in entity || 'subtype' in entity;
}

/** Build a label that includes provider and subtype context (#796). */
function getEntityLabel(entity: { id: string }): string {
  const base = hasName(entity)
    ? `${entity.name} (${entity.id})`
    : hasEndpoints(entity)
      ? `${entity.id} (${entity.sourceId} -> ${entity.targetId})`
      : entity.id;

  if (hasProvider(entity)) {
    const parts: string[] = [];
    if ((entity as { provider?: string }).provider) {
      parts.push((entity as { provider: string }).provider.toUpperCase());
    }
    if ((entity as { subtype?: string }).subtype) {
      parts.push(getSubtypeDisplayName((entity as { subtype: string }).subtype));
    }
    if (parts.length > 0) {
      return `${base} [${parts.join(' / ')}]`;
    }
  }
  return base;
}

/** Get provider string from a block-like entity. */
function getBlockProvider(entity: { id: string }): string | undefined {
  return hasProvider(entity) ? (entity as { provider?: string }).provider : undefined;
}

/** Render a tiny provider badge (#813). */
function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;
  const color = PROVIDER_COLORS[provider] ?? '#888';
  return (
    <span className="diff-provider-badge" style={{ borderColor: color, color }} title={provider}>
      {provider.toUpperCase()}
    </span>
  );
}

/** Check if a connection crosses provider boundaries (#817). */
function isCrossProviderConnection(
  conn: Connection,
  blockMap: Map<string, Block>,
): boolean {
  const sourceBlock = blockMap.get(conn.sourceId);
  const targetBlock = blockMap.get(conn.targetId);
  if (!sourceBlock?.provider || !targetBlock?.provider) return false;
  return sourceBlock.provider !== targetBlock.provider;
}

export function DiffPanel() {
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta = useUIStore((s) => s.diffDelta);
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
            x
          </button>
        </div>
        <div className="diff-no-changes">No diff data available.</div>
      </div>
    );
  }

  return <DiffPanelContent key={generation} diffDelta={diffDelta} onClose={handleClose} />;
}

function DiffPanelContent({ diffDelta, onClose }: { diffDelta: DiffDelta; onClose: () => void }) {
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    plates: false,
    blocks: false,
    connections: false,
    externalActors: false,
  });
  const [expandedModified, setExpandedModified] = useState<Record<string, boolean>>({});
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

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

  // Provider mix summary (#803)
  const localProviders = diffDelta.summary.localProviders ?? [];
  const baseProviders = diffDelta.summary.baseProviders ?? [];
  const allProviders = Array.from(new Set([...localProviders, ...baseProviders])).sort();
  const providerMixChanged = JSON.stringify(localProviders) !== JSON.stringify(baseProviders);

  // Build block map for cross-provider connection detection (#817)
  const blockMap = new Map<string, Block>();
  for (const b of diffDelta.blocks.added) blockMap.set(b.id, b);
  for (const b of diffDelta.blocks.removed) blockMap.set(b.id, b);
  for (const m of diffDelta.blocks.modified) {
    blockMap.set(m.after.id, m.after);
    blockMap.set(m.before.id, m.before);
  }

  // Cross-provider connection changes (#817)
  const crossProviderAdded = diffDelta.connections.added.filter((c) =>
    isCrossProviderConnection(c as unknown as Connection, blockMap),
  );
  const crossProviderRemoved = diffDelta.connections.removed.filter((c) =>
    isCrossProviderConnection(c as unknown as Connection, blockMap),
  );

  /** Filter entity by provider when filter active (#812). */
  const matchesProviderFilter = (entity: { id: string }): boolean => {
    if (!providerFilter) return true;
    const p = getBlockProvider(entity);
    return p === providerFilter;
  };

  // Actions to continue into sync or PR (#825)
  const handleOpenSync = () => {
    const ui = useUIStore.getState();
    if (!ui.showGitHubSync) ui.toggleGitHubSync();
  };
  const handleOpenPR = () => {
    const ui = useUIStore.getState();
    if (!ui.showGitHubPR) ui.toggleGitHubPR();
  };

  return (
    <div className="diff-panel">
      <div className="diff-panel-header">
        <h3 className="diff-panel-title">Architecture Diff</h3>
        <button type="button" className="diff-panel-close" onClick={onClose} aria-label="Close architecture diff panel">
          x
        </button>
      </div>

      <div className="diff-summary-bar">
        <span className="diff-badge diff-badge-added">+{summaryCounts.added} added</span>
        <span className="diff-badge diff-badge-modified">~{summaryCounts.modified} modified</span>
        <span className="diff-badge diff-badge-removed">-{summaryCounts.removed} removed</span>
      </div>

      {/* Provider mix summary (#803) */}
      {allProviders.length > 0 && (
        <div className="diff-provider-summary">
          <span className="diff-provider-summary-label">Providers:</span>
          <span className="diff-provider-summary-local">
            Local: {localProviders.length > 0 ? localProviders.map((p) => p.toUpperCase()).join(', ') : 'none'}
          </span>
          <span className="diff-provider-summary-base">
            GitHub: {baseProviders.length > 0 ? baseProviders.map((p) => p.toUpperCase()).join(', ') : 'none'}
          </span>
        </div>
      )}

      {/* Provider-mix drift warning (#803) */}
      {providerMixChanged && (
        <div className="diff-breaking-warning">
          Provider composition changed between local and GitHub. Review provider drift carefully.
        </div>
      )}

      {diffDelta.summary.hasBreakingChanges && !providerMixChanged && (
        <div className="diff-breaking-warning">Breaking changes detected. Review removed or modified entities carefully.</div>
      )}

      {/* Cross-provider connection warnings (#817) */}
      {(crossProviderAdded.length > 0 || crossProviderRemoved.length > 0) && (
        <div className="diff-breaking-warning">
          Cross-provider connections changed: {crossProviderAdded.length} added, {crossProviderRemoved.length} removed.
        </div>
      )}

      {/* Provider filter chips (#812) */}
      {allProviders.length > 1 && (
        <div className="diff-provider-filter">
          <button
            type="button"
            className={`diff-filter-chip ${providerFilter === null ? 'diff-filter-chip-active' : ''}`}
            onClick={() => setProviderFilter(null)}
          >
            All
          </button>
          {allProviders.map((p) => (
            <button
              key={p}
              type="button"
              className={`diff-filter-chip ${providerFilter === p ? 'diff-filter-chip-active' : ''}`}
              style={providerFilter === p ? { borderColor: PROVIDER_COLORS[p] ?? '#888' } : undefined}
              onClick={() => setProviderFilter(providerFilter === p ? null : p)}
            >
              {p.toUpperCase()}
            </button>
          ))}
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
                    <span className="diff-property-arrow">: {formatValue(change.oldValue, change.path)} -&gt; {formatValue(change.newValue, change.path)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {SECTION_CONFIG.map(({ key, label }) => {
            const section = diffDelta[key];
            const filteredAdded = section.added.filter(matchesProviderFilter);
            const filteredRemoved = section.removed.filter(matchesProviderFilter);
            const filteredModified = section.modified.filter((m) => matchesProviderFilter(m.after));
            const sectionTotal = filteredAdded.length + filteredModified.length + filteredRemoved.length;
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
                    {filteredAdded.map((entity) => (
                      <div key={`added-${entity.id}`} className="diff-item diff-item-added">
                        <ProviderBadge provider={getBlockProvider(entity)} />
                        + {getEntityLabel(entity)}
                      </div>
                    ))}

                    {filteredRemoved.map((entity) => (
                      <div key={`removed-${entity.id}`} className="diff-item diff-item-removed">
                        <ProviderBadge provider={getBlockProvider(entity)} />
                        - {getEntityLabel(entity)}
                      </div>
                    ))}

                    {filteredModified.map((entity) => {
                      const modifiedKey = `${key}-${entity.id}`;
                      const isExpanded = expandedModified[modifiedKey] ?? false;
                      // Highlight provider/subtype changes (#797)
                      const hasProviderChange = entity.changes.some((c) => c.path === 'provider' || c.path === 'subtype');

                      return (
                        <div key={`modified-${entity.id}`} className={`diff-item diff-item-modified ${hasProviderChange ? 'diff-item-provider-change' : ''}`}>
                          <button
                            type="button"
                            className="diff-modified-toggle"
                            onClick={() => toggleModifiedDetails(modifiedKey)}
                            aria-expanded={isExpanded}
                          >
                            <ProviderBadge provider={getBlockProvider(entity.after)} />
                            ~ {getEntityLabel(entity.after)} ({entity.changes.length} changes)
                            {hasProviderChange && <span className="diff-provider-drift-tag">PROVIDER DRIFT</span>}
                          </button>
                          {isExpanded && (
                            <div className="diff-property-changes">
                              {entity.changes.map((change) => (
                                <div key={`${entity.id}-${change.path}`} className={`diff-property-change-row ${change.path === 'provider' || change.path === 'subtype' ? 'diff-property-breaking' : ''}`}>
                                  <span className="diff-property-path">{change.path}</span>
                                  <span className="diff-property-arrow">: {formatValue(change.oldValue, change.path)} -&gt; {formatValue(change.newValue, change.path)}</span>
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

      {/* Next-step actions (#825) */}
      <div className="diff-panel-actions">
        <button type="button" className="diff-action-btn" onClick={handleOpenSync}>
          Sync to GitHub
        </button>
        <button type="button" className="diff-action-btn" onClick={handleOpenPR}>
          Create PR
        </button>
      </div>
    </div>
  );
}
