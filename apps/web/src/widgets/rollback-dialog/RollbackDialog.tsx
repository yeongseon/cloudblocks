import { useState, useEffect } from 'react';
import { usePromoteStore } from '../../entities/store/promoteStore';
import type { DeploymentVersion } from '../../shared/types/ops';
import { timeAgo } from '../../shared/utils/timeAgo';
import './RollbackDialog.css';

const CURRENT_PRODUCTION = {
  imageTag: 'v1.4.3-sha-abc1234',
  commitSha: 'abc1234',
  commitMessage: 'feat: add dashboard widgets',
  deployedAt: new Date(Date.now() - 3600_000).toISOString(),
};

export function RollbackDialog() {
  const show = usePromoteStore((s) => s.showRollbackDialog);
  const availableVersions = usePromoteStore((s) => s.availableVersions);
  const selectedVersion = usePromoteStore((s) => s.selectedRollbackVersion);
  const rollingBack = usePromoteStore((s) => s.rollingBack);
  const rollbackError = usePromoteStore((s) => s.rollbackError);
  const selectRollbackVersion = usePromoteStore((s) => s.selectRollbackVersion);
  const loadAvailableVersions = usePromoteStore((s) => s.loadAvailableVersions);
  const rollback = usePromoteStore((s) => s.rollback);
  const setShowRollbackDialog = usePromoteStore((s) => s.setShowRollbackDialog);

  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (show && availableVersions.length === 0) {
      void loadAvailableVersions();
    }
  }, [show, availableVersions.length, loadAvailableVersions]);

  if (!show) return null;

  const canRollback = selectedVersion !== null && reason.trim().length > 0;

  const handleClose = () => {
    selectRollbackVersion(null);
    setReason('');
    setConfirming(false);
    setShowRollbackDialog(false);
  };

  const handleSelectVersion = (version: DeploymentVersion) => {
    selectRollbackVersion(version);
    setConfirming(false);
  };

  const handleRollbackClick = () => {
    if (canRollback) {
      setConfirming(true);
    }
  };

  const handleConfirmRollback = () => {
    if (selectedVersion && reason.trim()) {
      void rollback(selectedVersion, reason.trim());
      setReason('');
      setConfirming(false);
    }
  };

  const handleCancelConfirm = () => {
    setConfirming(false);
  };

  return (
    <div className="rollback-dialog" role="dialog" aria-label="Rollback Production">
      <div className="rollback-dialog-header">
        <h3 className="rollback-dialog-title">Rollback Production</h3>
        <button
          type="button"
          className="rollback-dialog-close"
          onClick={handleClose}
          aria-label="Close"
        >
          X
        </button>
      </div>

      <div className="rollback-dialog-content">
        {/* Current production version */}
        <div className="rollback-current-card">
          <div className="rollback-current-label">Current Production Version</div>
          <div className="rollback-current-tag">{CURRENT_PRODUCTION.imageTag}</div>
          <div className="rollback-current-meta">
            {CURRENT_PRODUCTION.commitSha} - {CURRENT_PRODUCTION.commitMessage}
          </div>
        </div>

        {/* Version selector */}
        <div>
          <div className="rollback-versions-title">Select Version to Rollback To</div>
          <div className="rollback-version-list">
            {availableVersions.map((v) => (
              <div
                key={v.imageTag}
                className={`rollback-version-item${selectedVersion?.imageTag === v.imageTag ? ' selected' : ''}`}
                onClick={() => handleSelectVersion(v)}
              >
                <input
                  type="radio"
                  name="rollback-version"
                  checked={selectedVersion?.imageTag === v.imageTag}
                  onChange={() => handleSelectVersion(v)}
                />
                <div className="rollback-version-info">
                  <span className="rollback-version-tag">{v.imageTag}</span>
                  <span className="rollback-version-msg">{v.commitMessage}</span>
                  <span className="rollback-version-time">{timeAgo(v.deployedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason input */}
        <div>
          <div className="rollback-reason-label">Rollback Reason (required)</div>
          <textarea
            className="rollback-reason-textarea"
            placeholder="Describe why you are rolling back..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Diff preview (when version selected) */}
        {selectedVersion && (
          <div className="rollback-diff">
            <div className="rollback-diff-title">Version Change Preview</div>
            <div className="rollback-diff-row">
              <span className="rollback-diff-from">{CURRENT_PRODUCTION.imageTag}</span>
              <span className="rollback-diff-arrow">&rarr;</span>
              <span className="rollback-diff-to">{selectedVersion.imageTag}</span>
            </div>
            <div className="rollback-diff-row">
              <span className="rollback-diff-from">{CURRENT_PRODUCTION.commitSha}</span>
              <span className="rollback-diff-arrow">&rarr;</span>
              <span className="rollback-diff-to">{selectedVersion.commitSha}</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {rollbackError && (
          <div className="rollback-error">{rollbackError}</div>
        )}

        {/* Confirmation step */}
        {confirming ? (
          <div className="rollback-confirm">
            <div className="rollback-confirm-text">Are you sure you want to rollback?</div>
            <div className="rollback-confirm-detail">
              {CURRENT_PRODUCTION.imageTag} &rarr; {selectedVersion?.imageTag}
            </div>
            <div className="rollback-confirm-actions">
              <button
                type="button"
                className="rollback-btn-cancel-confirm"
                onClick={handleCancelConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rollback-btn-confirm"
                onClick={handleConfirmRollback}
                disabled={rollingBack}
              >
                {rollingBack && <span className="rollback-spinner" />}
                {rollingBack ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rollback-dialog-actions">
            <button
              type="button"
              className="rollback-btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rollback-btn-primary"
              disabled={!canRollback}
              onClick={handleRollbackClick}
            >
              Rollback Production
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
