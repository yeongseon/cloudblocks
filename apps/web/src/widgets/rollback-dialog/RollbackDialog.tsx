import { useState, useEffect } from 'react';
import { usePromoteStore } from '../../entities/store/promoteStore';
import { useOpsStore } from '../../entities/store/opsStore';
import type { DeploymentVersion } from '../../shared/types/ops';
import { timeAgo } from '../../shared/utils/timeAgo';
import './RollbackDialog.css';

export function RollbackDialog() {
  const show = usePromoteStore((s) => s.showRollbackDialog);
  const availableVersions = usePromoteStore((s) => s.availableVersions);
  const selectedVersion = usePromoteStore((s) => s.selectedRollbackVersion);
  const rollingBack = usePromoteStore((s) => s.rollingBack);
  const rollbackError = usePromoteStore((s) => s.rollbackError);
  const loadingVersions = usePromoteStore((s) => s.loadingVersions);
  const selectRollbackVersion = usePromoteStore((s) => s.selectRollbackVersion);
  const loadAvailableVersions = usePromoteStore((s) => s.loadAvailableVersions);
  const rollback = usePromoteStore((s) => s.rollback);
  const setShowRollbackDialog = usePromoteStore((s) => s.setShowRollbackDialog);
  const clearRollbackError = usePromoteStore((s) => s.clearRollbackError);

  // Read production metadata from ops store instead of hardcoded constants (#918, #938)
  const environments = useOpsStore((s) => s.environments);
  const productionEnv = environments.find((e) => e.name === 'production');

  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Refresh versions on every open (#915) and clear errors (#921, #935)
  useEffect(() => {
    if (show) {
      clearRollbackError();
      void loadAvailableVersions();
    }
  }, [show, loadAvailableVersions, clearRollbackError]);

  if (!show) return null;

  const canRollback = selectedVersion !== null && reason.trim().length > 0;

  const handleClose = () => {
    selectRollbackVersion(null);
    setReason('');
    setConfirming(false);
    clearRollbackError();
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
        {/* Current production version - reads from live ops store (#918, #938) */}
        <div className="rollback-current-card">
          <div className="rollback-current-label">Current Production Version</div>
          {productionEnv?.imageTag ? (
            <>
              <div className="rollback-current-tag">{productionEnv.imageTag}</div>
              <div className="rollback-current-meta">
                {productionEnv.commitSha ? productionEnv.commitSha.slice(0, 7) : 'unknown'}
                {productionEnv.version ? ` - ${productionEnv.version}` : ''}
              </div>
            </>
          ) : (
            <div className="rollback-current-unavailable">
              Production deployment data unavailable. Refresh Ops Center.
            </div>
          )}
        </div>

        {/* Version selector with loading indicator (#922) and a11y (#932) */}
        <div>
          <div className="rollback-versions-title">Select Version to Rollback To</div>
          <div className="rollback-version-list">
            {loadingVersions ? (
              <div className="rollback-versions-loading">Loading available versions...</div>
            ) : availableVersions.length === 0 ? (
              <div className="rollback-versions-empty">No previous versions available.</div>
            ) : (
              availableVersions.map((v) => (
                <div
                  key={v.imageTag}
                  className={`rollback-version-item${selectedVersion?.imageTag === v.imageTag ? ' selected' : ''}`}
                  role="radio"
                  aria-checked={selectedVersion?.imageTag === v.imageTag}
                  tabIndex={0}
                  onClick={() => handleSelectVersion(v)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleSelectVersion(v);
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="rollback-version"
                    checked={selectedVersion?.imageTag === v.imageTag}
                    onChange={() => handleSelectVersion(v)}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={-1}
                  />
                  <div className="rollback-version-info">
                    <span className="rollback-version-tag">{v.imageTag}</span>
                    <span className="rollback-version-msg">{v.commitMessage}</span>
                    <span className="rollback-version-time">{timeAgo(v.deployedAt)}</span>
                  </div>
                </div>
              ))
            )}
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
              <span className="rollback-diff-from">{productionEnv?.imageTag ?? 'unknown'}</span>
              <span className="rollback-diff-arrow">&rarr;</span>
              <span className="rollback-diff-to">{selectedVersion.imageTag}</span>
            </div>
            <div className="rollback-diff-row">
              <span className="rollback-diff-from">{productionEnv?.commitSha?.slice(0, 7) ?? 'unknown'}</span>
              <span className="rollback-diff-arrow">&rarr;</span>
              <span className="rollback-diff-to">{selectedVersion.commitSha}</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {rollbackError && (
          <div className="rollback-error">{rollbackError}</div>
        )}

        {/* Confirmation step - with failure recovery (#936) */}
        {confirming ? (
          <div className="rollback-confirm">
            <div className="rollback-confirm-text">Are you sure you want to rollback?</div>
            <div className="rollback-confirm-detail">
              {productionEnv?.imageTag ?? 'current'} &rarr; {selectedVersion?.imageTag}
            </div>
            <div className="rollback-confirm-actions">
              <button
                type="button"
                className="rollback-btn-cancel-confirm"
                onClick={handleCancelConfirm}
                disabled={rollingBack}
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
