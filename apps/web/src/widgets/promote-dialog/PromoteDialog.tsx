import { useEffect } from 'react';
import { usePromoteStore } from '../../entities/store/promoteStore';
import { useOpsStore } from '../../entities/store/opsStore';
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
  const clearPromotionError = usePromoteStore((s) => s.clearPromotionError);

  // Read staging metadata from ops store instead of hardcoded constants (#917, #937)
  const environments = useOpsStore((s) => s.environments);
  const stagingEnv = environments.find((e) => e.name === 'staging');

  // Clear error state on dialog open (#920, #933)
  useEffect(() => {
    if (show) {
      clearPromotionError();
    }
  }, [show, clearPromotionError]);

  if (!show) return null;

  const allChecked = Object.values(checklist).every(Boolean);
  const hasStagingData = stagingEnv?.imageTag != null;

  const handleClose = () => {
    resetChecklist();
    clearPromotionError();
    setShowPromoteDialog(false);
  };

  const handlePromote = () => {
    if (allChecked && !promoting && stagingEnv?.imageTag) {
      void promote(stagingEnv.imageTag);
    }
  };

  return (
    <div className="promote-dialog" role="dialog" aria-label="Promote to Production">
      <div className="promote-dialog-header">
        <h3 className="promote-dialog-title">Promote to Production</h3>
        <button
          type="button"
          className="promote-dialog-close"
          onClick={handleClose}
          aria-label="Close"
        >
          X
        </button>
      </div>

      <div className="promote-dialog-content">
        {/* Source info card - reads from live ops store (#917, #937) */}
        <div className="promote-source-card">
          <div className="promote-source-label">Staging Environment</div>
          {hasStagingData ? (
            <>
              <div className="promote-source-tag">{stagingEnv.imageTag}</div>
              <div className="promote-source-meta">
                {stagingEnv.commitSha && (
                  <span>Commit: {stagingEnv.commitSha.slice(0, 7)}</span>
                )}
                {stagingEnv.lastDeployedAt && (
                  <span>Deployed {timeAgo(stagingEnv.lastDeployedAt)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="promote-source-unavailable">
              Staging deployment data unavailable. Refresh Ops Center.
            </div>
          )}
        </div>

        {/* Pre-promotion checklist - fixed double-toggle (#914) and a11y (#931) */}
        <div className="promote-checklist">
          <div className="promote-checklist-title">Pre-Promotion Checklist</div>
          {(Object.keys(CHECKLIST_LABELS) as (keyof PromotionChecklist)[]).map((key) => (
            <div
              key={key}
              className={`promote-checklist-item${checklist[key] ? ' checked' : ''}`}
              role="checkbox"
              aria-checked={checklist[key]}
              tabIndex={0}
              onClick={() => updateChecklist(key, !checklist[key])}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  updateChecklist(key, !checklist[key]);
                }
              }}
            >
              <input
                type="checkbox"
                checked={checklist[key]}
                onChange={(e) => updateChecklist(key, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                id={`checklist-${key}`}
                tabIndex={-1}
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
            <span className="promote-diff-from">{stagingEnv?.imageTag ?? 'unknown'}</span>
            <span className="promote-diff-arrow">&rarr;</span>
            <span className="promote-diff-to">production:latest</span>
          </div>
        </div>

        {/* Error display */}
        {promotionError && (
          <div className="promote-error">{promotionError}</div>
        )}

        {/* Actions */}
        <div className="promote-dialog-actions">
          <button
            type="button"
            className="promote-btn-secondary"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="promote-btn-primary"
            disabled={!allChecked || promoting || !hasStagingData}
            onClick={handlePromote}
          >
            {promoting && <span className="promote-spinner" />}
            {promoting ? 'Promoting...' : 'Promote to Production'}
          </button>
        </div>
      </div>
    </div>
  );
}
