import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import { useArchitectureStore } from '../store/architectureStore';
import { useUIStore } from '../store/uiStore';
import { canConnect } from '../validation/connection';
import type { ExternalActor, ResourceBlock } from '@cloudblocks/schema';
import { screenDeltaToWorld, snapToGrid } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import './ExternalActorSprite.css';

const ACTOR_SPRITES: Record<string, string> = {
  internet: '/actor-sprites/internet.svg',
  browser: '/actor-sprites/browser.svg',
};

interface ExternalActorSpriteProps {
  actor: ExternalActor;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const ExternalActorSprite = memo(function ExternalActorSprite({
  actor,
  screenX,
  screenY,
  zIndex,
}: ExternalActorSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const startConnecting = useUIStore((s) => s.startConnecting);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const moveNodePosition = useArchitectureStore((s) => s.moveNodePosition);
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const blocks = nodes.filter((node): node is ResourceBlock => node.kind === 'resource');
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors) ?? [];
  const actorRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  const isSelected = selectedId === actor.id;
  const isConnectionSource = connectionSource === actor.id;

  const isConnectMode = toolMode === 'connect';
  const sourceBlock =
    isConnectMode && connectionSource
      ? blocks.find((block) => block.id === connectionSource)
      : null;
  const sourceActor =
    isConnectMode && connectionSource
      ? externalActors.find((externalActor) => externalActor.id === connectionSource)
      : null;
  const sourceType = sourceBlock?.category ?? sourceActor?.type ?? null;
  const isValidConnectTarget =
    sourceType !== null && actor.id !== connectionSource && canConnect(sourceType, actor.type);
  const isInvalidConnectTarget =
    isConnectMode &&
    connectionSource !== null &&
    actor.id !== connectionSource &&
    !isValidConnectTarget;

  useEffect(() => {
    const el = actorRef.current;
    if (toolMode === 'delete' || toolMode === 'connect' || !el) {
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

          moveNodePosition(actor.id, dWorldX, dWorldZ);
        },
        end() {
          el.classList.remove('is-dragging');

          if (isDragging.current) {
            el.classList.add('is-dropping');
            const actorImage = el.querySelector('.actor-img') as HTMLElement | null;
            if (actorImage) {
              const handleAnimEnd = () => {
                el.classList.remove('is-dropping');
                actorImage.removeEventListener('animationend', handleAnimEnd);
              };
              actorImage.addEventListener('animationend', handleAnimEnd);
            }
          }

          if (isDragging.current) {
            const currentActor =
              useArchitectureStore.getState().workspace.architecture.externalActors;
            const matchedActor = (currentActor ?? []).find(
              (candidate) => candidate.id === actor.id,
            );

            if (matchedActor) {
              const snappedPosition = snapToGrid(matchedActor.position.x, matchedActor.position.z);
              const deltaX = snappedPosition.x - matchedActor.position.x;
              const deltaZ = snappedPosition.z - matchedActor.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                moveNodePosition(actor.id, deltaX, deltaZ);

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
      el.classList.remove('is-dragging');
      el.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [actor.id, moveNodePosition, toolMode]);

  const handleActivate = () => {
    if (isDragging.current) {
      return;
    }

    if (toolMode === 'delete') {
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        startConnecting(actor.id);
      } else if (connectionSource !== actor.id) {
        addConnection(connectionSource, actor.id);
        completeInteraction();
      }
      return;
    }

    setSelectedId(actor.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      return;
    }

    e.stopPropagation();
    handleActivate();
  };

  const className = [
    'external-actor-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isValidConnectTarget && 'is-valid-connect-target',
    isInvalidConnectTarget && 'is-invalid-connect-target',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={actorRef}
      className={className}
      style={{
        left: screenX,
        top: screenY,
        zIndex,
      }}
    >
      <button type="button" className="external-actor-button" onClick={handleClick}>
        <img
          className="actor-img"
          src={ACTOR_SPRITES[actor.type] ?? ACTOR_SPRITES.internet}
          alt={actor.name}
          draggable={false}
        />
        <span className="actor-label">{actor.name}</span>
      </button>
    </div>
  );
});
