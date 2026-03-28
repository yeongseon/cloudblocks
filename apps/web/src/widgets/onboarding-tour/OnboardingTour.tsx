import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../../entities/store/uiStore';
import './OnboardingTour.css';

const STORAGE_KEY = 'cloudblocks:onboarding-completed';

interface TourStep {
  selector: string;
  fallbackSelector: string;
  title: string;
  description: string;
  ensureVisible?: () => void;
}

const STEPS: TourStep[] = [
  {
    selector: '.sidebar-palette',
    fallbackSelector: '.sidebar-palette',
    title: 'Add a Node',
    description:
      'Browse Azure resources in the palette and drag one onto the canvas to start building.',
    ensureVisible: () => useUIStore.getState().setSidebarOpen(true),
  },
  {
    selector: '.scene-canvas',
    fallbackSelector: '.builder-canvas',
    title: 'Connect Nodes',
    description: 'Click a port on any node and drag to another node to create a connection.',
  },
  {
    selector: '.menu-bar-nav',
    fallbackSelector: '.menu-bar-nav',
    title: 'Generate Code',
    description:
      'Open Build → Generate to export Azure infrastructure code as Bicep, Terraform, or Pulumi.',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

function getTargetElement(step: TourStep): Element | null {
  return document.querySelector(step.selector) ?? document.querySelector(step.fallbackSelector);
}

function getTargetRect(step: TourStep): SpotlightRect | null {
  const el = getTargetElement(step);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

const ELEVATED_Z = '10000';
const ELEVATED_ATTR = 'data-onboarding-elevated';

function elevateTarget(step: TourStep): (() => void) | null {
  const el = getTargetElement(step) as HTMLElement | null;
  if (!el) return null;

  const prevZ = el.style.zIndex;
  const prevPos = el.style.position;
  const prevRelative = el.style.position === '' || el.style.position === 'static';

  el.style.zIndex = ELEVATED_Z;
  if (prevRelative) el.style.position = 'relative';
  el.setAttribute(ELEVATED_ATTR, 'true');

  return () => {
    el.style.zIndex = prevZ;
    if (prevRelative) el.style.position = prevPos;
    el.removeAttribute(ELEVATED_ATTR);
  };
}

function getTooltipPosition(spotlight: SpotlightRect): {
  top: number;
  left: number;
  placement: 'above' | 'below';
} {
  const tooltipWidth = 340;
  const tooltipEstimatedHeight = 180;
  const gap = 12;

  const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height);
  const placement: 'above' | 'below' =
    spaceBelow > tooltipEstimatedHeight + gap ? 'below' : 'above';

  const top =
    placement === 'below'
      ? spotlight.top + spotlight.height + gap
      : spotlight.top - tooltipEstimatedHeight - gap;

  let left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

  return { top: Math.max(12, top), left, placement };
}

let readyFlag = false;
const readyListeners = new Set<() => void>();
function subscribeReady(cb: () => void) {
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}
function getReadySnapshot() {
  return readyFlag;
}

export function OnboardingTour() {
  const showOnboarding = useUIStore((s) => s.showOnboarding);
  const setShowOnboarding = useUIStore((s) => s.setShowOnboarding);

  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const rafRef = useRef(0);
  const ready = useSyncExternalStore(subscribeReady, getReadySnapshot);

  const updateSpotlight = useCallback(() => {
    if (!showOnboarding) return;
    const step = STEPS[currentStep];
    step.ensureVisible?.();
    const rect = getTargetRect(step);
    setSpotlight(rect);
  }, [showOnboarding, currentStep]);

  useEffect(() => {
    if (!showOnboarding) {
      readyFlag = false;
      for (const cb of readyListeners) cb();
      return;
    }

    const frameId = requestAnimationFrame(() => {
      updateSpotlight();
      readyFlag = true;
      for (const cb of readyListeners) cb();
    });
    return () => cancelAnimationFrame(frameId);
  }, [showOnboarding, updateSpotlight]);

  useEffect(() => {
    if (!showOnboarding) return;

    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [showOnboarding, updateSpotlight]);

  useEffect(() => {
    if (!showOnboarding) return;
    const step = STEPS[currentStep];
    step.ensureVisible?.();
    const restore = elevateTarget(step);
    return () => {
      restore?.();
    };
  }, [showOnboarding, currentStep]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setCurrentStep(0);
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  useEffect(() => {
    if (!showOnboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        completeTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOnboarding, completeTour]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  if (!showOnboarding) return null;

  if (!ready) return null;

  const step = STEPS[currentStep];

  const tooltipPos = spotlight
    ? getTooltipPosition(spotlight)
    : {
        top: window.innerHeight / 2 - 90,
        left: window.innerWidth / 2 - 170,
        placement: 'below' as const,
      };

  const isLastStep = currentStep === STEPS.length - 1;

  return createPortal(
    <div className="onboarding-overlay onboarding-overlay--visible" data-testid="onboarding-tour">
      {spotlight && (
        <div
          className="onboarding-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div
        className={`onboarding-tooltip onboarding-tooltip--${tooltipPos.placement}`}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <button type="button" className="onboarding-skip" onClick={completeTour}>
          Skip
        </button>

        <div className="onboarding-tooltip-title">{step.title}</div>
        <div className="onboarding-tooltip-desc">{step.description}</div>

        <div className="onboarding-dots">
          {STEPS.map((s, i) => (
            <span
              key={s.selector}
              className={`onboarding-dot${i === currentStep ? ' onboarding-dot--active' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-nav">
          {currentStep > 0 ? (
            <button
              type="button"
              className="onboarding-btn onboarding-btn--secondary"
              onClick={handleBack}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="onboarding-btn onboarding-btn--primary"
            onClick={handleNext}
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
