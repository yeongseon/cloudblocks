import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArchitectureModel } from '@cloudblocks/schema';
import { MenuBar } from './MenuBar';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { useAuthStore } from '../../entities/store/authStore';
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../shared/ui/ConfirmDialog', () => ({
  confirmDialog: vi.fn(),
}));

const baseArchitecture: ArchitectureModel = {
  id: 'arch-1',
  name: 'MenuBar Test',
  version: '1.0.0',
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('MenuBar additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useUIStore.setState({
      activeProvider: 'azure',
      backendStatus: 'available',
      selectedId: null,
      showValidation: false,
      showResourceGuide: false,
      showLearningPanel: false,
      drawer: { isOpen: false, activePanel: null },
      sidebar: { isOpen: true },
      inspector: { isOpen: true, activeTab: 'properties' },
      themeVariant: 'workshop',
    });

    useAuthStore.setState({
      status: 'anonymous',
      user: null,
      hydrated: true,
      error: null,
    });

    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Workspace',
        provider: 'azure' as const,
        architecture: baseArchitecture,
        createdAt: '',
        updatedAt: '',
      },
      validate: vi.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
      saveToStorage: vi.fn().mockReturnValue(true),
      loadFromStorage: vi.fn(),
      resetWorkspace: vi.fn(),
      removeNode: vi.fn(),
      removeConnection: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      importArchitecture: vi.fn(),
      canUndo: false,
      canRedo: false,
      validationResult: null,
    });
  });

  it('handles provider switch confirmation cancel and confirm branches', async () => {
    const user = userEvent.setup();

    useUIStore.setState({ activeProvider: 'aws' });

    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(<MenuBar />);

    // First click: cancel → stays on AWS
    await user.click(screen.getByRole('tab', { name: /^azure$/i }));
    expect(confirmDialog).toHaveBeenCalledOnce();
    expect(useUIStore.getState().activeProvider).toBe('aws');

    // Second click: confirm → creates new Azure workspace, switches provider
    await user.click(screen.getByRole('tab', { name: /^azure$/i }));
    expect(confirmDialog).toHaveBeenCalledTimes(2);
    expect(useUIStore.getState().activeProvider).toBe('azure');
  });

  it('opens validation drawer via Validate core button (idempotent)', async () => {
    const user = userEvent.setup();
    // showValidation=true so handleValidate uses openDrawer (not toggleDrawer)
    useUIStore.setState({ showValidation: true });
    render(<MenuBar />);

    await user.click(screen.getByTitle('Validate Architecture'));
    expect(useUIStore.getState().drawer.activePanel).toBe('validation');
    expect(useUIStore.getState().drawer.isOpen).toBe(true);

    // Clicking again keeps the drawer open (validate always shows results)
    await user.click(screen.getByTitle('Validate Architecture'));
    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('validation');
  });

  it('opens scenario gallery from Learn button when no active scenario exists', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByTitle('Browse guided scenarios'));

    expect(useUIStore.getState().drawer.isOpen).toBe(true);
    expect(useUIStore.getState().drawer.activePanel).toBe('scenarios');
    expect(useUIStore.getState().showLearningPanel).toBe(false);
  });

  it('handles import failure and file reader error branches', () => {
    const importArchitecture = vi.fn().mockReturnValue('bad schema');
    useArchitectureStore.setState({ importArchitecture });

    render(<MenuBar />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"bad":true}'], 'bad.json', { type: 'application/json' });

    const callbacks: {
      onload: ((ev: ProgressEvent<FileReader>) => void) | null;
      onerror: (() => void) | null;
    } = { onload: null, onerror: null };

    class MockFileReader {
      set onload(handler: ((ev: ProgressEvent<FileReader>) => void) | null) {
        callbacks.onload = handler;
      }
      set onerror(handler: (() => void) | null) {
        callbacks.onerror = handler;
      }
      readAsText() {}
    }

    const original = window.FileReader;
    vi.stubGlobal('FileReader', MockFileReader);

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    callbacks.onload?.({ target: { result: '{"bad":true}' } } as ProgressEvent<FileReader>);
    callbacks.onerror?.();

    expect(importArchitecture).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Import failed: bad schema');
    expect(toast.error).toHaveBeenCalledWith('Failed to read file.');

    vi.stubGlobal('FileReader', original);
  });
});
