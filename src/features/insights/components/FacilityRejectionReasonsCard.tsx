import { useState } from 'react';
import type { FacilityRejectionReason } from '../../../types/models';
import { rejectionReasonLabel } from '../facility-insights';
import styles from './FacilityInsights.module.css';

interface FacilityRejectionReasonsCardProps {
  reasons: FacilityRejectionReason[];
}

const REASON_COLORS = ['var(--color-accent)', '#b87b28', '#d9a94a', '#8c5b00', '#6b4423', '#4a2f18'];

export function FacilityRejectionReasonsCard({ reasons }: FacilityRejectionReasonsCardProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const totalRejections = reasons.reduce((sum, reason) => sum + reason.count, 0);
  const maxCount = Math.max(1, ...reasons.map((reason) => reason.count));

  return (
    <section className={styles.card} aria-labelledby="facility-rejections-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-rejections-heading">Rejection reasons</h2>
          <p>Why orders assigned to this facility were rejected in the period.</p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Rejection reasons display mode">
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'chart' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('chart')}
            aria-pressed={viewMode === 'chart'}
          >
            Chart view
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'table' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            Table view
          </button>
        </div>
      </div>

      {reasons.length === 0 ? (
        <p className={styles.statHint}>No rejections in this period.</p>
      ) : (
        <>
          {viewMode === 'chart' ? (
            <div>
              {reasons.map((reason, index) => (
                <div key={reason.code} style={{ marginBottom: 'var(--space-3)' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'var(--text-sm)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    <span>{rejectionReasonLabel(reason.code, reason.label)}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {reason.count} ({reason.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div
                    className={styles.distributionBar}
                    role="img"
                    aria-label={`${rejectionReasonLabel(reason.code, reason.label)}: ${reason.count} rejects`}
                    style={{ height: 10 }}
                  >
                    <div
                      className={styles.distributionSegment}
                      style={{
                        width: `${(reason.count / maxCount) * 100}%`,
                        background: REASON_COLORS[index % REASON_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
            <table className={styles.dataTable} aria-label="Rejection reasons table">
              <caption>Rejection reasons for the selected period</caption>
              <thead>
                <tr>
                  <th scope="col">Reason</th>
                  <th scope="col">Code</th>
                  <th scope="col" className="num">
                    Count
                  </th>
                  <th scope="col" className="num">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((reason) => (
                  <tr key={reason.code}>
                    <th scope="row">{rejectionReasonLabel(reason.code, reason.label)}</th>
                    <td>
                      <code>{reason.code}</code>
                    </td>
                    <td className="num">{reason.count}</td>
                    <td className="num">{reason.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 600 }}>
                  <th scope="row">Total rejections</th>
                  <td>—</td>
                  <td className="num">{totalRejections}</td>
                  <td className="num">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
