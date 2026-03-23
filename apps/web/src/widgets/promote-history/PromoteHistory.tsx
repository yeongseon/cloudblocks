import { useEffect } from 'react';
import { usePromoteStore } from '../../entities/store/promoteStore';
import type { PromotionRecord, RollbackRecord } from '../../shared/types/ops';
import { ComingSoonBanner } from '../../shared/ui/ComingSoonBanner';
import { timeAgo } from '../../shared/utils/timeAgo';
import './PromoteHistory.css';

type TimelineEntry =
  | { kind: 'promotion'; record: PromotionRecord; sortDate: string }
  | { kind: 'rollback'; record: RollbackRecord; sortDate: string };

export function PromoteHistory() {
  const show = usePromoteStore((s) => s.showPromoteHistory);
  const promotionHistory = usePromoteStore((s) => s.promotionHistory);
  const rollbackHistory = usePromoteStore((s) => s.rollbackHistory);
  const loadingHistory = usePromoteStore((s) => s.loadingHistory);
  const loadHistory = usePromoteStore((s) => s.loadHistory);
  const togglePromoteHistory = usePromoteStore((s) => s.togglePromoteHistory);

  useEffect(() => {
    if (show) {
      void loadHistory();
    }
  }, [show, loadHistory]);

  if (!show) return null;

  // Merge and sort by date, newest first
  const timeline: TimelineEntry[] = [
    ...promotionHistory.map((r): TimelineEntry => ({
      kind: 'promotion',
      record: r,
      sortDate: r.promotedAt,
    })),
    ...rollbackHistory.map((r): TimelineEntry => ({
      kind: 'rollback',
      record: r,
      sortDate: r.rolledBackAt,
    })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  return (
    <div className="promote-history" role="dialog" aria-label="Promotion and Rollback History">
      <div className="promote-history-header">
        <h3 className="promote-history-title">Promotion &amp; Rollback History</h3>
        <button
          type="button"
          className="promote-history-close"
          onClick={togglePromoteHistory}
          aria-label="Close"
        >
          X
        </button>
      </div>

      <div className="promote-history-content">
        <ComingSoonBanner
          message="Coming Soon — Promotion and Rollback History is under development and not yet functional."
          className="promote-history-coming-soon"
        />
        {loadingHistory ? (
          <div className="promote-history-loading">Loading history...</div>
        ) : timeline.length === 0 ? (
          <div className="promote-history-empty">No promotion or rollback history yet.</div>
        ) : (
          timeline.map((entry) => {
            if (entry.kind === 'promotion') {
              const r = entry.record;
              return (
                <div key={r.id} className="promote-history-entry">
                  <div className="promote-history-icon promote" title="Promotion">
                    &#x2191;
                  </div>
                  <div className="promote-history-details">
                    <div className="promote-history-entry-header">
                      <span className="promote-history-entry-type">Promotion</span>
                      <span className={`promote-history-status ${r.status}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="promote-history-env">
                      {r.fromEnvironment} &rarr; {r.toEnvironment}
                    </div>
                    <div className="promote-history-tag">{r.imageTag}</div>
                    <div className="promote-history-meta">
                      <span>by {r.promotedBy}</span>
                      <span>{timeAgo(r.promotedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            } else {
              const r = entry.record;
              return (
                <div key={r.id} className="promote-history-entry">
                  <div className="promote-history-icon rollback" title="Rollback">
                    &#x2193;
                  </div>
                  <div className="promote-history-details">
                    <div className="promote-history-entry-header">
                      <span className="promote-history-entry-type">Rollback</span>
                      <span className={`promote-history-status ${r.status}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="promote-history-env">
                      {r.environment}: {r.fromImageTag} &rarr; {r.toImageTag}
                    </div>
                    <div className="promote-history-tag">{r.reason}</div>
                    <div className="promote-history-meta">
                      <span>by {r.rolledBackBy}</span>
                      <span>{timeAgo(r.rolledBackAt)}</span>
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
}
