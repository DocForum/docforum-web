import { useState } from 'react';
import type { NoShowMetrics } from '../../../types/models';
import { useFormat } from '../../../i18n/useFormat';
import { useT } from '../../../i18n/useT';
import styles from './PracticeInsights.module.css';

interface NoShowMetricsCardProps {
  metrics: NoShowMetrics;
}

export function NoShowMetricsCard({ metrics }: NoShowMetricsCardProps) {
  const { formatNumber, formatPercent } = useFormat();
  const t = useT();
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
          <h2 id="noshow-heading">{t('insights.noShow.title', 'No-show and cancellation rates')}</h2>
          <p className={styles.cardSubtitle}>
            {t('insights.noShow.subtitle', 'Patient attendance patterns and late cancellation turnaround.')}
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label={t('insights.noShow.displayMode', 'No-show display mode')}>
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'visual' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('visual')}
            aria-pressed={viewMode === 'visual'}
          >
            {t('insights.noShow.visualOverview', 'Visual overview')}
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'table' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            {t('insights.common.tableView', 'Table view')}
          </button>
        </div>
      </div>

      {metrics.sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>{t('insights.common.smallSampleCaveat', 'Small sample caveat')}</span>
          <span>
            {t('insights.noShow.smallSample', 'Only {count, plural, one {# total scheduled visit} other {# total scheduled visits}} in this period. No-show and late-cancellation percentages may be disproportionately influenced by single events.', {
              count: metrics.totalScheduled,
            })}
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.noShow.rateLabel', 'No-show rate')}</span>
          <span className={styles.statValue} style={{ color: metrics.noShowRate > 10 ? '#b3261e' : 'inherit' }}>
            {formatPercent(metrics.noShowRate)}
          </span>
          <span className={styles.statHint}>
            {t('insights.noShow.unattendedVisits', '{count, plural, one {# unattended visit} other {# unattended visits}}', {
              count: metrics.noShows,
            })}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.noShow.lateCancelRateLabel', 'Late cancel rate')}</span>
          <span className={styles.statValue} style={{ color: metrics.lateCancelRate > 10 ? '#b87b28' : 'inherit' }}>
            {formatPercent(metrics.lateCancelRate)}
          </span>
          <span className={styles.statHint}>
            {t('insights.noShow.cancelledWithin24h', '{count} cancelled within 24h', {
              count: metrics.lateCancellations,
            })}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.noShow.completedLabel', 'Completed visits')}</span>
          <span className={styles.statValue}>{formatNumber(metrics.completedVisits)}</span>
          <span className={styles.statHint}>
            {t('insights.noShow.completion', '{value} completion', { value: formatPercent(completedPct, 0) })}
          </span>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div aria-label={t('insights.noShow.visualLabel', 'Visit outcome visual distribution')}>
          <div className={styles.distributionBar} role="img" aria-label={t('insights.noShow.barLabel', 'Appointment outcome proportions')}>
            <div
              className={styles.distributionSegment}
              style={{ width: `${completedPct}%`, background: 'var(--color-accent)' }}
              title={t('insights.common.segmentTitle', '{label}: {count} ({percent})', {
                label: t('insights.noShow.legendCompleted', 'Completed'),
                count: formatNumber(metrics.completedVisits),
                percent: formatPercent(completedPct),
              })}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${noShowPct}%`, background: '#b3261e' }}
              title={t('insights.common.segmentTitle', '{label}: {count} ({percent})', {
                label: t('insights.noShow.legendNoShows', 'No-shows'),
                count: formatNumber(metrics.noShows),
                percent: formatPercent(noShowPct),
              })}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${lateCancelPct}%`, background: '#b87b28' }}
              title={t('insights.common.segmentTitle', '{label}: {count} ({percent})', {
                label: t('insights.noShow.legendLateCancels', 'Late cancellations'),
                count: formatNumber(metrics.lateCancellations),
                percent: formatPercent(lateCancelPct),
              })}
            />
            <div
              className={styles.distributionSegment}
              style={{ width: `${onTimeCancelPct}%`, background: 'var(--color-surface-hover)' }}
              title={t('insights.common.segmentTitle', '{label}: {count} ({percent})', {
                label: t('insights.noShow.legendOnTimeCancels', 'On-time cancellations'),
                count: formatNumber(metrics.onTimeCancellations),
                percent: formatPercent(onTimeCancelPct),
              })}
            />
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
              <span>
                {t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.noShow.legendCompleted', 'Completed'),
                  count: formatNumber(metrics.completedVisits),
                })}
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b3261e' }} />
              <span>
                {t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.noShow.legendNoShows', 'No-shows'),
                  count: formatNumber(metrics.noShows),
                })}
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#b87b28' }} />
              <span>
                {t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.noShow.legendLateCancelsShort', 'Late cancels (<24h)'),
                  count: formatNumber(metrics.lateCancellations),
                })}
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
              <span>
                {t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.noShow.legendOnTimeCancelsShort', 'On-time cancels'),
                  count: formatNumber(metrics.onTimeCancellations),
                })}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label={t('insights.noShow.tableLabel', 'Appointment attendance and cancellation metrics table')}>
          <caption>{t('insights.noShow.tableCaption', 'Detailed count and proportion breakdown for appointments in selected period')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('insights.noShow.colStatus', 'Status / Outcome')}</th>
              <th scope="col" className="num">{t('insights.common.count', 'Count')}</th>
              <th scope="col" className="num">{t('insights.noShow.colProportion', 'Proportion of Scheduled')}</th>
              <th scope="col">{t('insights.noShow.colNotes', 'Notes')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t('insights.noShow.rowCompleted', 'Completed Visits')}</th>
              <td className="num">{formatNumber(metrics.completedVisits)}</td>
              <td className="num">{formatPercent(completedPct)}</td>
              <td>{t('insights.noShow.noteCompleted', 'Patient attended and visit was concluded')}</td>
            </tr>
            <tr>
              <th scope="row">{t('insights.noShow.rowNoShows', 'No-Shows')}</th>
              <td className="num">{formatNumber(metrics.noShows)}</td>
              <td className="num">{formatPercent(metrics.noShowRate)}</td>
              <td>{t('insights.noShow.noteNoShows', 'Patient did not check in or attend without notice')}</td>
            </tr>
            <tr>
              <th scope="row">{t('insights.noShow.rowLateCancellations', 'Late Cancellations')}</th>
              <td className="num">{formatNumber(metrics.lateCancellations)}</td>
              <td className="num">{formatPercent(metrics.lateCancelRate)}</td>
              <td>{t('insights.noShow.noteLateCancellations', 'Cancelled less than 24 hours prior to appointment')}</td>
            </tr>
            <tr>
              <th scope="row">{t('insights.noShow.rowOnTimeCancellations', 'On-Time Cancellations')}</th>
              <td className="num">{formatNumber(metrics.onTimeCancellations)}</td>
              <td className="num">{formatPercent(onTimeCancelPct)}</td>
              <td>{t('insights.noShow.noteOnTimeCancellations', 'Cancelled with >= 24 hours advance notice')}</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">{t('insights.noShow.rowTotalScheduled', 'Total Scheduled')}</th>
              <td className="num">{formatNumber(metrics.totalScheduled)}</td>
              <td className="num">{formatPercent(100)}</td>
              <td>{t('insights.noShow.noteTotalScheduled', 'All bookings in selected date range')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
