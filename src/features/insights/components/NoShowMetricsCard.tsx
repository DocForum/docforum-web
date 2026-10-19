import { useState } from 'react';
import type { NoShowMetrics } from '../../../types/models';
import styles from './PracticeInsights.module.css';

interface NoShowMetricsCardProps {
  metrics: NoShowMetrics;
}

export function NoShowMetricsCard({ metrics }: NoShowMetricsCardProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const total = Math.max(1, metrics.totalScheduled);
  const completedPct = (metrics.completedVisits / total) * 100;
  const noShowPct = (metrics.noShows / total) * 100;
  const lateCancelPct = (metrics.lateCancellations / total) * 100;
  const onTimeCancelPct = (metrics.onTimeCancellations / total) * 100;

  return (
    <section className={styles.card} aria-labelledby="noshow-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="noshow-heading">No-show and cancellation rates</h2>
          <p className={styles.cardSubtitle}>
            Patient attendance patterns and late cancellation turnaround.
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="No-show display mode">
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'visual' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('visual')}
            aria-pressed={viewMode === 'visual'}
          >
            Visual overview
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

      {metrics.sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>Small sample caveat</span>
          <span>
            Only {metrics.totalScheduled} total scheduled visits in this period. No-show and late-cancellation percentages may be disproportionately influenced by single events.
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>No-show rate</span>
          <span className={styles.statValue} style={{ color: metrics.noShowRate > 10 ? '#b3261e' : 'inherit' }}>
            {metrics.noShowRate.toFixed(1)}%
          </span>
          <span className={styles.statHint}>{metrics.noShows} unattended visits</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Late cancel rate</span>
          <span className={styles.statValue} style={{ color: metrics.lateCancelRate > 10 ? '#b87b28' : 'inherit' }}>
            {metrics.lateCancelRate.toFixed(1)}%
          </span>
          <span className={styles.statHint}>{metrics.lateCancellations} cancelled within 24h</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Completed visits</span>
          <span className={styles.statValue}>{metrics.completedVisits}</span>
          <span className={styles.statHint}>{completedPct.toFixed(0)}% completion</span>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div aria-label="Visit outcome visual distribution">
          <div className={styles.distributionBar} role="img" aria-label="Appointment outcome proportions">
            <div
              className={styles.distributionSegment}
              style={{ width: `${completedPct}%`, background: 'var(--color-accent)' }}
              title={`Completed: ${metrics.completedVisits} (${completedPct.toFixed(1)}%)`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${noShowPct}%`, background: '#b3261e' }}
              title={`No-shows: ${metrics.noShows} (${noShowPct.toFixed(1)}%)`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${lateCancelPct}%`, background: '#b87b28' }}
              title={`Late cancellations: ${metrics.lateCancellations} (${lateCancelPct.toFixed(1)}%)`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${onTimeCancelPct}%`, background: 'var(--color-surface-hover)' }}
              title={`On-time cancellations: ${metrics.onTimeCancellations} (${onTimeCancelPct.toFixed(1)}%)`}
            />
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
              <span>Completed ({metrics.completedVisits})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b3261e' }} />
              <span>No-shows ({metrics.noShows})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b87b28' }} />
              <span>Late cancels (&lt;24h) ({metrics.lateCancellations})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
              <span>On-time cancels ({metrics.onTimeCancellations})</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label="Appointment attendance and cancellation metrics table">
          <caption>Detailed count and proportion breakdown for appointments in selected period</caption>
          <thead>
            <tr>
              <th scope="col">Status / Outcome</th>
              <th scope="col" className="num">Count</th>
              <th scope="col" className="num">Proportion of Scheduled</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Completed Visits</th>
              <td className="num">{metrics.completedVisits}</td>
              <td className="num">{completedPct.toFixed(1)}%</td>
              <td>Patient attended and visit was concluded</td>
            </tr>
            <tr>
              <th scope="row">No-Shows</th>
              <td className="num">{metrics.noShows}</td>
              <td className="num">{metrics.noShowRate.toFixed(1)}%</td>
              <td>Patient did not check in or attend without notice</td>
            </tr>
            <tr>
              <th scope="row">Late Cancellations</th>
              <td className="num">{metrics.lateCancellations}</td>
              <td className="num">{metrics.lateCancelRate.toFixed(1)}%</td>
              <td>Cancelled less than 24 hours prior to appointment</td>
            </tr>
            <tr>
              <th scope="row">On-Time Cancellations</th>
              <td className="num">{metrics.onTimeCancellations}</td>
              <td className="num">{onTimeCancelPct.toFixed(1)}%</td>
              <td>Cancelled with &gt;= 24 hours advance notice</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">Total Scheduled</th>
              <td className="num">{metrics.totalScheduled}</td>
              <td className="num">100.0%</td>
              <td>All bookings in selected date range</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
