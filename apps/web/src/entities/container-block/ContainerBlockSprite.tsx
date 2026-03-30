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
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { getContainerBlockIconUrl } from '../../shared/utils/iconResolver';
import { getContainerLabel } from '../../shared/utils/providerMapping';
import { screenDeltaToWorld, snapToGrid, worldSizeToScreen } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canPlaceBlock } from '../validation/placement';
import { getContainerBlockFaceColors } from './containerBlockFaceColors';
import { ContainerBlockSvg } from './ContainerBlockSvg';
import './ContainerBlockSprite.css';

interface PlateSpriteProps {
  container: ContainerBlock;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const ContainerBlockSprite = memo(function PlateSprite({
  container,
  screenX,
  screenY,
  zIndex,
}: PlateSpriteProps) {
  type PlateLayer = Exclude<LayerType, 'resource'>;

  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const moveNodePosition = useArchitectureStore((s) => s.moveNodePosition);
  const isSelected = selectedId === container.id;
  const isDragActive = draggedBlockCategory !== null;
  const isValidDropTarget = isDragActive && canPlaceBlock(draggedBlockCategory, container);
  const isInvalidDropTarget = isDragActive && !canPlaceBlock(draggedBlockCategory, container);
  const diffState = diffMode && diffDelta ? getDiffState(container.id, diffDelta) : 'unchanged';
  const plateRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  useEffect(() => {
    const el = plateRef.current;
    if (!el) {
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

          moveNodePosition(container.id, dWorldX, dWorldZ);
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
            const currentPlate = useArchitectureStore
              .getState()
              .workspace.architecture.nodes.filter(
                (node): node is ContainerBlock => node.kind === 'container',
              )
              .find((candidate) => candidate.id === container.id);

            if (currentPlate) {
              const snappedPosition = snapToGrid(currentPlate.position.x, currentPlate.position.z);
              const deltaX = snappedPosition.x - currentPlate.position.x;
              const deltaZ = snappedPosition.z - currentPlate.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                moveNodePosition(container.id, deltaX, deltaZ);

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
  }, [container.id, moveNodePosition]);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();
    setSelectedId(container.id);
  };

  const containerLayer = container.layer as PlateLayer;
  const sizeClass = containerLayer === 'subnet' ? 'container-subnet' : 'container-network';

  const profile =
    container.profileId && isContainerBlockProfileId(container.profileId)
      ? getContainerBlockProfile(container.profileId)
      : getContainerBlockProfile(DEFAULT_CONTAINER_BLOCK_PROFILE[containerLayer]);
  const activeProvider = useUIStore((s) => s.activeProvider);
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
  const label = container.name || typeLabel;
  const iconUrl = getContainerBlockIconUrl(containerLayer, activeProvider);

  if (!container.frame) return null;

  const { screenWidth, screenHeight } = worldSizeToScreen(
    container.frame.width,
    container.frame.height,
    container.frame.depth,
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
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={plateRef}
      className={className}
      data-container-id={container.id}
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
        aria-label={`Container: ${container.name}`}
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
            unitsX={profile.unitsX}
            unitsY={profile.unitsY}
            worldHeight={profile.worldHeight}
            topFaceColor={faceColors.topFaceColor}
            topFaceStroke={faceColors.topFaceStroke}
            leftSideColor={faceColors.leftSideColor}
            rightSideColor={faceColors.rightSideColor}
            label={label}
            iconUrl={iconUrl}
            provider={activeProvider}
          />
        </div>
      </button>
      {isSelected && <span className="container-label-chip">{label}</span>}
    </div>
  );
});
