import { useState } from 'react';
import { X, Pencil, Copy } from 'lucide-react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { syncWorkspaceUI } from '../../entities/store/uiSync';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { promptDialog } from '../../shared/ui/PromptDialog';
import './WorkspaceManager.css';

export function WorkspaceManager() {
  const activeProvider = useUIStore((s) => s.activeProvider);
  const show = useUIStore((s) => s.showWorkspaceManager);
  const toggleWorkspaceManager = useUIStore((s) => s.toggleWorkspaceManager);

  const workspace = useArchitectureStore((s) => s.workspace);
  const workspaces = useArchitectureStore((s) => s.workspaces);
  const createWorkspace = useArchitectureStore((s) => s.createWorkspace);
  const switchWorkspace = useArchitectureStore((s) => s.switchWorkspace);
  const deleteWorkspace = useArchitectureStore((s) => s.deleteWorkspace);
  const cloneWorkspace = useArchitectureStore((s) => s.cloneWorkspace);
  const renameWorkspace = useArchitectureStore((s) => s.renameWorkspace);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);

  const [newName, setNewName] = useState('');

  if (!show) return null;

  // Build a combined list: current workspace is always included
  const allWorkspaces = workspaces.find((ws) => ws.id === workspace.id)
    ? workspaces
    : [workspace, ...workspaces];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createWorkspace(name, activeProvider);
    syncWorkspaceUI();
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    if (allWorkspaces.length <= 1) return;
    const confirmed = await confirmDialog('This cannot be undone.', 'Delete this workspace?');
    if (confirmed) {
      deleteWorkspace(id);
      syncWorkspaceUI();
    }
  };

  const handleRename = async (currentName: string) => {
    const newName = await promptDialog('Rename workspace:', 'Rename', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      renameWorkspace(newName.trim());
    }
  };

  return (
    <div className="workspace-manager">
      <div className="workspace-manager-header">
        <h3 className="workspace-manager-title">📂 Workspaces</h3>
        <button
          type="button"
          className="workspace-manager-close"
          onClick={toggleWorkspaceManager}
          aria-label="Close workspace manager panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="workspace-manager-create">
        <input
          className="workspace-manager-input"
          type="text"
          placeholder="New workspace name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
        />
        <button
          type="button"
          className="workspace-manager-create-btn"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          + Create
        </button>
      </div>

      <div className="workspace-manager-list">
        {allWorkspaces.map((ws) => {
          const isActive = ws.id === workspace.id;
          const blockCount = ws.architecture.nodes.filter(
            (node) => node.kind === 'resource',
          ).length;
          const plateCount = ws.architecture.nodes.filter(
            (node) => node.kind === 'container',
          ).length;

          return (
            <div
              key={ws.id}
              className={`workspace-manager-item ${isActive ? 'workspace-manager-item-active' : ''}`}
            >
              <div className="workspace-manager-item-info">
                <span className="workspace-manager-item-name">
                  {isActive && '● '}
                  {ws.name}
                </span>
                <span className="workspace-manager-item-stats">
                  {plateCount} containers · {blockCount} nodes
                </span>
              </div>
              <div className="workspace-manager-item-actions">
                {isActive && (
                  <button
                    type="button"
                    className="workspace-manager-action"
                    onClick={() => handleRename(ws.name)}
                    title="Rename workspace"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {!isActive && (
                  <button
                    type="button"
                    className="workspace-manager-action"
                    onClick={() => {
                      saveToStorage();
                      switchWorkspace(ws.id);
                      syncWorkspaceUI();
                    }}
                    title="Switch to this workspace"
                  >
                    ↗
                  </button>
                )}
                <button
                  type="button"
                  className="workspace-manager-action"
                  onClick={() => {
                    cloneWorkspace(ws.id);
                    syncWorkspaceUI();
                  }}
                  title="Clone workspace"
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="workspace-manager-action workspace-manager-action-delete"
                  onClick={() => handleDelete(ws.id)}
                  title="Delete workspace"
                  disabled={allWorkspaces.length <= 1}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
