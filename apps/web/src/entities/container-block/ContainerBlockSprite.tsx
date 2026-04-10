import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import {
  DEFAULT_CONTAINER_BLOCK_PROFILE,
  getContainerBlockProfile,
  isContainerBlockProfileId,
} from '../../shared/types/index';
import type { ContainerBlock, LayerType } from '@cloudblocks/schema';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getDiffState } from '../../shared/utils/diff';
import type { DiffDelta } from '../../shared/types/diff';
import { getContainerBlockIconUrl } from '../../shared/utils/iconResolver';
import { getContainerLabel } from '../../shared/utils/providerMapping';
import { screenDeltaToWorld, snapToGrid, worldSizeToScreen } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canPlaceBlock } from '../validation/placement';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';
import { ContainerBlockSvg } from './ContainerBlockSvg';
import './ContainerBlockSprite.css';
import { ResizeHandles } from './ResizeHandles';

interface PlateSpriteProps {
  containerId?: string;
  container?: ContainerBlock;
  screenX: number;
  screenY: number;
  zIndex: number;
  occupiedCells?: Set<string>;
}

export const ContainerBlockSprite = memo(function PlateSprite({
  containerId,
  container,
  screenX,
  screenY,
  zIndex,
  occupiedCells,
}: PlateSpriteProps) {
  type PlateLayer = Exclude<LayerType, 'resource'>;

  const resolvedContainerId = containerId ?? container?.id ?? null;
  const storeContainer = useArchitectureStore((state) => {
    if (!resolvedContainerId) return null;
    const node = state.nodeById.get(resolvedContainerId);
    return node?.kind === 'container' ? node : null;
  });
  const resolvedContainer = storeContainer ?? container ?? null;

  const isSelected = useUIStore((s) =>
    resolvedContainerId ? s.selectedIds.has(resolvedContainerId) : false,
  );
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toggleSelection = useUIStore((s) => s.toggleSelection);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const moveNodePosition = useArchitectureStore((s) => s.moveNodePosition);
  const isDragActive = draggedBlockCategory !== null;
  const isValidDropTarget =
    isDragActive && resolvedContainer
      ? canPlaceBlock(draggedBlockCategory, resolvedContainer)
      : false;
  const isInvalidDropTarget =
    isDragActive && resolvedContainer
      ? !canPlaceBlock(draggedBlockCategory, resolvedContainer)
      : false;
  const diffState =
    diffMode && diffDelta && resolvedContainerId
      ? getDiffState(resolvedContainerId, diffDelta)
      : 'unchanged';

  // ── Block status overlay (#1591) ──
  const containerStatus = useUIStore((s) =>
    resolvedContainerId ? s.blockStatuses.get(resolvedContainerId) : undefined,
  );
  const plateRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  useEffect(() => {
    const el = plateRef.current;
    if (!resolvedContainerId || containerStatus?.disabled || !el) {
      return;
    }

    const interactable = interact(el).draggable({
      listeners: {
        start() {
          isDragging.current = false;

          dragZoomRef.current = 1;
          const sceneWorld = plateRef.current?.closest('.scene-world') as HTMLElement | null;
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

          const imgEl = plateRef.current?.querySelector('.container-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          moveNodePosition(resolvedContainerId, dWorldX, dWorldZ);
        },
        end() {
          const imgEl = plateRef.current?.querySelector('.container-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.remove('is-dragging');

          if (isDragging.current) {
            const droppingEl = plateRef.current?.querySelector(
              '.container-img',
            ) as HTMLElement | null;
            if (droppingEl) {
              droppingEl.classList.add('is-dropping');
              const handleAnimEnd = () => {
                droppingEl.classList.remove('is-dropping');
                droppingEl.removeEventListener('animationend', handleAnimEnd);
              };
              droppingEl.addEventListener('animationend', handleAnimEnd);
            }
          }

          if (isDragging.current) {
            const currentNode = useArchitectureStore.getState().nodeById.get(resolvedContainerId);
            const currentPlate = currentNode?.kind === 'container' ? currentNode : null;

            if (currentPlate) {
              const snappedPosition = snapToGrid(currentPlate.position.x, currentPlate.position.z);
              const deltaX = snappedPosition.x - currentPlate.position.x;
              const deltaZ = snappedPosition.z - currentPlate.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                moveNodePosition(resolvedContainerId, deltaX, deltaZ);

                const { isSoundMuted } = useUIStore.getState();
                if (!isSoundMuted) {
                  audioService.playSound('block-snap');
                }
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
      el.querySelector('.container-img')?.classList.remove('is-dragging');
      el.querySelector('.container-img')?.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [containerStatus?.disabled, moveNodePosition, resolvedContainerId]);

  const handleClick = (e: React.MouseEvent) => {
    if (!resolvedContainer || !resolvedContainerId) return;
    if (containerStatus?.disabled) return;
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();
    if (e.shiftKey) {
      toggleSelection(resolvedContainerId);
    } else {
      setSelectedId(resolvedContainerId);
    }
  };

  if (!resolvedContainer || !resolvedContainerId) {
    return null;
  }

  const containerLayer = resolvedContainer.layer as PlateLayer;
  const sizeClass = containerLayer === 'subnet' ? 'container-subnet' : 'container-network';

  const profile =
    resolvedContainer.profileId && isContainerBlockProfileId(resolvedContainer.profileId)
      ? getContainerBlockProfile(resolvedContainer.profileId)
      : getContainerBlockProfile(DEFAULT_CONTAINER_BLOCK_PROFILE[containerLayer]);
  const plateColorInput = { type: containerLayer, provider: activeProvider };
  const faceColors = getContainerBlockFaceColors(plateColorInput);
  const typeLabel =
    getContainerLabel(containerLayer, activeProvider) ??
    (containerLayer === 'global'
      ? 'Global Layer'
      : containerLayer === 'edge'
        ? 'Edge Layer'
        : containerLayer === 'zone'
          ? 'Zone Layer'
          : 'Region Layer');
  const label = resolvedContainer.name || typeLabel;
  const iconUrl = getContainerBlockIconUrl(containerLayer, activeProvider);

  if (!resolvedContainer.frame) return null;

  const { screenWidth, screenHeight } = worldSizeToScreen(
    resolvedContainer.frame.width,
    resolvedContainer.frame.height,
    resolvedContainer.frame.depth,
  );

  const className = [
    'container-sprite',
    sizeClass,
    isSelected && 'is-selected',
    isValidDropTarget && 'is-drop-target',
    isInvalidDropTarget && 'is-drop-target-invalid',
    diffState === 'added' && 'diff-added',
    diffState === 'modified' && 'diff-modified',
    diffState === 'removed' && 'diff-removed',
    // ── Block status overlay (#1591) ── priority: disabled > error ──
    containerStatus?.disabled && 'is-disabled',
    !containerStatus?.disabled && containerStatus?.error && 'is-error',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={plateRef}
      className={className}
      data-container-id={resolvedContainer.id}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        className="container-button"
        disabled={!!containerStatus?.disabled}
        aria-disabled={!!containerStatus?.disabled || undefined}
        aria-label={`Container: ${resolvedContainer.name}`}
        style={{
          left: `${-screenWidth / 2}px`,
          top: `${-screenHeight / 2}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
        }}
      >
        <div className="container-img" aria-hidden="true">
          <ContainerBlockSvg
            containerLayer={containerLayer}
            unitsX={resolvedContainer.frame ? resolvedContainer.frame.width : profile.unitsX}
            unitsY={resolvedContainer.frame ? resolvedContainer.frame.depth : profile.unitsY}
            worldHeight={
              resolvedContainer.frame ? resolvedContainer.frame.height : profile.worldHeight
            }
            topFaceColor={faceColors.topFaceColor}
            topFaceStroke={faceColors.topFaceStroke}
            leftSideColor={faceColors.leftSideColor}
            rightSideColor={faceColors.rightSideColor}
            label={label}
            iconUrl={iconUrl}
            provider={activeProvider}
            occupiedCells={occupiedCells}
          />
        </div>
      </button>
      {isSelected && <span className="container-label-chip">{label}</span>}
      {isSelected && !containerStatus?.disabled && resolvedContainer.frame && (
        <ResizeHandles
          containerId={resolvedContainer.id}
          frameWidth={resolvedContainer.frame.width}
          frameDepth={resolvedContainer.frame.depth}
          frameHeight={resolvedContainer.frame.height}
          containerLayer={resolvedContainer.layer}
        />
      )}
    </div>
  );
});
