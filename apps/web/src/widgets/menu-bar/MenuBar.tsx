import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { validateArchitectureShape } from '../../entities/store/slices';
import { useAuthStore } from '../../entities/store/authStore';
import { useUIStore } from '../../entities/store/uiStore';
import { clearWorkspaceDiffUI, syncWorkspaceUI } from '../../entities/store/uiSync';
import { computeArchitectureDiff } from '../../features/diff/engine';
import { apiPost, getApiErrorMessage } from '../../shared/api/client';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { LogoIcon } from '../../shared/ui/LogoIcon';
import type { PullResponse } from '../../shared/types/api';
import type { ArchitectureModel, ProviderType } from '@cloudblocks/schema';
import type { BackendStatus } from '../../entities/store/uiStore';
import { audioService } from '../../shared/utils/audioService';
import type { SoundName } from '../../shared/utils/audioService';
import {
  Save,
  FolderOpen,
  FileDown,
  FileUp,
  RotateCcw,
  Undo2,
  Redo2,
  Trash2,
  CheckCircle,
  Zap,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  GraduationCap,
  PanelLeft,
  BookMarked,
  Search,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  FolderGit2,
  RefreshCw,
  GitPullRequest,
  GitCompare,
  LogOut,
  LayoutGrid,
  Keyboard,
  Type,
} from 'lucide-react';
import './MenuBar.css';

/** Inline GitHub mark — lucide-react v1.x dropped brand icons. */
function GitHubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      data-testid="github-icon"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

type DropdownMenu = 'logo' | 'github' | null;
type MenuKey = Exclude<DropdownMenu, null>;
const MENU_ORDER: MenuKey[] = ['logo', 'github'];

const PROVIDER_OPTIONS: { id: ProviderType; label: string }[] = [
  { id: 'azure', label: 'Azure' },
  { id: 'aws', label: 'AWS' },
  { id: 'gcp', label: 'GCP' },
];

function useMenuKeyboard({
  openMenu,
  setOpenMenu,
  triggerRefs,
  menuRefs,
}: {
  openMenu: DropdownMenu;
  setOpenMenu: React.Dispatch<React.SetStateAction<DropdownMenu>>;
  triggerRefs: Record<MenuKey, React.RefObject<HTMLButtonElement | null>>;
  menuRefs: Record<MenuKey, React.RefObject<HTMLDivElement | null>>;
}) {
  const [activeMenuItemIndex, setActiveMenuItemIndex] = useState<Record<MenuKey, number>>({
    logo: -1,
    github: -1,
  });

  const getAllMenuItems = useCallback(
    (menu: MenuKey) =>
      Array.from(menuRefs[menu].current?.querySelectorAll<HTMLButtonElement>('.menu-item') ?? []),
    [menuRefs],
  );

  const focusMenuItem = useCallback(
    (menu: MenuKey, index: number) => {
      const items = getAllMenuItems(menu);
      const item = items[index];
      if (!item || item.disabled) {
        return false;
      }
      item.focus();
      setActiveMenuItemIndex((prev) => ({ ...prev, [menu]: index }));
      return true;
    },
    [getAllMenuItems],
  );

  const focusFirstMenuItem = useCallback(
    (menu: MenuKey) => {
      const items = getAllMenuItems(menu);
      const firstIndex = items.findIndex((item) => !item.disabled);
      if (firstIndex >= 0) {
        focusMenuItem(menu, firstIndex);
      }
    },
    [focusMenuItem, getAllMenuItems],
  );

  const focusLastMenuItem = useCallback(
    (menu: MenuKey) => {
      const items = getAllMenuItems(menu);
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (!items[i].disabled) {
          focusMenuItem(menu, i);
          break;
        }
      }
    },
    [focusMenuItem, getAllMenuItems],
  );

  const openMenuAndFocus = useCallback(
    (menu: MenuKey, target: 'first' | 'last' = 'first') => {
      setOpenMenu(menu);
      requestAnimationFrame(() => {
        if (target === 'last') {
          focusLastMenuItem(menu);
        } else {
          focusFirstMenuItem(menu);
        }
      });
    },
    [focusFirstMenuItem, focusLastMenuItem, setOpenMenu],
  );

  const closeMenuAndFocusTrigger = useCallback(
    (menu: MenuKey) => {
      setOpenMenu(null);
      triggerRefs[menu].current?.focus();
    },
    [setOpenMenu, triggerRefs],
  );

  const focusAdjacentTrigger = useCallback(
    (menu: MenuKey, direction: 1 | -1) => {
      const currentIndex = MENU_ORDER.indexOf(menu);
      const nextIndex = (currentIndex + direction + MENU_ORDER.length) % MENU_ORDER.length;
      const nextMenu = MENU_ORDER[nextIndex];
      triggerRefs[nextMenu].current?.focus();
    },
    [triggerRefs],
  );

  const openAdjacentMenu = useCallback(
    (menu: MenuKey, direction: 1 | -1) => {
      const currentIndex = MENU_ORDER.indexOf(menu);
      const nextIndex = (currentIndex + direction + MENU_ORDER.length) % MENU_ORDER.length;
      const nextMenu = MENU_ORDER[nextIndex];
      openMenuAndFocus(nextMenu, 'first');
    },
    [openMenuAndFocus],
  );

  const moveInMenu = useCallback(
    (menu: MenuKey, direction: 1 | -1) => {
      const items = getAllMenuItems(menu);
      if (items.length === 0) {
        return;
      }

      let currentIndex = items.findIndex((item) => item === document.activeElement);
      if (currentIndex < 0) {
        currentIndex = activeMenuItemIndex[menu];
      }
      if (currentIndex < 0) {
        currentIndex = direction === 1 ? -1 : 0;
      }

      for (let i = 0; i < items.length; i += 1) {
        currentIndex = (currentIndex + direction + items.length) % items.length;
        if (!items[currentIndex].disabled) {
          focusMenuItem(menu, currentIndex);
          return;
        }
      }
    },
    [activeMenuItemIndex, focusMenuItem, getAllMenuItems],
  );

  useEffect(() => {
    for (const menu of MENU_ORDER) {
      const items = getAllMenuItems(menu);
      const activeIndex = openMenu === menu ? activeMenuItemIndex[menu] : -1;
      items.forEach((item, index) => {
        item.tabIndex = index === activeIndex ? 0 : -1;
      });
    }
  }, [activeMenuItemIndex, getAllMenuItems, openMenu]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    requestAnimationFrame(() => {
      const currentItems = getAllMenuItems(openMenu);
      if (currentItems.length === 0) {
        return;
      }
      const nextIndex = currentItems.findIndex((item) => !item.disabled);
      if (nextIndex >= 0) {
        focusMenuItem(openMenu, nextIndex);
      }
    });
  }, [focusMenuItem, getAllMenuItems, openMenu]);

  const handleTriggerKeyDown = useCallback(
    (menu: MenuKey, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (openMenu === menu) {
          setOpenMenu(null);
        } else {
          openMenuAndFocus(menu, 'first');
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openMenuAndFocus(menu, 'first');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        openMenuAndFocus(menu, 'last');
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (openMenu === menu) {
          openAdjacentMenu(menu, 1);
        } else {
          focusAdjacentTrigger(menu, 1);
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (openMenu === menu) {
          openAdjacentMenu(menu, -1);
        } else {
          focusAdjacentTrigger(menu, -1);
        }
        return;
      }

      if (event.key === 'Escape' && openMenu === menu) {
        event.preventDefault();
        closeMenuAndFocusTrigger(menu);
      }
    },
    [
      closeMenuAndFocusTrigger,
      focusAdjacentTrigger,
      openAdjacentMenu,
      openMenu,
      openMenuAndFocus,
      setOpenMenu,
    ],
  );

  const handleMenuKeyDown = useCallback(
    (menu: MenuKey, event: React.KeyboardEvent<HTMLDivElement>) => {
      if (openMenu !== menu) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveInMenu(menu, 1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveInMenu(menu, -1);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusFirstMenuItem(menu);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusLastMenuItem(menu);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        openAdjacentMenu(menu, 1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        openAdjacentMenu(menu, -1);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenuAndFocusTrigger(menu);
      }
    },
    [
      closeMenuAndFocusTrigger,
      focusFirstMenuItem,
      focusLastMenuItem,
      moveInMenu,
      openAdjacentMenu,
      openMenu,
    ],
  );

  const handleDocumentKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !openMenu) {
        return;
      }
      event.preventDefault();
      closeMenuAndFocusTrigger(openMenu);
    },
    [closeMenuAndFocusTrigger, openMenu],
  );

  return {
    handleTriggerKeyDown,
    handleMenuKeyDown,
    openMenuAndFocus,
    handleDocumentKeyDown,
  };
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<DropdownMenu>(null);

  const selectedId = useUIStore((s) => s.selectedId);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const showValidation = useUIStore((s) => s.showValidation);
  const toggleValidation = useUIStore((s) => s.toggleValidation);
  const sidebarOpen = useUIStore((s) => s.sidebar.isOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const inspectorOpen = useUIStore((s) => s.inspector.isOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const showResourceGuide = useUIStore((s) => s.showResourceGuide);
  const toggleResourceGuide = useUIStore((s) => s.toggleResourceGuide);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const openInspectorTab = useUIStore((s) => s.openInspectorTab);
  const toggleWorkspaceManager = useUIStore((s) => s.toggleWorkspaceManager);
  const openDrawer = useUIStore((s) => s.openDrawer);
  const toggleGitHubLogin = useUIStore((s) => s.toggleGitHubLogin);
  const toggleGitHubRepos = useUIStore((s) => s.toggleGitHubRepos);
  const toggleGitHubSync = useUIStore((s) => s.toggleGitHubSync);
  const toggleGitHubPR = useUIStore((s) => s.toggleGitHubPR);
  const setBackendStatus = useUIStore((s) => s.setBackendStatus);
  const diffMode = useUIStore((s) => s.diffMode);
  const drawer = useUIStore((s) => s.drawer);
  const isLearningOpen = drawer.isOpen && drawer.activePanel === 'learning';
  const activeScenario = useArchitectureStore((s) => s.activeScenario);
  const isSoundMuted = useUIStore((s) => s.isSoundMuted);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const themeVariant = useUIStore((s) => s.themeVariant);
  const gridStyle = useUIStore((s) => s.gridStyle);
  const cycleGridStyle = useUIStore((s) => s.cycleGridStyle);
  const cycleLabelMode = useUIStore((s) => s.cycleLabelMode);
  const labelModeOverride = useUIStore((s) => s.labelModeOverride);
  const setThemeVariant = useUIStore((s) => s.setThemeVariant);
  const playSound = (name: SoundName) => {
    if (!isSoundMuted) audioService.playSound(name);
  };

  const togglePromoteDialog = useUIStore((s) => s.togglePromoteDialog);
  const toggleRollbackDialog = useUIStore((s) => s.toggleRollbackDialog);
  const togglePromoteHistory = useUIStore((s) => s.togglePromoteHistory);

  const isAuthenticated = useAuthStore((s) => s.status) === 'authenticated';
  const authStatus = useAuthStore((s) => s.status);
  const backendStatus: BackendStatus = useUIStore((s) => s.backendStatus);
  const backendAvailable = backendStatus === 'available';
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const removeNode = useArchitectureStore((s) => s.removeNode);
  const removeConnection = useArchitectureStore((s) => s.removeConnection);
  const createWorkspace = useArchitectureStore((s) => s.createWorkspace);

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
  const logoTriggerRef = useRef<HTMLButtonElement>(null);
  const githubTriggerRef = useRef<HTMLButtonElement>(null);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const githubMenuRef = useRef<HTMLDivElement>(null);
  const hasBackendWorkspaceLink = Boolean(backendWorkspaceId);
  const { handleTriggerKeyDown, handleMenuKeyDown, openMenuAndFocus, handleDocumentKeyDown } =
    useMenuKeyboard({
      openMenu,
      setOpenMenu,
      triggerRefs: {
        logo: logoTriggerRef,
        github: githubTriggerRef,
      },
      menuRefs: {
        logo: logoMenuRef,
        github: githubMenuRef,
      },
    });

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.menu-dropdown-container')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [handleDocumentKeyDown]);

  const toggleMenu = (menu: DropdownMenu) => {
    if (!menu) {
      setOpenMenu(null);
      return;
    }
    if (openMenu === menu) {
      setOpenMenu(null);
      return;
    }
    openMenuAndFocus(menu, 'first');
  };

  const handleAction = (action: () => void | Promise<void>) => {
    void action();
    setOpenMenu(null);
  };

  const handleDeleteSelection = () => {
    const idsToDelete = selectedIds.size > 0 ? [...selectedIds] : selectedId ? [selectedId] : [];
    if (idsToDelete.length === 0) return;
    for (const id of idsToDelete) {
      if (plates.some((p) => p.id === id)) {
        removeNode(id);
        playSound('delete');
      } else if (blocks.some((b) => b.id === id)) {
        removeNode(id);
        playSound('delete');
      } else if (architecture.connections.some((c) => c.id === id)) {
        removeConnection(id);
        playSound('delete');
      }
    }
    clearSelection();
  };

  const handleValidate = () => {
    const result = validate();
    if (!showValidation) toggleValidation();
    else useUIStore.getState().openDrawer('validation');
    playSound(result.valid ? 'validation-success' : 'validation-error');
  };

  const handleProviderSwitch = async (newProvider: ProviderType) => {
    if (newProvider === activeProvider) return;

    const providerLabel = newProvider.toUpperCase();
    const confirmed = await confirmDialog(
      `This will create a new ${providerLabel} workspace. Your current workspace will be preserved.\n\nCreate ${providerLabel} workspace?`,
      `Switch to ${providerLabel}?`,
    );
    if (!confirmed) return;

    createWorkspace(`My ${providerLabel} Architecture`, newProvider);
    syncWorkspaceUI();
    toast.success(`Created new ${providerLabel} workspace`);
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
      syncWorkspaceUI();
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
        const error = importArchitecture(text, activeProvider);
        if (error) {
          toast.error(`Import failed: ${error}`);
        } else {
          clearWorkspaceDiffUI();
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
      clearWorkspaceDiffUI();
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
    const drawer = useUIStore.getState().drawer;
    const isLearningOpen = drawer.isOpen && drawer.activePanel === 'learning';

    if (isLearningOpen) {
      useUIStore.getState().closeDrawer();
      return;
    }

    if (!activeScenario) {
      useUIStore.getState().openDrawer('scenarios');
      return;
    }

    useUIStore.getState().openDrawer('learning');
  };

  return (
    <div className="menu-bar" role="menubar">
      {/* ── Logo menu (replaces hamburger) ──────── */}
      <div className="menu-dropdown-container">
        <button
          ref={logoTriggerRef}
          type="button"
          className="menu-bar-logo menu-trigger"
          data-active={openMenu === 'logo'}
          onClick={() => toggleMenu('logo')}
          onKeyDown={(event) => handleTriggerKeyDown('logo', event)}
          aria-haspopup="true"
          aria-expanded={openMenu === 'logo'}
          aria-label="Menu"
          title="Menu"
        >
          <LogoIcon size={16} />
        </button>
        <div
          ref={logoMenuRef}
          className={`menu-dropdown overflow-dropdown ${openMenu === 'logo' ? 'show' : ''}`}
          role="menu"
          onKeyDown={(event) => handleMenuKeyDown('logo', event)}
        >
          {/* File section */}
          <div className="menu-section-label" role="presentation">
            File
          </div>
          <button type="button" className="menu-item" onClick={() => handleAction(handleSave)}>
            <span className="menu-item-left">
              <Save size={14} /> Save Workspace
            </span>
            <span className="menu-shortcut">Ctrl+S</span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(handleLoad)}>
            <span className="menu-item-left">
              <FolderOpen size={14} /> Load Workspace
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(handleImport)}>
            <span className="menu-item-left">
              <FileDown size={14} /> Import JSON
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(handleExport)}>
            <span className="menu-item-left">
              <FileUp size={14} /> Export JSON
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(handleReset)}>
            <span className="menu-item-left">
              <RotateCcw size={14} /> Reset Workspace
            </span>
          </button>

          <hr className="menu-separator" />

          {/* Edit section */}
          <div className="menu-section-label" role="presentation">
            Edit
          </div>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(undo)}
            disabled={!canUndo}
          >
            <span className="menu-item-left">
              <Undo2 size={14} /> Undo
            </span>
            <span className="menu-shortcut">Ctrl+Z</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(redo)}
            disabled={!canRedo}
          >
            <span className="menu-item-left">
              <Redo2 size={14} /> Redo
            </span>
            <span className="menu-shortcut">Ctrl+Shift+Z</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(handleDeleteSelection)}
            disabled={selectedIds.size === 0 && !selectedId}
          >
            <span className="menu-item-left">
              <Trash2 size={14} /> Delete Selection
            </span>
            <span className="menu-shortcut">Del</span>
          </button>

          <hr className="menu-separator" />

          {/* Build section */}
          <div className="menu-section-label" role="presentation">
            Build
          </div>
          <button type="button" className="menu-item" onClick={() => handleAction(handleValidate)}>
            <span className="menu-item-left">
              <CheckCircle size={14} /> Validate Architecture
            </span>
            {validationResult && (
              <span
                className={`menu-badge ${validationResult.valid ? 'menu-badge-valid' : 'menu-badge-invalid'}`}
              >
                {validationResult.valid ? 'Valid' : 'Errors'}
              </span>
            )}
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(() => openInspectorTab('code'))}
          >
            <span className="menu-item-left">
              <Zap size={14} /> Generate Code
            </span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(() => openDrawer('templates'))}
          >
            <span className="menu-item-left">
              <Package size={14} /> Browse Templates
            </span>
          </button>
          {backendAvailable && (
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(togglePromoteDialog)}
              >
                <span className="menu-item-left">
                  <ArrowUpCircle size={14} /> Promote to Production
                </span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleRollbackDialog)}
              >
                <span className="menu-item-left">
                  <ArrowDownCircle size={14} /> Rollback Production
                </span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(togglePromoteHistory)}
              >
                <span className="menu-item-left">
                  <ClipboardList size={14} /> Promotion History
                </span>
              </button>
            </>
          )}

          <hr className="menu-separator" />

          {/* View section */}
          <div className="menu-section-label" role="presentation">
            View
          </div>
          <button type="button" className="menu-item" onClick={() => handleAction(toggleSidebar)}>
            <span className="menu-item-left">
              {sidebarOpen ? '✓ ' : '  '}
              <PanelLeft size={14} /> Sidebar
            </span>
            <span className="menu-shortcut">Ctrl+Alt+S</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(toggleResourceGuide)}
          >
            <span className="menu-item-left">
              {showResourceGuide ? '✓ ' : '  '}
              <BookMarked size={14} /> Resource Guide
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(toggleInspector)}>
            <span className="menu-item-left">
              {inspectorOpen ? '✓ ' : '  '}
              <Search size={14} /> Inspector
            </span>
            <span className="menu-shortcut">Ctrl+Alt+I</span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(handleToggleDiffMode)}
            disabled={!diffMode}
          >
            <span className="menu-item-left">
              {diffMode ? '✓ ' : ''}
              <GitCompare size={14} /> Diff View
            </span>
          </button>

          <hr className="menu-separator" />

          <div className="menu-section-label" role="presentation">
            Preferences
          </div>
          <button
            type="button"
            className="menu-item"
            onClick={() => handleAction(handleToggleSound)}
          >
            <span className="menu-item-left">
              {isSoundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
            </span>
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() =>
              handleAction(() =>
                setThemeVariant(themeVariant === 'blueprint' ? 'workshop' : 'blueprint'),
              )
            }
          >
            <span className="menu-item-left">
              {themeVariant === 'blueprint' ? <Moon size={14} /> : <Sun size={14} />}
              {themeVariant === 'blueprint'
                ? 'Switch to Workshop (Light)'
                : 'Switch to Blueprint (Dark)'}
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(cycleLabelMode)}>
            <span className="menu-item-left">
              <Type size={14} /> Labels:{' '}
              {labelModeOverride === 'auto'
                ? 'Auto'
                : labelModeOverride.charAt(0).toUpperCase() + labelModeOverride.slice(1)}
            </span>
          </button>
          <button type="button" className="menu-item" onClick={() => handleAction(cycleGridStyle)}>
            <span className="menu-item-left">
              <LayoutGrid size={14} /> Grid:{' '}
              {gridStyle.charAt(0).toUpperCase() + gridStyle.slice(1)}
            </span>
          </button>
        </div>
      </div>

      <div className="menu-bar-divider" />

      {/* ── Workspace pill ──────── */}
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

      {/* ── Provider pills ──────── */}
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
              data-provider={provider.id}
              onClick={() => handleProviderSwitch(provider.id)}
            >
              {provider.label}
            </button>
          );
        })}
      </div>

      <div className="menu-bar-divider" />

      <div className="core-actions">
        <button
          type="button"
          className="core-btn core-btn-learn"
          onClick={handleToggleLearningPanel}
          title={
            isLearningOpen
              ? 'Close learning panel'
              : activeScenario
                ? 'Resume current lesson'
                : 'Browse guided scenarios'
          }
          aria-label={
            isLearningOpen
              ? 'Close learning panel'
              : activeScenario
                ? 'Resume current lesson'
                : 'Browse guided scenarios'
          }
        >
          <GraduationCap size={14} />
          <span className="core-btn-label">Learn</span>
        </button>
        <button
          type="button"
          className="core-btn"
          onClick={() => openDrawer('templates')}
          title="Browse Templates"
        >
          <Package size={14} />
          <span className="core-btn-label">Templates</span>
        </button>
        <button
          type="button"
          className="core-btn"
          onClick={handleValidate}
          title="Validate Architecture"
          aria-label={
            validationResult && !validationResult.valid && validationResult.errors.length > 0
              ? `Validate architecture (${validationResult.errors.length > 9 ? '9 or more' : validationResult.errors.length} error${validationResult.errors.length === 1 ? '' : 's'})`
              : 'Validate architecture'
          }
        >
          <CheckCircle size={14} />
          <span className="core-btn-label">Validate</span>
          {validationResult && !validationResult.valid && validationResult.errors.length > 0 && (
            <span className="panel-btn-badge" aria-hidden="true">
              {validationResult.errors.length > 9 ? '9+' : validationResult.errors.length}
            </span>
          )}
        </button>
      </div>

      <div className="menu-bar-divider" />

      {/* ── Quick actions (pushed right) ──────── */}
      <div className="quick-actions">
        <button
          type="button"
          className="quick-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={handleSave}
          title="Save Workspace (Ctrl+S)"
        >
          <Save size={14} />
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard size={14} />
        </button>
      </div>

      <div className="menu-bar-divider" />

      {/* ── GitHub section ──────── */}
      <div className="github-section menu-dropdown-container">
        {isAuthenticated ? (
          <>
            <button
              ref={githubTriggerRef}
              type="button"
              className="github-btn"
              data-active={openMenu === 'github'}
              onClick={() => toggleMenu('github')}
              onKeyDown={(event) => handleTriggerKeyDown('github', event)}
              aria-haspopup="true"
              aria-expanded={openMenu === 'github'}
              title={user?.github_username ?? 'GitHub'}
              aria-label={`GitHub account${user?.github_username ? `: ${user.github_username}` : ''}`}
            >
              <GitHubIcon size={14} />
            </button>
            <div
              ref={githubMenuRef}
              className={`menu-dropdown right-aligned ${openMenu === 'github' ? 'show' : ''}`}
              role="menu"
              onKeyDown={(event) => handleMenuKeyDown('github', event)}
            >
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleGitHubRepos)}
              >
                <span className="menu-item-left">
                  <FolderGit2 size={14} /> Repos
                </span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleGitHubSync)}
                disabled={!hasBackendWorkspaceLink}
                title={
                  !hasBackendWorkspaceLink
                    ? 'Link workspace to backend to use GitHub sync.'
                    : undefined
                }
              >
                <span className="menu-item-left">
                  <RefreshCw size={14} /> Sync
                </span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(toggleGitHubPR)}
                disabled={!hasBackendWorkspaceLink}
                title={
                  !hasBackendWorkspaceLink
                    ? 'Link workspace to backend to create pull requests.'
                    : undefined
                }
              >
                <span className="menu-item-left">
                  <GitPullRequest size={14} /> Create PR
                </span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => handleAction(handleCompareWithGitHub)}
                disabled={!hasBackendWorkspaceLink}
                title={
                  !hasBackendWorkspaceLink
                    ? 'Link workspace to backend to compare with GitHub.'
                    : undefined
                }
              >
                <span className="menu-item-left">
                  <GitCompare size={14} /> Compare with GitHub
                </span>
              </button>
              <hr className="menu-separator" />
              <button
                type="button"
                className="menu-item"
                onClick={() =>
                  handleAction(async () => {
                    const nextBackendStatus = await logout();
                    if (nextBackendStatus !== 'available') {
                      setBackendStatus(nextBackendStatus);
                    }
                  })
                }
              >
                <span className="menu-item-left">
                  <LogOut size={14} /> Sign Out
                </span>
              </button>
            </div>
          </>
        ) : authStatus === 'unknown' || backendStatus === 'unknown' ? (
          <button
            type="button"
            className="github-btn"
            disabled
            title="Checking authentication..."
            aria-label="GitHub: checking authentication"
          >
            <GitHubIcon size={14} />
          </button>
        ) : !backendAvailable ? (
          <button
            type="button"
            className="github-btn"
            disabled
            title="Backend API required for GitHub features. Run the backend server to enable."
            aria-label="GitHub: backend required"
          >
            <GitHubIcon size={14} />
            <span className="github-btn-hint">API</span>
          </button>
        ) : (
          <button
            type="button"
            className="github-btn"
            onClick={toggleGitHubLogin}
            title="Sign in with GitHub"
            aria-label="Sign in with GitHub"
          >
            <GitHubIcon size={14} />
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
