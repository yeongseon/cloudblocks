import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type {
  Connection,
  ConnectionType,
  ContainerBlock,
  ResourceBlock,
} from '@cloudblocks/schema';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import { promptDialog } from '../../shared/ui/PromptDialog';
import {
  BLOCK_FRIENDLY_NAMES,
  CONNECTION_TYPE_LABELS,
  resolveConnectionNodes,
} from '../../shared/types';
import {
  PLATE_ACTION_DEFINITIONS,
  PLATE_ACTION_GRID,
  type PlateActionType,
} from '../bottom-panel/useTechTree';
import './InspectorPanel.css';

const CodePreview = lazy(() =>
  import('../code-preview/CodePreview').then((m) => ({
    default: m.CodePreview,
  })),
);

const CONNECTION_TYPES: ConnectionType[] = ['dataflow', 'http', 'internal', 'data', 'async'];
const POSITION_HOTKEYS = [
  ['Q', 'W', 'E'],
  ['A', 'S', 'D'],
  ['Z', 'X', 'C'],
] as const;

function getPositionHotkey(rowIdx: number, colIdx: number): string {
  return POSITION_HOTKEYS[rowIdx]?.[colIdx] ?? '';
}

function getPlateHeaderText(plate: ContainerBlock): string {
  if (plate.layer === 'subnet') {
    return 'Subnet';
  }

  return plate.layer === 'region'
    ? 'VNet'
    : plate.layer.charAt(0).toUpperCase() + plate.layer.slice(1);
}

export function InspectorPanel() {
  const activeTab = useUIStore((s) => s.inspector.activeTab);
  const setInspectorTab = useUIStore((s) => s.setInspectorTab);
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const resources = useMemo(
    () => architecture.nodes.filter((node): node is ResourceBlock => node.kind === 'resource'),
    [architecture.nodes],
  );
  const containers = useMemo(
    () => architecture.nodes.filter((node): node is ContainerBlock => node.kind === 'container'),
    [architecture.nodes],
  );

  const selectedBlock = selectedId ? (resources.find((b) => b.id === selectedId) ?? null) : null;
  const selectedPlate = selectedId ? (containers.find((p) => p.id === selectedId) ?? null) : null;
  const selectedConnection = selectedId
    ? (architecture.connections.find((c) => c.id === selectedId) ?? null)
    : null;

  return (
    <div className="inspector-panel">
      <div className="inspector-panel-header">
        <div className="inspector-tabs" role="tablist" aria-label="Inspector tabs">
          <button
            type="button"
            role="tab"
            className={`inspector-tab ${activeTab === 'properties' ? 'active' : ''}`}
            aria-selected={activeTab === 'properties'}
            onClick={() => setInspectorTab('properties')}
          >
            Properties
          </button>
          <button
            type="button"
            role="tab"
            className={`inspector-tab ${activeTab === 'code' ? 'active' : ''}`}
            aria-selected={activeTab === 'code'}
            onClick={() => setInspectorTab('code')}
          >
            Code
          </button>
          <button
            type="button"
            role="tab"
            className={`inspector-tab ${activeTab === 'connections' ? 'active' : ''}`}
            aria-selected={activeTab === 'connections'}
            onClick={() => setInspectorTab('connections')}
          >
            Connections
          </button>
        </div>
      </div>

      <div className="inspector-panel-body">
        {activeTab === 'properties' && (
          <PropertiesTab
            selectedBlock={selectedBlock}
            selectedPlate={selectedPlate}
            selectedConnection={selectedConnection}
            architectureName={architecture.name}
            nodeCount={architecture.nodes.length}
            connectionCount={architecture.connections.length}
          />
        )}
        {activeTab === 'code' && <CodeTab />}
        {activeTab === 'connections' && (
          <ConnectionsTab
            selectedBlock={selectedBlock}
            selectedPlate={selectedPlate}
            selectedConnection={selectedConnection}
            resources={resources}
            connections={architecture.connections}
          />
        )}
      </div>
    </div>
  );
}

function PropertiesTab({
  selectedBlock,
  selectedPlate,
  selectedConnection,
  architectureName,
  nodeCount,
  connectionCount,
}: {
  selectedBlock: ResourceBlock | null;
  selectedPlate: ContainerBlock | null;
  selectedConnection: Connection | null;
  architectureName: string;
  nodeCount: number;
  connectionCount: number;
}) {
  if (selectedBlock) {
    return <BlockActionMode block={selectedBlock} />;
  }

  if (selectedPlate) {
    return <PlateActionMode selectedPlate={selectedPlate} />;
  }

  if (selectedConnection) {
    return <ConnectionActionMode connection={selectedConnection} />;
  }

  return (
    <div className="inspector-section">
      <h3 className="inspector-title">Workspace Summary</h3>
      <div className="inspector-properties">
        <PropertyRow label="Name" value={architectureName} />
        <PropertyRow label="Nodes" value={String(nodeCount)} />
        <PropertyRow label="Connections" value={String(connectionCount)} />
      </div>
      <p className="inspector-empty-hint">
        Select a node, container, or connection to inspect details.
      </p>
    </div>
  );
}

function CodeTab() {
  return (
    <div className="inspector-code-tab">
      <Suspense fallback={<p className="inspector-empty-hint">Loading code preview...</p>}>
        <CodePreview embedded />
      </Suspense>
    </div>
  );
}

function ConnectionsTab({
  selectedBlock,
  selectedPlate,
  selectedConnection,
  resources,
  connections,
}: {
  selectedBlock: ResourceBlock | null;
  selectedPlate: ContainerBlock | null;
  selectedConnection: Connection | null;
  resources: ResourceBlock[];
  connections: Connection[];
}) {
  const nodeById = useMemo(() => {
    const map = new Map<string, ResourceBlock>();
    for (const resource of resources) {
      map.set(resource.id, resource);
    }
    return map;
  }, [resources]);

  if (!selectedBlock && !selectedPlate && !selectedConnection) {
    return <p className="inspector-empty-hint">Select a node to view connections.</p>;
  }

  if (selectedConnection) {
    const { sourceId, targetId, type } = resolveConnectionNodes(selectedConnection);
    const source = nodeById.get(sourceId);
    const target = nodeById.get(targetId);

    return (
      <div className="inspector-section">
        <h3 className="inspector-title">Connection Details</h3>
        <div className="inspector-properties">
          <PropertyRow label="Type" value={CONNECTION_TYPE_LABELS[type as ConnectionType]} />
          <PropertyRow label="Source" value={source?.name ?? sourceId} />
          <PropertyRow label="Target" value={target?.name ?? targetId} />
        </div>
      </div>
    );
  }

  const relatedConnections = connections.filter((connection) => {
    const { sourceId, targetId } = resolveConnectionNodes(connection);

    if (selectedBlock) {
      return sourceId === selectedBlock.id || targetId === selectedBlock.id;
    }

    if (!selectedPlate) {
      return false;
    }

    const source = nodeById.get(sourceId);
    const target = nodeById.get(targetId);

    return source?.parentId === selectedPlate.id || target?.parentId === selectedPlate.id;
  });

  if (relatedConnections.length === 0) {
    return <p className="inspector-empty-hint">No connections found for the selected node.</p>;
  }

  return (
    <div className="inspector-section">
      <h3 className="inspector-title">Related Connections</h3>
      <div className="inspector-connection-list">
        {relatedConnections.map((connection) => {
          const { sourceId, targetId, type } = resolveConnectionNodes(connection);
          const source = nodeById.get(sourceId);
          const target = nodeById.get(targetId);
          return (
            <div key={connection.id} className="inspector-connection-item">
              <div className="inspector-connection-path">
                {source?.name ?? sourceId} <span aria-hidden="true">→</span>{' '}
                {target?.name ?? targetId}
              </div>
              <span className="inspector-connection-type">
                {CONNECTION_TYPE_LABELS[type as ConnectionType]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="inspector-property-row">
      <span className="inspector-property-label">{label}</span>
      <span className="inspector-property-value">{value}</span>
    </div>
  );
}

function BlockProperties({ block }: { block: ResourceBlock }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const parent = block.parentId
    ? (architecture.nodes.find((n) => n.id === block.parentId) ?? null)
    : null;
  const categoryName = BLOCK_FRIENDLY_NAMES[block.category] ?? block.category;
  const pos = block.position;

  return (
    <div className="inspector-properties">
      <PropertyRow label="Type" value={block.resourceType} />
      <PropertyRow label="Category" value={categoryName} />
      <PropertyRow label="Provider" value={block.provider.toUpperCase()} />
      {parent && <PropertyRow label="Network" value={parent.name} />}
      <PropertyRow label="Position" value={`(${pos.x}, ${pos.y}, ${pos.z})`} />
    </div>
  );
}

function PlateProperties({ plate }: { plate: ContainerBlock }) {
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const parent = plate.parentId
    ? (architecture.nodes.find((n) => n.id === plate.parentId) ?? null)
    : null;
  const contents = architecture.nodes.filter((n) => n.parentId === plate.id);
  const plateLabel =
    plate.layer === 'subnet'
      ? 'Subnet'
      : plate.layer.charAt(0).toUpperCase() + plate.layer.slice(1);

  return (
    <div className="inspector-properties">
      <PropertyRow label="Type" value={plateLabel} />
      {parent && <PropertyRow label="Parent" value={parent.name} />}
      <PropertyRow label="Size" value={`${plate.frame.width} × ${plate.frame.depth}`} />
      <PropertyRow
        label="Contents"
        value={`${contents.length} node${contents.length !== 1 ? 's' : ''}`}
      />
    </div>
  );
}

function PlateActionMode({ selectedPlate }: { selectedPlate: ContainerBlock }) {
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const renameNode = useArchitectureStore((s) => s.renameNode);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback(
    (name: SoundName) => {
      if (!isSoundMuted) {
        audioService.playSound(name);
      }
    },
    [isSoundMuted],
  );

  const handleAction = useCallback(
    async (action: PlateActionType) => {
      switch (action) {
        case 'deploy':
          setSelectedId(selectedPlate.id);
          break;
        case 'rename': {
          const newName = await promptDialog('Rename container:', 'Rename', selectedPlate.name);
          if (newName !== null && newName.trim() !== '') {
            renameNode(selectedPlate.id, newName.trim());
          }
          break;
        }
        case 'delete':
          removeNode(selectedPlate.id);
          setSelectedId(null);
          playSound('delete');
          break;
        default:
          break;
      }
    },
    [playSound, removeNode, renameNode, selectedPlate.id, selectedPlate.name, setSelectedId],
  );

  return (
    <div className="inspector-section">
      <h3 className="inspector-title">{getPlateHeaderText(selectedPlate)} Actions</h3>
      <div className="inspector-action-grid">
        {PLATE_ACTION_GRID.map((row, rowIdx) => {
          const rowKey = row.filter(Boolean).join('-') || `plate-action-row-${rowIdx}`;
          return (
            <div key={rowKey} className="inspector-action-row">
              {row.map((actionType, colIdx) => {
                const cellKey = actionType ?? `empty-r${rowIdx}c${colIdx}`;
                if (!actionType) {
                  return (
                    <div
                      key={cellKey}
                      className="inspector-action-btn inspector-action-btn--empty"
                    />
                  );
                }

                const action = PLATE_ACTION_DEFINITIONS[actionType];
                const hotkey = getPositionHotkey(rowIdx, colIdx);

                return (
                  <button
                    key={cellKey}
                    type="button"
                    className={`inspector-action-btn ${actionType === 'delete' ? 'inspector-action-btn--danger' : ''}`}
                    onClick={() => {
                      void handleAction(actionType);
                    }}
                    title={hotkey ? `${action.label} (${hotkey})` : action.label}
                  >
                    <span className="inspector-action-icon">{action.icon}</span>
                    <span className="inspector-action-label">{action.label}</span>
                    {hotkey && <span className="inspector-action-hotkey">{hotkey}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <PlateProperties plate={selectedPlate} />
    </div>
  );
}

function ConnectionActionMode({ connection }: { connection: Connection }) {
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const updateConnectionType = useArchitectureStore((s) => s.updateConnectionType);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback(
    (name: SoundName) => {
      if (!isSoundMuted) {
        audioService.playSound(name);
      }
    },
    [isSoundMuted],
  );

  const { sourceId, targetId, type } = resolveConnectionNodes(connection);
  const source = architecture.nodes.find((n) => n.id === sourceId);
  const target = architecture.nodes.find((n) => n.id === targetId);

  const handleDelete = useCallback(() => {
    removeConnection(connection.id);
    setSelectedId(null);
    playSound('delete');
  }, [connection.id, playSound, removeConnection, setSelectedId]);

  const handleTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      updateConnectionType(connection.id, event.target.value as ConnectionType);
    },
    [connection.id, updateConnectionType],
  );

  return (
    <div className="inspector-section">
      <h3 className="inspector-title">Connection</h3>
      <div className="inspector-properties">
        <PropertyRow label="Type" value={CONNECTION_TYPE_LABELS[type as ConnectionType]} />
        {source && <PropertyRow label="Source" value={source.name} />}
        {target && <PropertyRow label="Target" value={target.name} />}
      </div>

      <label className="inspector-form-label">
        Type
        <select className="inspector-form-select" value={type} onChange={handleTypeChange}>
          {CONNECTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONNECTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <div className="inspector-actions-row">
        <button
          type="button"
          className="inspector-action-btn inspector-action-btn--danger"
          onClick={handleDelete}
        >
          <span className="inspector-action-icon">🗑️</span>
          <span className="inspector-action-label">Delete</span>
        </button>
      </div>
    </div>
  );
}

function BlockActionMode({ block }: { block: ResourceBlock }) {
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const setToolMode = useUIStore((s) => s.setToolMode);
  const toggleResourceGuide = useUIStore((s) => s.toggleResourceGuide);
  const duplicateBlock = useArchitectureStore((s) => s.duplicateBlock);
  const renameNode = useArchitectureStore((s) => s.renameNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const playSound = useCallback(
    (name: SoundName) => {
      if (!isSoundMuted) {
        audioService.playSound(name);
      }
    },
    [isSoundMuted],
  );
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) {
      return;
    }
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [editingName]);

  const startEditing = useCallback(() => {
    setEditingName(true);
    setNameValue(block.name);
  }, [block.name]);

  const cancelEdit = useCallback(() => {
    setEditingName(false);
  }, []);

  const commitName = useCallback(() => {
    const trimmedName = nameValue.trim();
    if (trimmedName !== '' && trimmedName !== block.name) {
      renameNode(block.id, trimmedName);
    }
    setEditingName(false);
  }, [block.id, block.name, nameValue, renameNode]);

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitName();
        return;
      }

      if (event.key === 'Escape') {
        cancelEdit();
      }
    },
    [cancelEdit, commitName],
  );

  const handleDelete = useCallback(() => {
    removeNode(block.id);
    setSelectedId(null);
    playSound('delete');
  }, [block.id, playSound, removeNode, setSelectedId]);

  return (
    <div className="inspector-section">
      <h3 className="inspector-title">Node Actions</h3>

      <div className="inspector-block-header">
        {editingName ? (
          <input
            ref={nameInputRef}
            className="inspector-form-input"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
          />
        ) : (
          <button
            type="button"
            className="inspector-block-name"
            onClick={startEditing}
            title="Click to rename"
          >
            {block.name}
          </button>
        )}
      </div>

      <BlockProperties block={block} />

      <div className="inspector-actions-row">
        <button
          type="button"
          className="inspector-action-btn"
          onClick={() => setToolMode('connect')}
          title="Link (L)"
        >
          <span className="inspector-action-icon">🔗</span>
          <span className="inspector-action-label">Link</span>
        </button>
        <button
          type="button"
          className="inspector-action-btn"
          onClick={() => {
            duplicateBlock(block.id);
            playSound('block-snap');
          }}
          title="Copy (C)"
        >
          <span className="inspector-action-icon">📋</span>
          <span className="inspector-action-label">Copy</span>
        </button>
        <button
          type="button"
          className="inspector-action-btn"
          onClick={() => {
            if (!showResourceGuide) {
              toggleResourceGuide();
            }
          }}
          title="Resource Guide"
        >
          <span className="inspector-action-icon">✏️</span>
          <span className="inspector-action-label">Guide</span>
        </button>
        <button
          type="button"
          className="inspector-action-btn inspector-action-btn--danger"
          onClick={handleDelete}
          title="Delete (Del)"
        >
          <span className="inspector-action-icon">🗑️</span>
          <span className="inspector-action-label">Delete</span>
        </button>
      </div>
    </div>
  );
}
