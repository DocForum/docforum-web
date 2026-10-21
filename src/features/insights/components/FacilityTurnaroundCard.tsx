import { useState } from 'react';
import type { FacilityTurnaroundMetrics } from '../../../types/models';
import { formatHours } from '../facility-insights';
import styles from './FacilityInsights.module.css';

interface FacilityTurnaroundCardProps {
  metrics: FacilityTurnaroundMetrics;
}

export function FacilityTurnaroundCard({ metrics }: FacilityTurnaroundCardProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const total = Math.max(1, metrics.fulfilledCount);
  const pct = (n: number) => (n / total) * 100;
  const within1hPct = pct(metrics.within1h);
  const within4hPct = pct(metrics.within4h - metrics.within1h);
  const within24hPct = pct(metrics.within24h - metrics.within4h);
  const over24hPct = pct(metrics.over24h);

  const buckets = [
    { label: 'Under 1 hour', count: metrics.within1h, pct: within1hPct, color: 'var(--color-accent)' },
    { label: '1 to 4 hours', count: metrics.within4h - metrics.within1h, pct: within4hPct, color: '#b87b28' },
    { label: '4 to 24 hours', count: metrics.within24h - metrics.within4h, pct: within24hPct, color: '#d9a94a' },
    { label: 'Over 24 hours', count: metrics.over24h, pct: over24hPct, color: '#8c5b00' },
  ];

  return (
    <section className={styles.card} aria-labelledby="facility-turnaround-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-turnaround-heading">Turnaround time</h2>
          <p>
            Time from when an order is assigned to this facility to when it is fulfilled.
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Turnaround display mode">
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

      {metrics.sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>Small sample</span>
          <span>Only {metrics.fulfilledCount} orders fulfilled in this period. Turnaround figures may be skewed.</span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Median turnaround</span>
          <span className={styles.statValue}>{formatHours(metrics.medianHours)}</span>
          <span className={styles.statHint}>Half of orders fulfilled faster</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>90th percentile</span>
          <span className={styles.statValue}>{formatHours(metrics.p90Hours)}</span>
          <span className={styles.statHint}>90% fulfilled within this</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Fulfilled</span>
          <span className={styles.statValue}>{metrics.fulfilledCount}</span>
          <span className={styles.statHint}>
            Range {formatHours(metrics.minHours)} – {formatHours(metrics.maxHours)}
          </span>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div>
          <span className={styles.statLabel}>Fulfilment speed distribution</span>
          <div className={styles.distributionBar} role="img" aria-label="Turnaround distribution">
            {buckets.map((bucket) => (
              <div
                key={bucket.label}
                className={styles.distributionSegment}
                style={{ width: `${bucket.pct}%`, background: bucket.color }}
                title={`${bucket.label}: ${bucket.count}`}
              />
            ))}
          </div>
          <div className={styles.chartLegend}>
            {buckets.map((bucket) => (
              <div key={bucket.label} className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: bucket.color }} />
                <span>
                  {bucket.label} ({bucket.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label="Turnaround time bucket table">
          <caption>Distribution of orders by time to fulfilment</caption>
          <thead>
            <tr>
              <th scope="col">Fulfilment bucket</th>
              <th scope="col" className="num">
                Orders
              </th>
              <th scope="col" className="num">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.label}>
                <th scope="row">{bucket.label}</th>
                <td className="num">{bucket.count}</td>
                <td className="num">{bucket.pct.toFixed(1)}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">Total fulfilled</th>
              <td className="num">{metrics.fulfilledCount}</td>
              <td className="num">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
