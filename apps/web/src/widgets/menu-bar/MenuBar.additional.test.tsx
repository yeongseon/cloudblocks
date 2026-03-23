import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

function getOverflowDropdown(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Menu' });
  const container = trigger.closest('.menu-dropdown-container') as HTMLElement;
  return container.querySelector('.menu-dropdown') as HTMLElement;
}

async function openOverflow(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  return getOverflowDropdown();
}

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
    const architectureWithAwsBlock: ArchitectureModel = {
      ...baseArchitecture,
      nodes: [
        {
          id: 'block-1',
          name: 'VM',
          kind: 'resource',
          layer: 'resource',
          resourceType: 'web_compute',
          category: 'compute',
          provider: 'aws',
          parentId: null,
          position: { x: 0, y: 0, z: 0 },
          metadata: {},
        },
      ],
    };

    useArchitectureStore.setState({
      workspace: {
        ...useArchitectureStore.getState().workspace,
        architecture: architectureWithAwsBlock,
      },
    });
    useUIStore.setState({ activeProvider: 'aws' });

    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(<MenuBar />);

    await user.click(screen.getByRole('tab', { name: /^azure$/i }));
    expect(confirmDialog).toHaveBeenCalledOnce();
    expect(useUIStore.getState().activeProvider).toBe('aws');

    await user.click(screen.getByRole('tab', { name: /^azure$/i }));
    expect(confirmDialog).toHaveBeenCalledTimes(2);
    expect(useUIStore.getState().activeProvider).toBe('azure');
  });

  it('toggles validation drawer via panel button', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    await user.click(screen.getByTitle('Validation'));
    expect(useUIStore.getState().drawer.activePanel).toBe('validation');
    expect(useUIStore.getState().drawer.isOpen).toBe(true);

    await user.click(screen.getByTitle('Validation'));
    expect(useUIStore.getState().drawer.isOpen).toBe(false);
  });

  it('opens scenario gallery from learning panel action when no active scenario exists', async () => {
    const user = userEvent.setup();
    render(<MenuBar />);

    const dropdown = await openOverflow();
    await user.click(within(dropdown).getByRole('button', { name: /Show Learning Panel/ }));

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
