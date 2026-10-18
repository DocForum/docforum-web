import { useState } from 'react';
import type { UtilisationWeek } from '../../../types/models';
import styles from './PracticeInsights.module.css';

interface UtilisationChartProps {
  weeks: UtilisationWeek[];
  overallOfferedSlots: number;
  overallBookedSlots: number;
  overallUtilisationRate: number;
  sampleSizeWarning: boolean;
}

export function UtilisationChart({
  weeks,
  overallOfferedSlots,
  overallBookedSlots,
  overallUtilisationRate,
  sampleSizeWarning,
}: UtilisationChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const maxSlots = Math.max(1, ...weeks.map((w) => Math.max(w.offeredSlots, w.bookedSlots)));

  return (
    <section className={styles.card} aria-labelledby="utilisation-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="utilisation-heading">Slot utilisation by week</h2>
          <p className={styles.cardSubtitle}>
            How efficiently your appointment calendar slots were booked across weeks.
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Utilisation view display mode">
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

      {sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>Small sample caveat</span>
          <span>
            Only {overallOfferedSlots} slots offered in this period. Percentage utilisation figures can fluctuate significantly with limited data points.
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Offered slots</span>
          <span className={styles.statValue}>{overallOfferedSlots}</span>
          <span className={styles.statHint}>Total availability</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Booked slots</span>
          <span className={styles.statValue}>{overallBookedSlots}</span>
          <span className={styles.statHint}>Patient reservations</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Utilisation rate</span>
          <span className={styles.statValue}>{overallUtilisationRate.toFixed(1)}%</span>
          <span className={styles.statHint}>Booked / Offered</span>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className={styles.chartContainer}>
          <svg
            className={styles.svgChart}
            viewBox="0 0 600 240"
            role="img"
            aria-label="Bar chart showing weekly offered vs booked slots"
          >
            {/* Horizontal baseline */}
            <line x1="40" y1="190" x2="580" y2="190" stroke="var(--color-border)" strokeWidth="1" />
            <line x1="40" y1="100" x2="580" y2="100" stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
            <line x1="40" y1="20" x2="580" y2="20" stroke="var(--color-border-subtle)" strokeDasharray="3 3" />

            {/* Y axis labels */}
            <text x="32" y="194" fontSize="11" fill="var(--color-text-muted)" textAnchor="end">0</text>
            <text x="32" y="104" fontSize="11" fill="var(--color-text-muted)" textAnchor="end">{Math.round(maxSlots / 2)}</text>
            <text x="32" y="24" fontSize="11" fill="var(--color-text-muted)" textAnchor="end">{maxSlots}</text>

            {/* Bars for each week */}
            {weeks.map((w, idx) => {
              const count = Math.max(1, weeks.length);
              const groupWidth = 520 / count;
              const xCenter = 50 + idx * groupWidth + groupWidth / 2;
              const barWidth = Math.min(24, groupWidth / 2.5);

              const offeredHeight = Math.max(2, (w.offeredSlots / maxSlots) * 160);
              const bookedHeight = Math.max(2, (w.bookedSlots / maxSlots) * 160);

              const offeredY = 190 - offeredHeight;
              const bookedY = 190 - bookedHeight;

              return (
                <g key={w.weekLabel} tabIndex={0} aria-label={`${w.weekLabel}: ${w.bookedSlots} of ${w.offeredSlots} slots booked (${w.utilisationRate.toFixed(1)}%)`}>
                  {/* Offered slot bar (surface/accent light) */}
                  <rect
                    x={xCenter - barWidth - 2}
                    y={offeredY}
                    width={barWidth}
                    height={offeredHeight}
                    rx="3"
                    fill="var(--color-surface-hover)"
                    stroke="var(--color-border)"
                  />
                  {/* Booked slot bar (accent pine green) */}
                  <rect
                    x={xCenter + 2}
                    y={bookedY}
                    width={barWidth}
                    height={bookedHeight}
                    rx="3"
                    fill="var(--color-accent)"
                  />
                  {/* Rate label above bars */}
                  <text
                    x={xCenter}
                    y={Math.min(offeredY, bookedY) - 6}
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--color-text)"
                    textAnchor="middle"
                  >
                    {w.utilisationRate.toFixed(0)}%
                  </text>
                  {/* X axis week label */}
                  <text
                    x={xCenter}
                    y="210"
                    fontSize="11"
                    fill="var(--color-text-muted)"
                    textAnchor="middle"
                  >
                    {w.weekLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
              <span>Offered slots</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
              <span>Booked slots</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Accessible Table alternative (rendered when table view is active, and also available for screen readers) */}
      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label="Weekly slot utilisation data table">
          <caption>Weekly breakdown of offered vs booked slots and utilisation percentage</caption>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col">Date Range</th>
              <th scope="col" className="num">Offered</th>
              <th scope="col" className="num">Booked</th>
              <th scope="col" className="num">Completed</th>
              <th scope="col" className="num">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekLabel}>
                <th scope="row">{w.weekLabel}</th>
                <td>{w.startDate} to {w.endDate}</td>
                <td className="num">{w.offeredSlots}</td>
                <td className="num">{w.bookedSlots}</td>
                <td className="num">{w.completedSlots}</td>
                <td className="num">{w.utilisationRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
