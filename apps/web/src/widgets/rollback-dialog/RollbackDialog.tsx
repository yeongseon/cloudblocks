import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../entities/store/uiStore';
import type { DeploymentVersion } from '../../shared/types/ops';
import { ComingSoonBanner } from '../../shared/ui/ComingSoonBanner';
import { timeAgo } from '../../shared/utils/timeAgo';
import './RollbackDialog.css';

export function RollbackDialog() {
  const show = useUIStore((s) => s.showRollbackDialog);
  const availableVersions = useUIStore((s) => s.availableVersions);
  const selectedVersion = useUIStore((s) => s.selectedRollbackVersion);
  const rollingBack = useUIStore((s) => s.rollingBack);
  const rollbackError = useUIStore((s) => s.rollbackError);
  const selectRollbackVersion = useUIStore((s) => s.selectRollbackVersion);
  const loadAvailableVersions = useUIStore((s) => s.loadAvailableVersions);
  const rollback = useUIStore((s) => s.rollback);
  const setShowRollbackDialog = useUIStore((s) => s.setShowRollbackDialog);

  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // TODO(backend): Replace with live environment data from production deployment API
  const [currentProduction] = useState(() => ({
    imageTag: 'v1.4.3-sha-abc1234',
    commitSha: 'abc1234',
    commitMessage: 'feat: add dashboard widgets',
    deployedAt: new Date(Date.now() - 3600_000).toISOString(),
  }));

  useEffect(() => {
    if (show && availableVersions.length === 0) {
      void loadAvailableVersions();
    }
  }, [show, availableVersions.length, loadAvailableVersions]);

  useEffect(() => {
    if (show) {
      closeButtonRef.current?.focus();
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectRollbackVersion(null);
        setShowRollbackDialog(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, setShowRollbackDialog, selectRollbackVersion]);

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
    <>
      <button
        type="button"
        className="rollback-dialog-backdrop"
        onClick={handleClose}
        aria-label="Close rollback dialog"
      />
      <div className="rollback-dialog" role="dialog" aria-label="Rollback Production">
        <div className="rollback-dialog-header">
          <h3 className="rollback-dialog-title">Rollback Production</h3>
          <button
            ref={closeButtonRef}
            type="button"
            className="rollback-dialog-close"
            onClick={handleClose}
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="rollback-dialog-content">
          <ComingSoonBanner
            message="Coming Soon — Rollback Production is under development and not yet functional."
            className="rollback-coming-soon-banner"
          />
          {/* Current production version */}
          <div className="rollback-current-card">
            <div className="rollback-current-label">Current Production Version</div>
            <div className="rollback-current-tag">{currentProduction.imageTag}</div>
            <div className="rollback-current-meta">
              {currentProduction.commitSha} - {currentProduction.commitMessage}
            </div>
          </div>

          {/* Version selector */}
          <div>
            <div className="rollback-versions-title">Select Version to Rollback To</div>
            <div
              className="rollback-version-list"
              role="radiogroup"
              aria-label="Available versions"
            >
              {availableVersions.map((v) => (
                <button
                  type="button"
                  key={v.imageTag}
                  className={`rollback-version-item${selectedVersion?.imageTag === v.imageTag ? ' selected' : ''}`}
                  onClick={() => handleSelectVersion(v)}
                  aria-pressed={selectedVersion?.imageTag === v.imageTag}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectVersion(v);
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="rollback-version"
                    checked={selectedVersion?.imageTag === v.imageTag}
                    readOnly
                  />
                  <div className="rollback-version-info">
                    <span className="rollback-version-tag">{v.imageTag}</span>
                    <span className="rollback-version-msg">{v.commitMessage}</span>
                    <span className="rollback-version-time">{timeAgo(v.deployedAt)}</span>
                  </div>
                </button>
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
                <span className="rollback-diff-from">{currentProduction.imageTag}</span>
                <span className="rollback-diff-arrow">&rarr;</span>
                <span className="rollback-diff-to">{selectedVersion.imageTag}</span>
              </div>
              <div className="rollback-diff-row">
                <span className="rollback-diff-from">{currentProduction.commitSha}</span>
                <span className="rollback-diff-arrow">&rarr;</span>
                <span className="rollback-diff-to">{selectedVersion.commitSha}</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {rollbackError && <div className="rollback-error">{rollbackError}</div>}

          {/* Confirmation step */}
          {confirming ? (
            <div className="rollback-confirm">
              <div className="rollback-confirm-text">Are you sure you want to rollback?</div>
              <div className="rollback-confirm-detail">
                {currentProduction.imageTag} &rarr; {selectedVersion?.imageTag}
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
              <button type="button" className="rollback-btn-secondary" onClick={handleClose}>
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
    </>
  );
}
