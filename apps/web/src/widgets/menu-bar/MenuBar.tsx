import { useState, useEffect, useRef } from 'react';
import { AiPromptBar } from '../../features/ai';
import { useAiStore } from '../../features/ai/store';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { apiPost } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import type { PullResponse } from '../../shared/types/api';
import type { ArchitectureModel, ProviderType } from '../../shared/types';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import './MenuBar.css';

type DropdownMenu = 'file' | 'edit' | 'build' | 'view' | 'github' | null;

const PROVIDER_OPTIONS: { id: ProviderType; label: string; color: string }[] = [
  { id: 'azure', label: 'Azure', color: '#0078D4' },
  { id: 'aws', label: 'AWS', color: '#FF9900' },
  { id: 'gcp', label: 'GCP', color: '#4285F4' },
];

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<DropdownMenu>(null);
  
  const selectedId = useUIStore((s) => s.selectedId);
  const showValidation = useUIStore((s) => s.showValidation);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const setActiveProvider = useUIStore((s) => s.setActiveProvider);
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const toggleWorkspaceManager = useUIStore((s) => s.toggleWorkspaceManager);
  const toggleTemplateGallery = useUIStore((s) => s.toggleTemplateGallery);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);
  const diffMode = useUIStore((s) => s.diffMode);
  const toggleScenarioGallery = useUIStore((s) => s.toggleScenarioGallery);
  const toggleLearningPanel = useUIStore((s) => s.toggleLearningPanel);
  const showLearningPanel = useUIStore((s) => s.showLearningPanel);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const playSound = (name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); };

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const user = useAuthStore((s) => s.user);

  const removePlate = useArchitectureStore((s) => s.removePlate);
  const removeBlock = useArchitectureStore((s) => s.removeBlock);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  
  const validate = useArchitectureStore((s) => s.validate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const resetWorkspace = useArchitectureStore((s) => s.resetWorkspace);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const canUndo = useArchitectureStore((s) => s.canUndo);
  const canRedo = useArchitectureStore((s) => s.canRedo);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const importArchitecture = useArchitectureStore((s) => s.importArchitecture);

  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.menu-dropdown-container')) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleMenu = (menu: DropdownMenu) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleAction = (action: () => void | Promise<void>) => {
    void action();
    setOpenMenu(null);
  };


  const handleDeleteSelection = () => {
    if (!selectedId) return;
    if (architecture.plates.some((p) => p.id === selectedId)) {
      removePlate(selectedId);
      playSound('delete');
    } else if (architecture.blocks.some((b) => b.id === selectedId)) {
      removeBlock(selectedId);
      playSound('delete');
    } else if (architecture.connections.some((c) => c.id === selectedId)) {
      removeConnection(selectedId);
      playSound('delete');
    }
  };

  const handleValidate = () => {
    const result = validate();
    if (!showValidation) toggleValidation();
    playSound(result.valid ? 'validation-success' : 'validation-error');
  };

  const handleSave = () => {
    saveToStorage();
    toast.success('Workspace saved!');
  };

  const handleLoad = () => {
    loadFromStorage();
  };

  const handleExport = () => {
    const json = JSON.stringify(architecture, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        importArchitecture(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setOpenMenu(null);
  };

  const handleReset = async () => {
    const confirmed = await confirmDialog('All unsaved changes will be lost.', 'Reset Workspace?');
    if (confirmed) {
      resetWorkspace();
    }
  };

  const handleToggleSound = () => {
    toggleSound();
    audioService.setMuted(!isSoundMuted);
  };

  const handleCompareWithGitHub = async () => {
    const ws = useArchitectureStore.getState().workspace;
    const wsId = ws.backendWorkspaceId ?? ws.id;
    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(wsId)}/pull`,
      );
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const localArch = useArchitectureStore.getState().workspace.architecture;
      const delta = computeArchitectureDiff(remoteArch, localArch);
      useUIStore.getState().setDiffMode(true, delta, remoteArch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch remote architecture');
    }
  };

  const handleAiSubmit = (prompt: string, provider: string) => {
    useAiStore.getState().generate(prompt, provider);
  };

  const aiLoading = useAiStore((s) => s.generateLoading);
  const aiError = useAiStore((s) => s.generateError);

  const handleToggleDiffMode = () => {
    if (diffMode) {
      useUIStore.getState().setDiffMode(false);
    }
  };

  return (
    <div className="menu-bar">
      <div className="menu-bar-logo">🧱 CloudBlocks</div>

      <div className="menu-bar-divider" />

      <button
        type="button"
        className="workspace-pill"
        onClick={() => {
          toggleWorkspaceManager();
          setOpenMenu(null);
        }}
        title="Manage Workspaces"
      >
        Workspaces
      </button>

      <div className="menu-bar-divider" />

      <nav className="menu-bar-nav">
        <div className="menu-dropdown-container">
          <button
            type="button"
            className="menu-trigger"
            data-active={openMenu === 'file'}
            onClick={() => toggleMenu('file')}
          >
            File
          </button>
          <div className={`menu-dropdown ${openMenu === 'file' ? 'show' : ''}`}>
            <button type="button" className="menu-item" onClick={() => handleAction(handleSave)}>
              <span className="menu-item-left">💾 Save Workspace</span>
              <span className="menu-shortcut">Ctrl+S</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(handleLoad)}>
              <span className="menu-item-left">📂 Load Workspace</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(handleImport)}>
              <span className="menu-item-left">📥 Import JSON</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(handleExport)}>
              <span className="menu-item-left">📤 Export JSON</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(handleReset)}>
              <span className="menu-item-left">🔄 Reset Workspace</span>
            </button>
          </div>
        </div>

        <div className="menu-dropdown-container">
          <button
            type="button"
            className="menu-trigger"
            data-active={openMenu === 'edit'}
            onClick={() => toggleMenu('edit')}
          >
            Edit
          </button>
          <div className={`menu-dropdown ${openMenu === 'edit' ? 'show' : ''}`}>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleAction(undo)}
              disabled={!canUndo}
            >
              <span className="menu-item-left">↩ Undo</span>
              <span className="menu-shortcut">Ctrl+Z</span>
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleAction(redo)}
              disabled={!canRedo}
            >
              <span className="menu-item-left">↪ Redo</span>
              <span className="menu-shortcut">Ctrl+Shift+Z</span>
            </button>
            <div className="menu-separator" />
            <button
              type="button"
              className="menu-item"
              onClick={() => handleAction(handleDeleteSelection)}
              disabled={!selectedId}
            >
              <span className="menu-item-left">❌ Delete Selection</span>
              <span className="menu-shortcut">Del</span>
            </button>
          </div>
        </div>

        <div className="menu-dropdown-container">
          <button
            type="button"
            className="menu-trigger"
            data-active={openMenu === 'build'}
            onClick={() => toggleMenu('build')}
          >
            Build
          </button>
          <div className={`menu-dropdown ${openMenu === 'build' ? 'show' : ''}`}>
            <button type="button" className="menu-item" onClick={() => handleAction(handleValidate)}>
              <span className="menu-item-left">✅ Validate Architecture</span>
              {validationResult && (
                <span className={`menu-badge ${validationResult.valid ? 'menu-badge-valid' : 'menu-badge-invalid'}`}>
                  {validationResult.valid ? 'Valid' : 'Errors'}
                </span>
              )}
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(toggleCodePreview)}>
              <span className="menu-item-left">⚡ Generate Terraform</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(toggleTemplateGallery)}>
              <span className="menu-item-left">📦 Browse Templates</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(toggleScenarioGallery)}>
              <span className="menu-item-left">📚 Browse Scenarios</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(toggleLearningPanel)}>
              <span className="menu-item-left">{showLearningPanel ? '✓ ' : ''}📖 Show Learning Panel</span>
            </button>
          </div>
        </div>

        <div className="menu-dropdown-container">
          <button
            type="button"
            className="menu-trigger"
            data-active={openMenu === 'view'}
            onClick={() => toggleMenu('view')}
          >
            View
          </button>
          <div className={`menu-dropdown ${openMenu === 'view' ? 'show' : ''}`}>
            <button type="button" className="menu-item" onClick={() => handleAction(toggleValidation)}>
              <span className="menu-item-left">{showValidation ? '✓ ' : ''}📊 Validation Results</span>
            </button>
            <div className="menu-separator" />
            <button
              type="button"
              className="menu-item"
              onClick={() => handleAction(handleToggleDiffMode)}
              disabled={!diffMode}
            >
              <span className="menu-item-left">{diffMode ? '✓ ' : ''}🔍 Diff View</span>
            </button>
          </div>
        </div>
      
      </nav>

      <AiPromptBar onSubmit={handleAiSubmit} isLoading={aiLoading} error={aiError ?? undefined} />

      <div className="menu-bar-divider" />

      <div className="provider-section" role="tablist" aria-label="Cloud provider">
        {PROVIDER_OPTIONS.map((provider) => {
          const isActive = activeProvider === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="provider-btn"
              data-active={isActive}
              onClick={() => setActiveProvider(provider.id)}
              style={isActive ? { borderColor: provider.color, color: provider.color, boxShadow: `inset 0 3px 0 rgba(255, 255, 255, 0.6), 0 4px 0 0 ${provider.color}` } : undefined}
            >
              {provider.label}
            </button>
          );
        })}
      </div>

      <div className="quick-actions">
        <button
          type="button"
          className="quick-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={handleSave}
          title="Save Workspace (Ctrl+S)"
        >
          💾
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={handleToggleSound}
          title={isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
        >
          {isSoundMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="menu-bar-divider" />

      <div className="github-section menu-dropdown-container">
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="github-btn"
              data-active={openMenu === 'github'}
              onClick={() => toggleMenu('github')}
            >
              🔐 {user?.github_username ?? 'GitHub'}
            </button>
            <div className={`menu-dropdown right-aligned ${openMenu === 'github' ? 'show' : ''}`}>
              <button type="button" className="menu-item" onClick={() => handleAction(toggleGitHubRepos)}>
                <span className="menu-item-left">📦 Repos</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(toggleGitHubSync)}>
                <span className="menu-item-left">🔄 Sync</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(toggleGitHubPR)}>
                <span className="menu-item-left">🔀 Create PR</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(handleCompareWithGitHub)}>
                <span className="menu-item-left">🔍 Compare with GitHub</span>
              </button>
              <div className="menu-separator" />
              <button type="button" className="menu-item" onClick={() => handleAction(toggleGitHubLogin)}>
                <span className="menu-item-left">🚪 Sign Out</span>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="github-btn"
            onClick={toggleGitHubLogin}
            title="Sign in with GitHub"
          >
            🔐 Sign In
          </button>
        )}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  );
}
