import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import {
  DEFAULT_PLATE_PROFILE,
  getPlateProfile,
  getPlateStudColors,
  type Plate,
} from '../../shared/types/index';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { screenDeltaToWorld, snapToGrid, worldSizeToScreen } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canPlaceBlock } from '../validation/placement';
import { getPlateFaceColors } from './plateFaceColors';
import { PlateSvg } from './PlateSvg';
import './PlateSprite.css';

interface PlateSpriteProps {
  plate: Plate;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const PlateSprite = memo(function PlateSprite({
  plate,
  screenX,
  screenY,
  zIndex,
}: PlateSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const movePlatePosition = useArchitectureStore((s) => s.movePlatePosition);
  const isSelected = selectedId === plate.id;
  const isDragActive = draggedBlockCategory !== null;
  const isValidDropTarget = isDragActive && canPlaceBlock(draggedBlockCategory, plate);
  const isInvalidDropTarget = isDragActive && !canPlaceBlock(draggedBlockCategory, plate);
  const diffState = diffMode && diffDelta ? getDiffState(plate.id, diffDelta) : 'unchanged';
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

          const imgEl = plateRef.current?.querySelector('.plate-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          movePlatePosition(plate.id, dWorldX, dWorldZ);
        },
        end() {
          const imgEl = plateRef.current?.querySelector('.plate-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.remove('is-dragging');

          if (isDragging.current) {
            const droppingEl = plateRef.current?.querySelector('.plate-img') as HTMLElement | null;
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
              .workspace
              .architecture
              .plates
              .find((candidate) => candidate.id === plate.id);

            if (currentPlate) {
              const snappedPosition = snapToGrid(currentPlate.position.x, currentPlate.position.z);
              const deltaX = snappedPosition.x - currentPlate.position.x;
              const deltaZ = snappedPosition.z - currentPlate.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                movePlatePosition(plate.id, deltaX, deltaZ);

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
      el.querySelector('.plate-img')?.classList.remove('is-dragging');
      el.querySelector('.plate-img')?.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [plate.id, movePlatePosition]);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();
    setSelectedId(plate.id);
  };

  const sizeClass = plate.type === 'subnet' ? 'plate-subnet' : 'plate-network';

  const profile = plate.profileId
    ? getPlateProfile(plate.profileId)
    : getPlateProfile(DEFAULT_PLATE_PROFILE[plate.type]);
  const studColors = getPlateStudColors(plate);
  const faceColors = getPlateFaceColors(plate);
  const label = plate.type === 'subnet'
    ? plate.subnetAccess === 'public'
      ? 'Public Subnet'
      : 'Private Subnet'
    : plate.type === 'global'
      ? 'Global Layer'
      : plate.type === 'edge'
        ? 'Edge Layer'
        : plate.type === 'zone'
          ? 'Zone Layer'
          : 'Region Layer';
  const emoji = plate.type === 'subnet'
    ? plate.subnetAccess === 'public'
      ? '🔓'
      : '🔒'
    : plate.type === 'global'
      ? '🌎'
      : plate.type === 'edge'
        ? '🛰️'
        : plate.type === 'zone'
          ? '🧭'
          : '🌐';

  const { screenWidth, screenHeight } = worldSizeToScreen(plate.size.width, plate.size.height, plate.size.depth);

  const className = [
    'plate-sprite',
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
      data-plate-id={plate.id}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        className="plate-button"
        aria-label={`Plate: ${plate.name}`}
        style={{
          left: `${-screenWidth / 2}px`,
          top: `${-screenHeight / 2}px`,
          width: `${screenWidth}px`,
          height: `${screenHeight}px`,
        }}
      >
        <div className="plate-img" aria-hidden="true">
          <PlateSvg
            plateType={plate.type}
            studsX={profile.studsX}
            studsY={profile.studsY}
            worldHeight={profile.worldHeight}
            studColors={studColors}
            topFaceColor={faceColors.topFaceColor}
            topFaceStroke={faceColors.topFaceStroke}
            leftSideColor={faceColors.leftSideColor}
            rightSideColor={faceColors.rightSideColor}
            label={label}
            emoji={emoji}
          />
        </div>
      </button>
    </div>
  );
});
