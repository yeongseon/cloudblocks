import { useEffect, useState } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import { RESOURCE_DEFINITIONS } from '../bottom-panel/useTechTree';
import './DragGhost.css';

export function DragGhost() {
  const interactionState = useUIStore((s) => s.interactionState);
  const draggedBlockCategory = useUIStore((s) => s.draggedBlockCategory);
  const draggedResourceName = useUIStore((s) => s.draggedResourceName);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    if (interactionState !== 'placing' || !draggedBlockCategory || !draggedResourceName) {
      return;
    }

    document.addEventListener('pointermove', handlePointerMove);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
    };
  }, [interactionState, draggedBlockCategory, draggedResourceName]);

  if (interactionState !== 'placing' || !draggedBlockCategory || !draggedResourceName) {
    return null;
  }

  let resourceDef = null;
  for (const def of Object.values(RESOURCE_DEFINITIONS)) {
    if (
      def.blockCategory === draggedBlockCategory &&
      def.label === draggedResourceName
    ) {
      resourceDef = def;
      break;
    }
  }

  return (
    <div
      className="drag-ghost"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {resourceDef && (
        <div className="drag-ghost-icon">{resourceDef.icon}</div>
      )}
      <div className="drag-ghost-label">{draggedResourceName}</div>
    </div>
  );
}
