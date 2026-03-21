import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import type { CloudProvider } from './minifigureFaceColors';
import { MinifigureSvg } from './MinifigureSvg';
import { useUIStore } from '../store/uiStore';
import { useWorkerStore, BUILD_DURATION_MS } from '../store/workerStore';
import { screenDeltaToWorld, snapToGrid } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import './MinifigureSprite.css';

interface MinifigureSpriteProps {
  provider: CloudProvider;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const MinifigureSprite = memo(function MinifigureSprite({
  provider,
  screenX,
  screenY,
  zIndex,
}: MinifigureSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const workerState = useWorkerStore((s) => s.workerState);
  const setWorkerPosition = useWorkerStore((s) => s.setWorkerPosition);
  const spriteRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  const workerId = 'worker-default';
  const isSelected = selectedId === workerId;

  useEffect(() => {
    const el = spriteRef.current;
    if (toolMode === 'delete' || !el) {
      return;
    }

    const interactable = interact(el).draggable({
      listeners: {
        start(event) {
          isDragging.current = false;
          dragZoomRef.current = 1;

          const sceneWorld = event.target.closest('.scene-world') as HTMLElement | null;
          if (sceneWorld) {
            const transform = sceneWorld.style.transform;
            const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
            if (scaleMatch?.[1]) {
              const parsedZoom = Number.parseFloat(scaleMatch[1]);
              if (Number.isFinite(parsedZoom) && parsedZoom > 0) {
                dragZoomRef.current = parsedZoom;
              }
            }
          }
        },
        move(event) {
          isDragging.current = true;
          el.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);
          const [currentX, currentY, currentZ] = useWorkerStore.getState().workerPosition;

          setWorkerPosition([currentX + dWorldX, currentY, currentZ + dWorldZ]);
        },
        end() {
          el.classList.remove('is-dragging');

          if (isDragging.current) {
            el.classList.add('is-dropping');
            const handleAnimEnd = () => {
              el.classList.remove('is-dropping');
              el.removeEventListener('animationend', handleAnimEnd);
            };
            el.addEventListener('animationend', handleAnimEnd);

            const [currentX, currentY, currentZ] = useWorkerStore.getState().workerPosition;
            const snappedPosition = snapToGrid(currentX, currentZ);

            if (snappedPosition.x !== currentX || snappedPosition.z !== currentZ) {
              setWorkerPosition([snappedPosition.x, currentY, snappedPosition.z]);

              const { isSoundMuted } = useUIStore.getState();
              if (!isSoundMuted) {
                audioService.playSound('block-snap');
              }
            }
          }

          if (dragResetTimerRef.current) {
            clearTimeout(dragResetTimerRef.current);
          }
          dragResetTimerRef.current = setTimeout(() => {
            isDragging.current = false;
          }, 50);
        },
      },
      autoScroll: false,
    });

    return () => {
      if (dragResetTimerRef.current) {
        clearTimeout(dragResetTimerRef.current);
      }
      el.classList.remove('is-dragging');
      el.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [setWorkerPosition, toolMode]);

  // Transition-end listener: when CSS left/top transition finishes and worker is
  // moving toward an active build target, switch state to 'building'.
  useEffect(() => {
    const el = spriteRef.current;
    if (!el) return;

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'left' && e.propertyName !== 'top') return;

      const { workerState: currentState, activeBuild } = useWorkerStore.getState();
      if (currentState === 'moving' && activeBuild) {
        useWorkerStore.setState({ workerState: 'building' });
        const { isSoundMuted } = useUIStore.getState();
        if (!isSoundMuted) {
          audioService.playSound('block-snap');
        }
      }
    };

    el.addEventListener('transitionend', onTransitionEnd);
    return () => el.removeEventListener('transitionend', onTransitionEnd);
  }, []);

  // Building timer: when workerState becomes 'building', wait BUILD_DURATION_MS
  // then call completeBuild() to process the next queued task or return to idle.
  useEffect(() => {
    if (workerState !== 'building') return;

    const timer = setTimeout(() => {
      useWorkerStore.getState().completeBuild();
    }, BUILD_DURATION_MS);

    return () => clearTimeout(timer);
  }, [workerState]);

  const handleClick = (e: React.PointerEvent) => {
    if (isDragging.current) {
      return;
    }

    e.stopPropagation();
    if (toolMode === 'delete') return;
    if (toolMode === 'connect') return;
    setSelectedId(workerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (toolMode === 'delete') return;
      if (toolMode === 'connect') return;
      setSelectedId(workerId);
    }
  };

  const isDisabled = toolMode === 'delete' || toolMode === 'connect';
  const className = ['minifigure-sprite', isSelected && 'is-selected', `is-${workerState}`]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={spriteRef}
      className={className}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label="Select worker"
      aria-disabled={isDisabled || undefined}
      onPointerUp={handleClick}
      onKeyDown={handleKeyDown}
      style={{ left: screenX, top: screenY, zIndex }}
    >
      <MinifigureSvg provider={provider} />
    </div>
  );
});
