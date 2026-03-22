import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useLearningStore } from '../../entities/store/learningStore';
import { validateArchitectureShape } from '../../entities/store/slices';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';


import { usePromoteStore } from '../../entities/store/promoteStore';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import type { PullResponse } from '../../shared/types/api';
import type { ArchitectureModel, ProviderType } from '@cloudblocks/schema';
import type { BackendStatus } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import './MenuBar.css';

type DropdownMenu = 'file' | 'edit' | 'build' | 'view' | 'github' | null;

const PROVIDER_OPTIONS: { id: ProviderType; label: string; color: string; comingSoon?: boolean }[] = [
  { id: 'azure', label: 'Azure', color: '#0078D4' },
  { id: 'aws', label: 'AWS', color: '#FF9900', comingSoon: true },
  { id: 'gcp', label: 'GCP', color: '#4285F4', comingSoon: true },
];

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<DropdownMenu>(null);
  
  const selectedId = useUIStore((s) => s.selectedId);
  const showValidation = useUIStore((s) => s.showValidation);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  const showBlockPalette = useUIStore((s) => s.showBlockPalette);
  const toggleBlockPalette = useUIStore((s) => s.toggleBlockPalette);
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);
  const toggleResourceGuide = useUIStore((s) => s.toggleResourceGuide);
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
  const activeScenario = useLearningStore((s) => s.activeScenario);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const themeVariant = useUIStore((s) => s.themeVariant);
  const setThemeVariant = useUIStore((s) => s.setThemeVariant);
  const playSound = (name: SoundName) => { if (!isSoundMuted) audioService.playSound(name); };

  const togglePromoteDialog = usePromoteStore((s) => s.togglePromoteDialog);
  const toggleRollbackDialog = usePromoteStore((s) => s.toggleRollbackDialog);
  const togglePromoteHistory = usePromoteStore((s) => s.togglePromoteHistory);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const backendStatus: BackendStatus = useUIStore((s) => s.backendStatus);
  const backendAvailable = backendStatus === 'available';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const removeNode = useArchitectureStore((s) => s.removeNode);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  
  const validate = useArchitectureStore((s) => s.validate);
  const saveToStorage = useArchitectureStore((s) => s.saveToStorage);
  const loadFromStorage = useArchitectureStore((s) => s.loadFromStorage);
  const resetWorkspace = useArchitectureStore((s) => s.resetWorkspace);
  const validationResult = useArchitectureStore((s) => s.validationResult);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const plates = architecture.nodes.filter((node) => node.kind === 'container');
  const blocks = architecture.nodes.filter((node) => node.kind === 'resource');
  const backendWorkspaceId = useArchitectureStore((s) => s.workspace.backendWorkspaceId);
  const canUndo = useArchitectureStore((s) => s.canUndo);
  const canRedo = useArchitectureStore((s) => s.canRedo);
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const importArchitecture = useArchitectureStore((s) => s.importArchitecture);

  const importInputRef = useRef<HTMLInputElement>(null);
  const hasBackendWorkspaceLink = Boolean(backendWorkspaceId);

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
    if (plates.some((p) => p.id === selectedId)) {
      removeNode(selectedId);
      playSound('delete');
    } else if (blocks.some((b) => b.id === selectedId)) {
      removeNode(selectedId);
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

  const handleProviderSwitch = async (newProvider: ProviderType) => {
    const targetProvider = PROVIDER_OPTIONS.find((provider) => provider.id === newProvider);
    if (targetProvider?.comingSoon) return;
    if (newProvider === activeProvider) return;

    const blocksFromOtherProvider = blocks.filter(
      (block) => block.provider && block.provider !== newProvider
    );

    if (blocksFromOtherProvider.length > 0) {
      const providerCounts = new Map<string, number>();
      for (const block of blocksFromOtherProvider) {
        const p = block.provider ?? 'unknown';
        providerCounts.set(p, (providerCounts.get(p) ?? 0) + 1);
      }
      const summary = Array.from(providerCounts.entries())
        .map(([p, count]) => `${count} ${p.toUpperCase()}`)
        .join(', ');

      const confirmed = await confirmDialog(
        `Your canvas has ${summary} block(s). New blocks will be created as ${newProvider.toUpperCase()} resources. Existing blocks keep their original provider.\n\nSwitch to ${newProvider.toUpperCase()}?`,
        'Switch Cloud Provider?',
      );
      if (!confirmed) return;
    }

    setActiveProvider(newProvider);
  };

  const handleSave = () => {
    const success = saveToStorage();
    if (success) {
      toast.success('Workspace saved!');
    } else {
      toast.error('Failed to save workspace. Storage may be full.');
    }
  };

  const handleLoad = async () => {
    const confirmed = await confirmDialog(
      'Loading will replace current workspace with saved data. Unsaved changes will be lost.',
      'Load Workspace?',
    );
    if (confirmed) {
      loadFromStorage();
    }
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
        const error = importArchitecture(text);
        if (error) {
          toast.error(`Import failed: ${error}`);
        } else {
          toast.success('Architecture imported successfully!');
        }
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
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
    if (!backendWorkspaceId) {
      toast.error('Workspace must be linked to backend before using GitHub compare.');
      return;
    }

    try {
      const response = await apiPost<PullResponse>(
        `/api/v1/workspaces/${encodeURIComponent(backendWorkspaceId)}/pull`,
      );
      validateArchitectureShape(response.architecture);
      const remoteArch = response.architecture as unknown as ArchitectureModel;
      const localArch = useArchitectureStore.getState().workspace.architecture;
      const delta = computeArchitectureDiff(remoteArch, localArch);
      useUIStore.getState().setDiffMode(true, delta, remoteArch);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch remote architecture'));
    }
  };

  const handleToggleDiffMode = () => {
    if (diffMode) {
      useUIStore.getState().setDiffMode(false);
    }
  };

  const handleToggleLearningPanel = () => {
    if (showLearningPanel) {
      toggleLearningPanel();
      return;
    }

    if (!activeScenario) {
      if (!useUIStore.getState().showScenarioGallery) {
        toggleScenarioGallery();
      }
      return;
    }

    toggleLearningPanel();
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
              <span className="menu-item-left">⚡ Generate Code</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(toggleTemplateGallery)}>
              <span className="menu-item-left">📦 Browse Templates</span>
            </button>

            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(togglePromoteDialog)}>
              <span className="menu-item-left">&#x2B06; Promote to Production</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(toggleRollbackDialog)}>
              <span className="menu-item-left">&#x2B07; Rollback Production</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(togglePromoteHistory)}>
              <span className="menu-item-left">&#x1F4CB; Promotion History</span>
            </button>
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(toggleScenarioGallery)}>
              <span className="menu-item-left">📚 Browse Scenarios</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(handleToggleLearningPanel)}>
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
            <button type="button" className="menu-item" onClick={() => handleAction(toggleBlockPalette)}>
              <span className="menu-item-left">{showBlockPalette ? '✓ ' : '  '}🧰 Block Palette</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(toggleResourceGuide)}>
              <span className="menu-item-left">{showResourceGuide ? '✓ ' : '  '}📖 Resource Guide</span>
            </button>
            <div className="menu-separator" />
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
            <div className="menu-separator" />
            <button type="button" className="menu-item" onClick={() => handleAction(() => setThemeVariant('blueprint'))}>
              <span className="menu-item-left">{themeVariant === 'blueprint' ? '✓ ' : '  '}🌙 Blueprint (Dark)</span>
            </button>
            <button type="button" className="menu-item" onClick={() => handleAction(() => setThemeVariant('workshop'))}>
              <span className="menu-item-left">{themeVariant === 'workshop' ? '✓ ' : '  '}☀️ Workshop (Light)</span>
            </button>
          </div>
        </div>
      
      </nav>

      <div className="menu-bar-divider" />

      <div className="provider-section" role="tablist" aria-label="Cloud provider">
        {PROVIDER_OPTIONS.map((provider) => {
          const isActive = activeProvider === provider.id;
          const isComingSoon = provider.comingSoon === true;
          return (
            <button
              key={provider.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className="provider-btn"
              data-active={isActive}
              disabled={isComingSoon}
              onClick={() => handleProviderSwitch(provider.id)}
              title={isComingSoon ? `${provider.label} support is coming soon` : undefined}
              style={isActive ? { borderColor: provider.color, color: provider.color, boxShadow: `inset 0 3px 0 rgba(255, 255, 255, 0.6), 0 4px 0 0 ${provider.color}` } : undefined}
            >
              {provider.label}{isComingSoon ? ' (Coming Soon)' : ''}
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
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleGitHubSync)}
                disabled={!hasBackendWorkspaceLink}
                title={!hasBackendWorkspaceLink ? 'Link workspace to backend to use GitHub sync.' : undefined}
              >
                <span className="menu-item-left">🔄 Sync</span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleGitHubPR)}
                disabled={!hasBackendWorkspaceLink}
                title={!hasBackendWorkspaceLink ? 'Link workspace to backend to create pull requests.' : undefined}
              >
                <span className="menu-item-left">🔀 Create PR</span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(handleCompareWithGitHub)}
                disabled={!hasBackendWorkspaceLink}
                title={!hasBackendWorkspaceLink ? 'Link workspace to backend to compare with GitHub.' : undefined}
              >
                <span className="menu-item-left">🔍 Compare with GitHub</span>
              </button>
              <div className="menu-separator" />
              <button type="button" className="menu-item" onClick={() => handleAction(logout)}>
                <span className="menu-item-left">🚪 Sign Out</span>
              </button>
            </div>
          </>
        ) : authStatus === 'unknown' || backendStatus === 'unknown' ? (
          <button
            type="button"
            className="github-btn"
            disabled
            title="Checking authentication..."
          >
            🔐 ...
          </button>
        ) : !backendAvailable ? (
          <button
            type="button"
            className="github-btn"
            disabled
            title="Backend API required for GitHub features. Run the backend server to enable."
          >
            🔐 Demo Mode
          </button>
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
