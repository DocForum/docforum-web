import { useState } from 'react';
import type { NoShowMetrics } from '../../../types/models';
import { useFormat } from '../../../i18n/useFormat';
import styles from './PracticeInsights.module.css';

interface NoShowMetricsCardProps {
  metrics: NoShowMetrics;
}

export function NoShowMetricsCard({ metrics }: NoShowMetricsCardProps) {
  const { formatNumber, formatPercent } = useFormat();
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
            Only {formatNumber(metrics.totalScheduled)} total scheduled visits in this period. No-show and late-cancellation percentages may be disproportionately influenced by single events.
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>No-show rate</span>
          <span className={styles.statValue} style={{ color: metrics.noShowRate > 10 ? '#b3261e' : 'inherit' }}>
            {formatPercent(metrics.noShowRate)}
          </span>
          <span className={styles.statHint}>{formatNumber(metrics.noShows)} unattended visits</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Late cancel rate</span>
          <span className={styles.statValue} style={{ color: metrics.lateCancelRate > 10 ? '#b87b28' : 'inherit' }}>
            {formatPercent(metrics.lateCancelRate)}
          </span>
          <span className={styles.statHint}>
            {formatNumber(metrics.lateCancellations)} cancelled within 24h
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Completed visits</span>
          <span className={styles.statValue}>{formatNumber(metrics.completedVisits)}</span>
          <span className={styles.statHint}>{formatPercent(completedPct, 0)} completion</span>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div aria-label="Visit outcome visual distribution">
          <div className={styles.distributionBar} role="img" aria-label="Appointment outcome proportions">
            <div
              className={styles.distributionSegment}
              style={{ width: `${completedPct}%`, background: 'var(--color-accent)' }}
              title={`Completed: ${formatNumber(metrics.completedVisits)} (${formatPercent(completedPct)})`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${noShowPct}%`, background: '#b3261e' }}
              title={`No-shows: ${formatNumber(metrics.noShows)} (${formatPercent(noShowPct)})`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${lateCancelPct}%`, background: '#b87b28' }}
              title={`Late cancellations: ${formatNumber(metrics.lateCancellations)} (${formatPercent(lateCancelPct)})`}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${onTimeCancelPct}%`, background: 'var(--color-surface-hover)' }}
              title={`On-time cancellations: ${formatNumber(metrics.onTimeCancellations)} (${formatPercent(onTimeCancelPct)})`}
            />
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
              <span>Completed ({formatNumber(metrics.completedVisits)})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b3261e' }} />
              <span>No-shows ({formatNumber(metrics.noShows)})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b87b28' }} />
              <span>Late cancels (&lt;24h) ({formatNumber(metrics.lateCancellations)})</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
              <span>On-time cancels ({formatNumber(metrics.onTimeCancellations)})</span>
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
              <td className="num">{formatNumber(metrics.completedVisits)}</td>
              <td className="num">{formatPercent(completedPct)}</td>
              <td>Patient attended and visit was concluded</td>
            </tr>
            <tr>
              <th scope="row">No-Shows</th>
              <td className="num">{formatNumber(metrics.noShows)}</td>
              <td className="num">{formatPercent(metrics.noShowRate)}</td>
              <td>Patient did not check in or attend without notice</td>
            </tr>
            <tr>
              <th scope="row">Late Cancellations</th>
              <td className="num">{formatNumber(metrics.lateCancellations)}</td>
              <td className="num">{formatPercent(metrics.lateCancelRate)}</td>
              <td>Cancelled less than 24 hours prior to appointment</td>
            </tr>
            <tr>
              <th scope="row">On-Time Cancellations</th>
              <td className="num">{formatNumber(metrics.onTimeCancellations)}</td>
              <td className="num">{formatPercent(onTimeCancelPct)}</td>
              <td>Cancelled with &gt;= 24 hours advance notice</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">Total Scheduled</th>
              <td className="num">{formatNumber(metrics.totalScheduled)}</td>
              <td className="num">{formatPercent(100)}</td>
              <td>All bookings in selected date range</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
