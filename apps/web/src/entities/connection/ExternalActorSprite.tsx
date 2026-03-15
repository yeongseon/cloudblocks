import { memo } from 'react';
import type { ExternalActor } from '../../shared/types/index';
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
  return (
    <div
      className="external-actor-sprite"
      style={{
        left: screenX,
        top: screenY,
        zIndex,
      }}
    >
      <div className="actor-icon">🌐</div>
      <div className="actor-label">{actor.name}</div>
    </div>
  );
});
