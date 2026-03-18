import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SceneCanvas } from './SceneCanvas';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';

vi.mock('../../entities/store/architectureStore');
vi.mock('../../entities/store/uiStore');
vi.mock('../../shared/utils/audioService', () => ({
  audioService: { playSound: vi.fn() },
}));
vi.mock('../../entities/plate/PlateSprite', () => ({ PlateSprite: () => null }));
vi.mock('../../entities/block/BlockSprite', () => ({ BlockSprite: () => null }));
vi.mock('../../entities/connection/ConnectionPath', () => ({ ConnectionPath: () => null }));
vi.mock('../../entities/connection/ExternalActorSprite', () => ({ ExternalActorSprite: () => null }));
vi.mock('../../entities/character', () => ({ MinifigureSvg: () => null }));
vi.mock('./EmptyCanvasOverlay', () => ({ EmptyCanvasOverlay: () => null }));
vi.mock('./DragGhost', () => ({ DragGhost: () => null }));
vi.mock('./ConnectionPreview', () => ({ ConnectionPreview: () => null }));

const mockSetSelectedId = vi.fn();
const mockAddBlock = vi.fn();
const mockCompleteInteraction = vi.fn();

const architecture = {
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
};

function setupStoreMocks() {
  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = {
      workspace: { architecture },
      addBlock: mockAddBlock,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);

  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      setSelectedId: mockSetSelectedId,
      interactionState: 'idle' as const,
      draggedBlockCategory: null,
      draggedResourceName: null,
      activeProvider: 'aws',
      completeInteraction: mockCompleteInteraction,
      isSoundMuted: true,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useUIStore);
}

describe('SceneCanvas pointer capture handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMocks();
  });

  it('does not release pointer capture when container does not own it', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    const hasPointerCaptureMock = vi.fn().mockReturnValue(false);
    const releasePointerCaptureMock = vi.fn();

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCaptureMock,
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });

    fireEvent.pointerUp(viewport, { pointerId: 42, clientX: 10, clientY: 10 });

    expect(releasePointerCaptureMock).not.toHaveBeenCalled();
  });

  it('releases pointer capture when container owns it', () => {
    const { container } = render(<SceneCanvas />);
    const viewport = container.querySelector('.scene-viewport') as HTMLDivElement;

    const hasPointerCaptureMock = vi.fn().mockReturnValue(true);
    const releasePointerCaptureMock = vi.fn();

    Object.defineProperty(viewport, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCaptureMock,
    });
    Object.defineProperty(viewport, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });

    fireEvent.pointerUp(viewport, { pointerId: 7, clientX: 10, clientY: 10 });

    expect(releasePointerCaptureMock).toHaveBeenCalledWith(7);
  });
});
