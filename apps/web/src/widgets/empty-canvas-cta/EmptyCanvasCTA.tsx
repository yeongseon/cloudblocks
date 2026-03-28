import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutTemplate, MousePointerClick } from 'lucide-react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import './EmptyCanvasCTA.css';

/**
 * Full-canvas call-to-action overlay shown when the architecture is empty.
 * Auto-hides when the first node is placed or user dismisses manually.
 */
export function EmptyCanvasCTA() {
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const connections = useArchitectureStore((s) => s.workspace.architecture.connections);
  const openDrawer = useUIStore((s) => s.openDrawer);

  const isEmpty = nodes.length === 0 && connections.length === 0;
  const [dismissed, setDismissed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Subscribe to animationend for exit transition.
  // setState in the event callback is fine — it's async, not synchronous in the effect body.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || !exiting) return;

    const handleAnimEnd = () => {
      setDismissed(true);
      setExiting(false);
    };
    el.addEventListener('animationend', handleAnimEnd);
    return () => el.removeEventListener('animationend', handleAnimEnd);
  }, [exiting]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
  }, []);

  const handleStartFromTemplate = useCallback(() => {
    openDrawer('scenarios');
    setExiting(true);
  }, [openDrawer]);

  // Derive visibility: show when canvas is empty and not dismissed.
  // When canvas goes non-empty, component returns null and dismissed state
  // becomes irrelevant. On next empty transition, dismissed may still be true,
  // but that's acceptable UX (once dismissed, stay dismissed per session).
  if (!isEmpty || dismissed) {
    return null;
  }

  return (
    <div
      ref={ctaRef}
      className={`empty-canvas-cta${exiting ? ' is-exiting' : ''}`}
      data-testid="empty-canvas-cta"
    >
      <div className="cta-card">
        <p className="cta-tagline">Learn cloud architecture by doing</p>
        <p className="cta-subtitle">
          Start with a guided template to learn a common cloud pattern, or open a blank canvas when
          you want to practice on your own.
        </p>
        <div className="cta-actions">
          <button
            type="button"
            className="cta-btn cta-btn-primary"
            onClick={handleStartFromTemplate}
          >
            <LayoutTemplate size={16} />
            Start Learning
          </button>
          <button type="button" className="cta-btn cta-btn-secondary" onClick={handleDismiss}>
            <MousePointerClick size={16} />
            Practice on Blank Canvas
          </button>
        </div>
      </div>
    </div>
  );
}
