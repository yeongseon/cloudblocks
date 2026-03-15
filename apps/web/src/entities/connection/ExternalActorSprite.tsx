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
      <div className="actor-icon">
        <svg viewBox="0 0 64 40" width="64" height="40" role="img" aria-label="Internet Cloud">
          <title>Internet Cloud</title>
          <path d="M52 28H14c-5.5 0-10-4.5-10-10 0-4.8 3.4-8.8 8-9.7C13.2 3.7 17.8 0 23.2 0c4.5 0 8.5 2.5 10.5 6.2C35 5.5 36.8 5 38.8 5c5 0 9.2 3.5 10.2 8.2C53.5 14.2 57 18.2 57 23c0 2.8-2.2 5-5 5z" fill="#2196F3"/>
        </svg>
      </div>
      <div className="actor-block">
        <div className="actor-studs">
          <div className="stud"></div>
          <div className="stud"></div>
        </div>
        <div className="actor-label">{actor.name}</div>
      </div>
    </div>
  );
});
