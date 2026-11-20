import { useState } from 'react';
import type { FacilityVolumeDay } from '../../../types/models';
import styles from './FacilityInsights.module.css';

interface FacilityVolumeChartProps {
  days: FacilityVolumeDay[];
}

const BAR_COLORS = {
  received: 'var(--color-accent)',
  fulfilled: '#2f855a',
  rejected: '#b45309',
} as const;

function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function FacilityVolumeChart({ days }: FacilityVolumeChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const maxValue = Math.max(1, ...days.flatMap((d) => [d.received, d.fulfilled, d.rejected]));

  return (
    <section className={styles.card} aria-labelledby="facility-volume-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-volume-heading">Order volume by day</h2>
          <p>Orders received, fulfilled and rejected on each day in the period.</p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Volume display mode">
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

      {days.length === 0 ? (
        <p className={styles.statHint}>No order volume recorded in this period.</p>
      ) : (
        <>
          {viewMode === 'chart' ? (
            <div>
              <div className={styles.chartContainer}>
                <svg
                  className={styles.volumeChart}
                  viewBox={`0 0 ${days.length * 40} 200`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Order volume by day"
                >
                  {days.map((day, index) => {
                    const groupX = index * 40;
                    const bars: { key: keyof typeof BAR_COLORS; value: number }[] = [
                      { key: 'received', value: day.received },
                      { key: 'fulfilled', value: day.fulfilled },
                      { key: 'rejected', value: day.rejected },
                    ];
                    return (
                      <g key={day.date}>
                        {bars.map((bar, barIndex) => {
                          const height = (bar.value / maxValue) * 160;
                          return (
                            <rect
                              key={bar.key}
                              x={groupX + 6 + barIndex * 10}
                              y={172 - height}
                              width={8}
                              height={height}
                              fill={BAR_COLORS[bar.key]}
                              rx={1.5}
                            >
                              <title>
                                {formatDayLabel(day.date)} — {bar.key}: {bar.value}
                              </title>
                            </rect>
                          );
                        })}
                        <text
                          x={groupX + 20}
                          y={190}
                          textAnchor="middle"
                          fontSize="8"
                          fill="var(--color-text-muted)"
                        >
                          {formatDayLabel(day.date)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className={styles.volumeLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.received }} />
                  <span>Received</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.fulfilled }} />
                  <span>Fulfilled</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.rejected }} />
                  <span>Rejected</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
            <table className={styles.dataTable} aria-label="Order volume by day table">
              <caption>Daily order volume for the selected period</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">
                    Received
                  </th>
                  <th scope="col" className="num">
                    Fulfilled
                  </th>
                  <th scope="col" className="num">
                    Rejected
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{formatDayLabel(day.date)}</th>
                    <td className="num">{day.received}</td>
                    <td className="num">{day.fulfilled}</td>
                    <td className="num">{day.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
