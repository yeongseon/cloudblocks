import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../entities/store/uiStore';
import { PANEL_REGISTRY, type DrawerPanelId } from './panelRegistry';
import './RightDrawer.css';

const ScenarioGallery = lazy(() =>
  import('../scenario-gallery/ScenarioGallery').then((m) => ({
    default: m.ScenarioGallery,
  })),
);

const LearningPanel = lazy(() =>
  import('../learning-panel/LearningPanel').then((m) => ({
    default: m.LearningPanel,
  })),
);
const ValidationDrawerPanel = lazy(() =>
  import('./panels/ValidationDrawerPanel').then((m) => ({
    default: m.ValidationDrawerPanel,
  })),
);

const PropertiesDrawerPanel = lazy(() =>
  import('./panels/PropertiesDrawerPanel').then((m) => ({
    default: m.PropertiesDrawerPanel,
  })),
);
const CodeDrawerPanel = lazy(() =>
  import('./panels/CodeDrawerPanel').then((m) => ({
    default: m.CodeDrawerPanel,
  })),
);
const TemplateGallery = lazy(() =>
  import('../template-gallery/TemplateGallery').then((m) => ({
    default: m.TemplateGallery,
  })),
);

export interface RightDrawerProps {
  children?: React.ReactNode;
}

function DrawerContent({ panelId }: { panelId: DrawerPanelId | null }) {
  switch (panelId) {
    case 'scenarios':
      return (
        <Suspense fallback={null}>
          <ScenarioGallery />
        </Suspense>
      );
    case 'learning':
      return (
        <Suspense fallback={null}>
          <LearningPanel />
        </Suspense>
      );
    case 'validation':
      return (
        <Suspense fallback={null}>
          <ValidationDrawerPanel />
        </Suspense>
      );
    case 'properties':
      return (
        <Suspense fallback={null}>
          <PropertiesDrawerPanel />
        </Suspense>
      );
    case 'code':
      return (
        <Suspense fallback={null}>
          <CodeDrawerPanel />
        </Suspense>
      );
    case 'templates':
      return (
        <Suspense fallback={null}>
          <TemplateGallery />
        </Suspense>
      );
    default:
      return null;
  }
}

/**
 * Right-side overlay drawer for panel content.
 *
 * Slides in from the right edge of the canvas. Renders a header with the
 * active panel's label/icon and a close button, plus a scrollable body
 * that receives children.
 */
export function RightDrawer({ children }: RightDrawerProps) {
  const drawer = useUIStore((s) => s.drawer);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activePanel: DrawerPanelId | null = drawer.activePanel;

  const panelInfo =
    activePanel === null ? null : PANEL_REGISTRY[activePanel as keyof typeof PANEL_REGISTRY];

  // Focus management: focus the drawer on open, restore on close
  useEffect(() => {
    if (drawer.isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Small delay to allow transition to start before focus
      const timer = setTimeout(() => {
        drawerRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }

    // Restore focus when closing
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
    return undefined;
  }, [drawer.isOpen]);

  // Esc key closes the drawer
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDrawer();
      }
    },
    [closeDrawer],
  );

  const handleBackdropClick = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  const drawerWidth = panelInfo?.minWidth ?? 360;

  if (!drawer.isOpen && !drawer.activePanel) {
    return null;
  }

  return (
    <>
      {drawer.isOpen && (
        <div
          className="right-drawer-backdrop"
          onClick={handleBackdropClick}
          data-testid="drawer-backdrop"
          aria-hidden="true"
        />
      )}
      <div
        ref={drawerRef}
        className="right-drawer"
        data-open={drawer.isOpen}
        data-testid="right-drawer"
        role="dialog"
        aria-label={panelInfo?.label ?? 'Panel'}
        aria-modal="false"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{ '--drawer-width': `${drawerWidth}px` } as React.CSSProperties}
      >
        <div className="right-drawer-header">
          <h2 className="right-drawer-title">
            {panelInfo && (
              <span aria-hidden="true">
                <panelInfo.Icon size={16} />
              </span>
            )}
            {panelInfo?.label}
          </h2>
          <button
            type="button"
            className="right-drawer-close"
            onClick={closeDrawer}
            aria-label="Close panel"
            data-testid="drawer-close-btn"
          >
            <X size={16} />
          </button>
        </div>
        <div className="right-drawer-body">
          <DrawerContent panelId={activePanel} />
          {children}
        </div>
      </div>
    </>
  );
}
