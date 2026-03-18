import { memo } from 'react';
import { toast } from 'react-hot-toast';
import { useArchitectureStore } from '../store/architectureStore';
import { useUIStore } from '../store/uiStore';
import { canConnect } from '../validation/connection';
import type { ExternalActor } from '../../shared/types/index';
import internetSprite from '../../shared/assets/actor-sprites/internet.svg';
import './ExternalActorSprite.css';

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
  const blocks = useArchitectureStore((s) => s.workspace.architecture.blocks);
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors);

  const isSelected = selectedId === actor.id;
  const isConnectionSource = connectionSource === actor.id;

  const isConnectMode = toolMode === 'connect';
  const sourceBlock = isConnectMode && connectionSource
    ? blocks.find((block) => block.id === connectionSource)
    : null;
  const sourceActor = isConnectMode && connectionSource
    ? externalActors.find((externalActor) => externalActor.id === connectionSource)
    : null;
  const sourceType = sourceBlock?.category ?? sourceActor?.type ?? null;
  const isValidConnectTarget = sourceType !== null
    && actor.id !== connectionSource
    && canConnect(sourceType, actor.type);
  const isInvalidConnectTarget = isConnectMode && connectionSource !== null
    && actor.id !== connectionSource
    && !isValidConnectTarget;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (toolMode === 'delete') {
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        startConnecting(actor.id);
      } else if (connectionSource !== actor.id) {
        const success = addConnection(connectionSource, actor.id);
        if (!success) {
          toast.error('Invalid connection: check allowed connection rules');
        }
        completeInteraction();
      }
      return;
    }

    setSelectedId(actor.id);
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
      className={className}
      onClick={handleClick}
      style={{
        left: screenX,
        top: screenY,
        zIndex,
      }}
    >
      <img
        className="actor-img"
        src={internetSprite}
        alt={actor.name}
        draggable={false}
      />
    </div>
  );
});
