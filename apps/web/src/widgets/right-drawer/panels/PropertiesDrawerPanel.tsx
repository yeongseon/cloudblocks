import { useCallback, useMemo, useState } from 'react';
import type { Block, Connection, ContainerBlock } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { useUIStore } from '../../../entities/store/uiStore';
import { audioService } from '../../../shared/utils/audioService';
import { BLOCK_FRIENDLY_NAMES } from '../../../shared/types';
import './PropertiesDrawerPanel.css';

// ── Main Panel ───────────────────────────────────────────────────────────
export function PropertiesDrawerPanel() {
  const selectedId = useUIStore((s) => s.selectedId);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  // Multi-select summary view
  if (selectedIds.size > 1) {
    return (
      <div className="props-panel" data-testid="props-multi-select">
        <section className="props-section">
          <h3 className="props-section-title">Multi-Selection</h3>
          <p className="props-hint">{selectedIds.size} items selected</p>
          <div className="props-field-group">
            <ReadOnlyField
              label="Nodes"
              value={String(
                [...selectedIds].filter((id) => architecture.nodes.some((n) => n.id === id)).length,
              )}
            />
            <ReadOnlyField
              label="Connections"
              value={String(
                [...selectedIds].filter((id) => architecture.connections.some((c) => c.id === id))
                  .length,
              )}
            />
          </div>
        </section>
        <p className="props-hint">Press Delete to remove all selected items.</p>
      </div>
    );
  }

  const selectedNode = selectedId
    ? (architecture.nodes.find((n) => n.id === selectedId) ?? null)
    : null;
  const selectedConnection = selectedId
    ? (architecture.connections.find((c) => c.id === selectedId) ?? null)
    : null;

  if (!selectedId) {
    return (
      <EmptyState
        nodeCount={architecture.nodes.length}
        connectionCount={architecture.connections.length}
      />
    );
  }

  if (selectedConnection) {
    return <ConnectionProperties key={selectedConnection.id} connection={selectedConnection} />;
  }

  if (selectedNode) {
    return <NodeProperties key={selectedNode.id} node={selectedNode} />;
  }

  return (
    <EmptyState
      nodeCount={architecture.nodes.length}
      connectionCount={architecture.connections.length}
    />
  );
}

// ── Empty State ──────────────────────────────────────────────────────────
function EmptyState({
  nodeCount,
  connectionCount,
}: {
  nodeCount: number;
  connectionCount: number;
}) {
  const architectureName = useArchitectureStore((s) => s.workspace.architecture.name);

  return (
    <div className="props-panel" data-testid="props-empty-state">
      <section className="props-section">
        <h3 className="props-section-title">Workspace</h3>
        <div className="props-field-group">
          <ReadOnlyField label="Name" value={architectureName} />
          <ReadOnlyField label="Nodes" value={String(nodeCount)} />
          <ReadOnlyField label="Connections" value={String(connectionCount)} />
        </div>
      </section>
      <p className="props-hint">Select a node or connection to edit its properties.</p>
    </div>
  );
}

// ── Node Properties ──────────────────────────────────────────────────────
function NodeProperties({ node }: { node: Block }) {
  const renameNode = useArchitectureStore((s) => s.renameNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const duplicateBlock = useArchitectureStore((s) => s.duplicateBlock);
  const updateNodeMetadata = useArchitectureStore((s) => s.updateNodeMetadata);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const connections = architecture.connections;

  const [confirmDelete, setConfirmDelete] = useState(false);

  const parentNode = node.parentId
    ? (architecture.nodes.find((n) => n.id === node.parentId) ?? null)
    : null;

  // Related connections
  const relatedConnections = useMemo(() => {
    return connections.filter((c) => {
      const fromParsed = parseEndpointId(c.from);
      const toParsed = parseEndpointId(c.to);
      return fromParsed?.blockId === node.id || toParsed?.blockId === node.id;
    });
  }, [connections, node.id]);

  const handleRename = useCallback(
    (name: string) => {
      renameNode(node.id, name);
    },
    [renameNode, node.id],
  );

  const handleUpdateNotes = useCallback(
    (notes: string) => {
      updateNodeMetadata(node.id, 'notes', notes);
    },
    [updateNodeMetadata, node.id],
  );

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeNode(node.id);
    setSelectedId(null);
    closeDrawer();
    if (!isSoundMuted) audioService.playSound('delete');
  }, [confirmDelete, removeNode, node.id, setSelectedId, closeDrawer, isSoundMuted]);

  const handleDuplicate = useCallback(() => {
    if (node.kind === 'resource') {
      duplicateBlock(node.id);
      if (!isSoundMuted) audioService.playSound('block-snap');
    }
  }, [duplicateBlock, node.id, node.kind, isSoundMuted]);

  const categoryName = BLOCK_FRIENDLY_NAMES[node.category] ?? node.category;
  const layerLabel = node.layer.charAt(0).toUpperCase() + node.layer.slice(1);

  return (
    <div className="props-panel" data-testid="props-node">
      {/* Identity Section */}
      <section className="props-section">
        <h3 className="props-section-title">Identity</h3>
        <div className="props-field-group">
          <EditableField
            key={`name-${node.id}`}
            label="Name"
            value={node.name}
            onSave={handleRename}
            testId="props-name-input"
          />
          <EditableTextArea
            key={`notes-${node.id}`}
            label="Notes"
            value={(node.metadata?.notes as string) ?? ''}
            placeholder="Add notes..."
            onSave={handleUpdateNotes}
            testId="props-notes-input"
          />
        </div>
      </section>

      {/* Configuration Section */}
      <section className="props-section">
        <h3 className="props-section-title">Configuration</h3>
        <div className="props-field-group">
          <ReadOnlyField label="Type" value={node.resourceType} />
          <ReadOnlyField label="Category" value={categoryName} />
          <ReadOnlyField label="Layer" value={layerLabel} />
          <ReadOnlyField label="Provider" value={node.provider.toUpperCase()} />
          {node.subtype && <ReadOnlyField label="Subtype" value={node.subtype} />}
          {parentNode && <ReadOnlyField label="Parent" value={parentNode.name} />}
        </div>
      </section>

      {/* Position Section */}
      <section className="props-section">
        <h3 className="props-section-title">Position</h3>
        <div className="props-field-group">
          <ReadOnlyField label="X" value={String(node.position.x)} />
          <ReadOnlyField label="Z" value={String(node.position.z)} />
          {node.kind === 'container' && (
            <>
              <ReadOnlyField label="Width" value={String((node as ContainerBlock).frame.width)} />
              <ReadOnlyField label="Depth" value={String((node as ContainerBlock).frame.depth)} />
            </>
          )}
        </div>
      </section>

      {/* Connections Section */}
      {relatedConnections.length > 0 && (
        <section className="props-section">
          <h3 className="props-section-title">Connections ({relatedConnections.length})</h3>
          <div className="props-connection-list">
            {relatedConnections.map((conn) => (
              <ConnectionSummaryItem key={conn.id} connection={conn} currentNodeId={node.id} />
            ))}
          </div>
        </section>
      )}

      {/* Actions Section */}
      <section className="props-section">
        <h3 className="props-section-title">Actions</h3>
        <div className="props-actions">
          {node.kind === 'resource' && (
            <button
              type="button"
              className="props-action-btn"
              onClick={handleDuplicate}
              data-testid="props-duplicate-btn"
            >
              Duplicate
            </button>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="props-section props-danger-zone" data-testid="props-danger-zone">
        <h3 className="props-section-title props-danger-title">Danger Zone</h3>
        <button
          type="button"
          className={`props-danger-btn ${confirmDelete ? 'props-danger-btn--confirm' : ''}`}
          onClick={handleDelete}
          data-testid="props-delete-btn"
        >
          {confirmDelete ? 'Click again to confirm delete' : 'Delete'}
        </button>
      </section>
    </div>
  );
}

// ── Connection Properties ────────────────────────────────────────────────
function ConnectionProperties({ connection }: { connection: Connection }) {
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const fromParsed = parseEndpointId(connection.from);
  const toParsed = parseEndpointId(connection.to);
  const sourceNode = fromParsed
    ? (architecture.nodes.find((n) => n.id === fromParsed.blockId) ?? null)
    : null;
  const targetNode = toParsed
    ? (architecture.nodes.find((n) => n.id === toParsed.blockId) ?? null)
    : null;

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeConnection(connection.id);
    setSelectedId(null);
    closeDrawer();
    if (!isSoundMuted) audioService.playSound('delete');
  }, [confirmDelete, removeConnection, connection.id, setSelectedId, closeDrawer, isSoundMuted]);

  return (
    <div className="props-panel" data-testid="props-connection">
      <section className="props-section">
        <h3 className="props-section-title">Connection</h3>
        <div className="props-field-group">
          <ReadOnlyField
            label="From"
            value={sourceNode?.name ?? fromParsed?.blockId ?? 'Unknown'}
          />
          <ReadOnlyField label="To" value={targetNode?.name ?? toParsed?.blockId ?? 'Unknown'} />
          {fromParsed && <ReadOnlyField label="Semantic" value={fromParsed.semantic} />}
          {fromParsed && (
            <ReadOnlyField
              label="Direction"
              value={`${fromParsed.direction} → ${toParsed?.direction ?? '?'}`}
            />
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="props-section props-danger-zone" data-testid="props-danger-zone">
        <h3 className="props-section-title props-danger-title">Danger Zone</h3>
        <button
          type="button"
          className={`props-danger-btn ${confirmDelete ? 'props-danger-btn--confirm' : ''}`}
          onClick={handleDelete}
          data-testid="props-delete-btn"
        >
          {confirmDelete ? 'Click again to confirm delete' : 'Delete Connection'}
        </button>
      </section>
    </div>
  );
}

// ── Connection Summary Item ──────────────────────────────────────────────
function ConnectionSummaryItem({
  connection,
  currentNodeId,
}: {
  connection: Connection;
  currentNodeId: string;
}) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const setSelectedId = useUIStore((s) => s.setSelectedId);

  const fromParsed = parseEndpointId(connection.from);
  const toParsed = parseEndpointId(connection.to);

  const otherNodeId =
    fromParsed?.blockId === currentNodeId ? toParsed?.blockId : fromParsed?.blockId;
  const direction = fromParsed?.blockId === currentNodeId ? 'outbound' : 'inbound';
  const semantic = fromParsed?.semantic ?? '?';

  const otherNode = otherNodeId
    ? (architecture.nodes.find((n) => n.id === otherNodeId) ?? null)
    : null;

  return (
    <button
      type="button"
      className="props-connection-item"
      onClick={() => setSelectedId(connection.id)}
      data-testid="props-connection-item"
    >
      <span className="props-conn-direction" data-direction={direction}>
        {direction === 'outbound' ? '→' : '←'}
      </span>
      <span className="props-conn-name">{otherNode?.name ?? otherNodeId ?? 'External'}</span>
      <span className="props-conn-semantic">{semantic}</span>
    </button>
  );
}

// ── Field Components ─────────────────────────────────────────────────────
// key prop from parent resets state when value source changes (different node selected)
function EditableField({
  label,
  value,
  onSave,
  testId,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  testId?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const trimmed = localValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setLocalValue(value);
    }
  }, [localValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setLocalValue(value);
        (e.target as HTMLInputElement).blur();
      }
    },
    [value],
  );

  return (
    <div className="props-field">
      <label className="props-field-label">{label}</label>
      <input
        type="text"
        className="props-field-input"
        value={isFocused ? localValue : value}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(value);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-testid={testId}
      />
    </div>
  );
}

function EditableTextArea({
  label,
  value,
  placeholder,
  onSave,
  testId,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  testId?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  }, [localValue, value, onSave]);

  return (
    <div className="props-field">
      <label className="props-field-label">{label}</label>
      <textarea
        className="props-field-textarea"
        value={isFocused ? localValue : value}
        placeholder={placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(value);
        }}
        onBlur={handleBlur}
        rows={3}
        data-testid={testId}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="props-field">
      <span className="props-field-label">{label}</span>
      <span className="props-field-value">{value}</span>
    </div>
  );
}
