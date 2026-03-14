import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const showProperties = useUIStore((s) => s.showProperties);
  const selectedId = useUIStore((s) => s.selectedId);
  const architecture = useArchitectureStore(
    (s) => s.workspace.architecture
  );
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const moveBlock = useArchitectureStore((s) => s.moveBlock);
  const removePlate = useArchitectureStore((s) => s.removePlate);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const plates = useArchitectureStore((s) => s.workspace.architecture.plates);

  if (!showProperties || !selectedId) return null;

  // Find the selected entity
  const plate = architecture.plates.find((p) => p.id === selectedId);
  const block = architecture.blocks.find((b) => b.id === selectedId);
  const connection = architecture.connections.find((c) => c.id === selectedId);

  if (!plate && !block && !connection) return null;

  return (
    <div className="properties-panel">
      <h3 className="properties-title">📋 Properties</h3>

      {plate && (
        <div className="properties-content">
          <PropertyRow label="Type" value={`${plate.type} plate`} />
          <PropertyRow label="Name" value={plate.name} />
          <PropertyRow label="ID" value={plate.id} />
          {plate.subnetAccess && (
            <PropertyRow label="Access" value={plate.subnetAccess} />
          )}
          <PropertyRow
            label="Position"
            value={`(${plate.position.x}, ${plate.position.y}, ${plate.position.z})`}
          />
          <PropertyRow
            label="Size"
            value={`${plate.size.width} × ${plate.size.depth}`}
          />
          <PropertyRow
            label="Children"
            value={`${plate.children.length} items`}
          />
          <button
            className="properties-delete"
            onClick={() => removePlate(plate.id)}
          >
            🗑️ Delete Plate
          </button>
        </div>
      )}

      {block && (
        <div className="properties-content">
          <PropertyRow label="Category" value={block.category} />
          <PropertyRow label="Name" value={block.name} />
          <PropertyRow label="ID" value={block.id} />
          <PropertyRow label="Placement" value={block.placementId} />
          <PropertyRow
            label="Position"
            value={`(${block.position.x.toFixed(1)}, ${block.position.y.toFixed(1)}, ${block.position.z.toFixed(1)})`}
          />
          <button
            className="properties-delete"
            onClick={() => removeBlock(block.id)}
          >
            🗑️ Delete Block
          </button>

          {(() => {
            const targetPlates = plates.filter(
              (p) => p.type === 'subnet' && p.id !== block.placementId
            );
            if (targetPlates.length === 0) return null;

            return (
              <div className="properties-move-section">
                <label className="properties-field-label">
                  Move to:
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) moveBlock(block.id, e.target.value);
                  }}
                  defaultValue=""
                  className="properties-select"
                >
                  <option value="" disabled>Select plate...</option>
                  {targetPlates.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            );
          })()}
        </div>
      )}

      {connection && (
        <div className="properties-content">
          <PropertyRow label="Type" value={connection.type} />
          <PropertyRow label="ID" value={connection.id} />
          <PropertyRow label="Source" value={connection.sourceId} />
          <PropertyRow label="Target" value={connection.targetId} />
          <button
            className="properties-delete"
            onClick={() => removeConnection(connection.id)}
          >
            🗑️ Delete Connection
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="property-row">
      <span className="property-label">{label}</span>
      <span className="property-value">{value}</span>
    </div>
  );
}
