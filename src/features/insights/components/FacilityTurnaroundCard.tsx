import { useState } from 'react';
import type { FacilityTurnaroundMetrics } from '../../../types/models';
import { formatHours } from '../facility-insights';
import { useT } from '../../../i18n/useT';
import styles from './FacilityInsights.module.css';

interface FacilityTurnaroundCardProps {
  metrics: FacilityTurnaroundMetrics;
}

export function FacilityTurnaroundCard({ metrics }: FacilityTurnaroundCardProps) {
  const t = useT();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const total = Math.max(1, metrics.fulfilledCount);
  const pct = (n: number) => (n / total) * 100;
  const within1hPct = pct(metrics.within1h);
  const within4hPct = pct(metrics.within4h - metrics.within1h);
  const within24hPct = pct(metrics.within24h - metrics.within4h);
  const over24hPct = pct(metrics.over24h);

  const buckets = [
    { id: 'under1h', label: t('insights.turnaround.bucketUnder1h', 'Under 1 hour'), count: metrics.within1h, pct: within1hPct, color: 'var(--color-accent)' },
    { id: '1to4h', label: t('insights.turnaround.bucket1to4h', '1 to 4 hours'), count: metrics.within4h - metrics.within1h, pct: within4hPct, color: '#b87b28' },
    { id: '4to24h', label: t('insights.turnaround.bucket4to24h', '4 to 24 hours'), count: metrics.within24h - metrics.within4h, pct: within24hPct, color: '#d9a94a' },
    { id: 'over24h', label: t('insights.turnaround.bucketOver24h', 'Over 24 hours'), count: metrics.over24h, pct: over24hPct, color: '#8c5b00' },
  ];

  return (
    <section className={styles.card} aria-labelledby="facility-turnaround-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-turnaround-heading">{t('insights.turnaround.title', 'Turnaround time')}</h2>
          <p>
            {t('insights.turnaround.description', 'Time from when an order is assigned to this facility to when it is fulfilled.')}
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label={t('insights.turnaround.displayMode', 'Turnaround display mode')}>
          <button
            type="button"
            className={`${styles.toggleButton} ${viewMode === 'chart' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('chart')}
            aria-pressed={viewMode === 'chart'}
          >
            {t('insights.common.chartView', 'Chart view')}
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
          <span className={styles.caveatPill}>{t('insights.common.smallSample', 'Small sample')}</span>
          <span>
            {t('insights.turnaround.smallSample', 'Only {count, plural, one {# order} other {# orders}} fulfilled in this period. Turnaround figures may be skewed.', {
              count: metrics.fulfilledCount,
            })}
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.turnaround.medianLabel', 'Median turnaround')}</span>
          <span className={styles.statValue}>{formatHours(metrics.medianHours)}</span>
          <span className={styles.statHint}>{t('insights.turnaround.medianHint', 'Half of orders fulfilled faster')}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.turnaround.p90Label', '90th percentile')}</span>
          <span className={styles.statValue}>{formatHours(metrics.p90Hours)}</span>
          <span className={styles.statHint}>{t('insights.turnaround.p90Hint', '90% fulfilled within this')}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.turnaround.fulfilledLabel', 'Fulfilled')}</span>
          <span className={styles.statValue}>{metrics.fulfilledCount}</span>
          <span className={styles.statHint}>
            {t('insights.turnaround.range', 'Range {min} – {max}', {
              min: formatHours(metrics.minHours),
              max: formatHours(metrics.maxHours),
            })}
          </span>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div>
          <span className={styles.statLabel}>{t('insights.turnaround.distributionLabel', 'Fulfilment speed distribution')}</span>
          <div className={styles.distributionBar} role="img" aria-label={t('insights.turnaround.distributionAriaLabel', 'Turnaround distribution')}>
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className={styles.distributionSegment}
                style={{ width: `${bucket.pct}%`, background: bucket.color }}
                title={t('insights.common.labelCount', '{label}: {count}', { label: bucket.label, count: bucket.count })}
              />
            ))}
          </div>
          <div className={styles.chartLegend}>
            {buckets.map((bucket) => (
              <div key={bucket.id} className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: bucket.color }} />
                <span>
                  {t('insights.common.labelWithCount', '{label} ({count})', { label: bucket.label, count: bucket.count })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label={t('insights.turnaround.tableLabel', 'Turnaround time bucket table')}>
          <caption>{t('insights.turnaround.tableCaption', 'Distribution of orders by time to fulfilment')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('insights.turnaround.colBucket', 'Fulfilment bucket')}</th>
              <th scope="col" className="num">
                {t('insights.common.orders', 'Orders')}
              </th>
              <th scope="col" className="num">
                {t('insights.common.percentage', 'Percentage')}
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.id}>
                <th scope="row">{bucket.label}</th>
                <td className="num">{bucket.count}</td>
                <td className="num">{bucket.pct.toFixed(1)}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">{t('insights.turnaround.totalFulfilled', 'Total fulfilled')}</th>
              <td className="num">{metrics.fulfilledCount}</td>
              <td className="num">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
