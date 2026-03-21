import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import { DEFAULT_PLATE_PROFILE, getPlateProfile, getPlateStudColors, isPlateProfileId } from '../../shared/types/index';
import type { ContainerNode, LayerType } from '@cloudblocks/schema';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { getPlateIconUrl } from '../../shared/utils/iconResolver';
import { screenDeltaToWorld, snapToGrid, worldSizeToScreen } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canPlaceBlock } from '../validation/placement';
import { getPlateFaceColors } from './plateFaceColors';
import { PlateSvg } from './PlateSvg';
import './PlateSprite.css';

interface PlateSpriteProps {
  plate: ContainerNode;
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
  type PlateLayer = Exclude<LayerType, 'resource'>;

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
              .nodes
              .filter((node): node is ContainerNode => node.kind === 'container')
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

  const plateType = plate.layer as PlateLayer;
  const sizeClass = plateType === 'subnet' ? 'plate-subnet' : 'plate-network';

  const profile = plate.profileId && isPlateProfileId(plate.profileId)
    ? getPlateProfile(plate.profileId)
    : getPlateProfile(DEFAULT_PLATE_PROFILE[plateType]);
  const plateColorInput = { type: plateType, subnetAccess: plate.subnetAccess };
  const studColors = getPlateStudColors(plateColorInput);
  const faceColors = getPlateFaceColors(plateColorInput);
  const typeLabel = plateType === 'subnet'
    ? plate.subnetAccess === 'public'
      ? 'Public Subnet'
      : 'Private Subnet'
    : plateType === 'global'
      ? 'Global Layer'
      : plateType === 'edge'
        ? 'Edge Layer'
        : plateType === 'zone'
          ? 'Zone Layer'
          : 'Region Layer';
  const label = plate.name || typeLabel;
  const iconUrl = getPlateIconUrl(plateType, plate.subnetAccess);

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
            plateType={plateType}
            studsX={profile.studsX}
            studsY={profile.studsY}
            worldHeight={profile.worldHeight}
            studColors={studColors}
            topFaceColor={faceColors.topFaceColor}
            topFaceStroke={faceColors.topFaceStroke}
            leftSideColor={faceColors.leftSideColor}
            rightSideColor={faceColors.rightSideColor}
            label={label}
            iconUrl={iconUrl}
          />
        </div>
      </button>
    </div>
  );
});
