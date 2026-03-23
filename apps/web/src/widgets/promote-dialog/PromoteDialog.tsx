import { useEffect, useRef, useState } from 'react';
import { usePromoteStore } from '../../entities/store/promoteStore';
import type { PromotionChecklist } from '../../shared/types/ops';
import { timeAgo } from '../../shared/utils/timeAgo';
import './PromoteDialog.css';

const CHECKLIST_LABELS: Record<keyof PromotionChecklist, string> = {
  stagingHealthy: 'Staging environment is healthy',
  ciPassed: 'CI pipeline passed',
  noActiveIncidents: 'No active incidents',
  manualApproval: 'Manual approval confirmed',
};

export function PromoteDialog() {
  const show = usePromoteStore((s) => s.showPromoteDialog);
  const checklist = usePromoteStore((s) => s.promotionChecklist);
  const promoting = usePromoteStore((s) => s.promoting);
  const promotionError = usePromoteStore((s) => s.promotionError);
  const updateChecklist = usePromoteStore((s) => s.updateChecklist);
  const promote = usePromoteStore((s) => s.promote);
  const setShowPromoteDialog = usePromoteStore((s) => s.setShowPromoteDialog);
  const resetChecklist = usePromoteStore((s) => s.resetChecklist);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // TODO: replace with live environment data
  const [currentStaging] = useState(() => ({
    imageTag: 'v1.4.3-sha-abc1234',
    commitSha: 'abc1234',
    commitMessage: 'feat: add dashboard widgets',
    deployedAt: new Date(Date.now() - 7200_000).toISOString(),
  }));

  useEffect(() => {
    if (show) {
      closeButtonRef.current?.focus();
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetChecklist();
        setShowPromoteDialog(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, resetChecklist, setShowPromoteDialog]);

  if (!show) return null;

  const allChecked = Object.values(checklist).every(Boolean);

  const handleClose = () => {
    resetChecklist();
    setShowPromoteDialog(false);
  };

  const handlePromote = () => {
    if (allChecked && !promoting) {
      void promote(currentStaging.imageTag);
    }
  };

  return (
    <>
      <div className="promote-dialog-backdrop" role="presentation" onClick={handleClose} />
      <div className="promote-dialog" role="dialog" aria-label="Promote to Production">
        <div className="promote-dialog-header">
          <h3 className="promote-dialog-title">Promote to Production</h3>
          <button
            ref={closeButtonRef}
            type="button"
            className="promote-dialog-close"
            onClick={handleClose}
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="promote-dialog-content">
          <div className="promote-coming-soon-banner">
            Coming Soon — Promote to Production is under development and not yet functional.
          </div>
          {/* Source info card */}
          <div className="promote-source-card">
            <div className="promote-source-label">Staging Environment</div>
            <div className="promote-source-tag">{currentStaging.imageTag}</div>
            <div className="promote-source-meta">
              <span>
                Commit: {currentStaging.commitSha} - {currentStaging.commitMessage}
              </span>
              <span>Deployed {timeAgo(currentStaging.deployedAt)}</span>
            </div>
          </div>

          {/* Pre-promotion checklist */}
          <div className="promote-checklist">
            <div className="promote-checklist-title">Pre-Promotion Checklist</div>
            {(Object.keys(CHECKLIST_LABELS) as (keyof PromotionChecklist)[]).map((key) => (
              <div
                key={key}
                className={`promote-checklist-item${checklist[key] ? ' checked' : ''}`}
                onClick={() => updateChecklist(key, !checklist[key])}
              >
                <input
                  type="checkbox"
                  checked={checklist[key]}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateChecklist(key, e.target.checked);
                  }}
                  id={`checklist-${key}`}
                />
                <label htmlFor={`checklist-${key}`}>{CHECKLIST_LABELS[key]}</label>
              </div>
            ))}
          </div>

          {/* Diff preview */}
          <div className="promote-diff">
            <div className="promote-diff-title">What will change</div>
            <div className="promote-diff-row">
              <span className="promote-diff-from">staging</span>
              <span className="promote-diff-arrow">&rarr;</span>
              <span className="promote-diff-to">production</span>
            </div>
            <div className="promote-diff-row" style={{ marginTop: 4 }}>
              <span className="promote-diff-from">{currentStaging.imageTag}</span>
              <span className="promote-diff-arrow">&rarr;</span>
              <span className="promote-diff-to">production:latest</span>
            </div>
          </div>

          {/* Error display */}
          {promotionError && <div className="promote-error">{promotionError}</div>}

          {/* Actions */}
          <div className="promote-dialog-actions">
            <button type="button" className="promote-btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className="promote-btn-primary"
              disabled={!allChecked || promoting}
              onClick={handlePromote}
            >
              {promoting && <span className="promote-spinner" />}
              {promoting ? 'Promoting...' : 'Promote to Production'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
