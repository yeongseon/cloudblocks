import { describe, it, expect, afterEach, beforeEach, vi, type Mock } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { DragGhost } from './DragGhost';
import { useUIStore } from '../../entities/store/uiStore';

function createContainerRef() {
  const viewport = document.createElement('div');
  viewport.getBoundingClientRect = (() => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    toJSON: () => ({}),
  })) as Mock;

  return {
    current: viewport,
  };
}

function renderDragGhost() {
  return render(
    <svg>
      <title>Drag ghost test root</title>
      <DragGhost
        containerRef={createContainerRef()}
        originX={640}
        originY={280}
        panX={0}
        panY={0}
        zoom={1}
      />
    </svg>
  );
}

describe('DragGhost', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(16);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useUIStore.setState({
      draggedBlockCategory: null,
      draggedResourceName: null,
      interactionState: 'idle',
    });
  });

  it('renders nothing when interaction state is idle', () => {
    const { container } = renderDragGhost();
    expect(container.querySelector('g.drag-ghost')).toBeNull();
  });

  it('renders SVG ghost polygons when placement is active', () => {
    useUIStore.setState({
      draggedBlockCategory: 'compute',
      draggedResourceName: 'Virtual Machine',
      interactionState: 'placing',
    });
    const { container } = renderDragGhost();

    fireEvent.pointerMove(document, { clientX: 700, clientY: 320 });

    const ghost = container.querySelector('g.drag-ghost');
    expect(ghost).not.toBeNull();
    expect(ghost?.querySelectorAll('polygon')).toHaveLength(3);
  });

  it('renders nothing after drag is cancelled', () => {
    useUIStore.setState({
      draggedBlockCategory: 'compute',
      draggedResourceName: 'Virtual Machine',
      interactionState: 'placing',
    });
    const { container, rerender } = renderDragGhost();
    fireEvent.pointerMove(document, { clientX: 700, clientY: 320 });
    expect(container.querySelector('g.drag-ghost')).not.toBeNull();

    useUIStore.getState().cancelInteraction();
    rerender(
      <svg>
        <title>Drag ghost test root</title>
        <DragGhost
          containerRef={createContainerRef()}
          originX={640}
          originY={280}
          panX={0}
          panY={0}
          zoom={1}
        />
      </svg>
    );

    expect(container.querySelector('g.drag-ghost')).toBeNull();
  });

  it('renders when placing is activated through uiStore action', () => {
    useUIStore.getState().startPlacing('compute', 'Virtual Machine');
    const { container } = renderDragGhost();

    fireEvent.pointerMove(document, { clientX: 720, clientY: 340 });

    expect(container.querySelector('g.drag-ghost')).not.toBeNull();
  });

  it('does not render when interaction returns to idle through completeInteraction', () => {
    useUIStore.getState().startPlacing('compute', 'Virtual Machine');
    const { container, rerender } = renderDragGhost();

    fireEvent.pointerMove(document, { clientX: 720, clientY: 340 });
    expect(container.querySelector('g.drag-ghost')).not.toBeNull();

    useUIStore.getState().completeInteraction();
    rerender(
      <svg>
        <title>Drag ghost test root</title>
        <DragGhost
          containerRef={createContainerRef()}
          originX={640}
          originY={280}
          panX={0}
          panY={0}
          zoom={1}
        />
      </svg>
    );

    expect(container.querySelector('g.drag-ghost')).toBeNull();
  });
});
