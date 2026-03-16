import { memo } from 'react';
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
      <img
        className="actor-img"
        src={internetSprite}
        alt="Internet"
        draggable={false}
      />
    </div>
  );
});
