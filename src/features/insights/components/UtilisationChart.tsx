import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { UtilisationWeek } from '../../../types/models';
import { useFormat } from '../../../i18n/useFormat';
import { useT } from '../../../i18n/useT';
import styles from './PracticeInsights.module.css';
import { formatInstant } from '../../../i18n/format';

interface UtilisationChartProps {
  weeks: UtilisationWeek[];
  overallOfferedSlots: number;
  overallBookedSlots: number;
  overallUtilisationRate: number;
  sampleSizeWarning: boolean;
}

/** Week labels use Intl month names for the active locale. */
function formatWeekLabel(week: UtilisationWeek, locale?: string): string {
  const date = new Date(`${week.startDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return week.weekLabel;
  return formatInstant(date, {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }, locale);
}

export function UtilisationChart({
  weeks,
  overallOfferedSlots,
  overallBookedSlots,
  overallUtilisationRate,
  sampleSizeWarning,
}: UtilisationChartProps) {
  const { formatDate, formatNumber, formatPercent } = useFormat();
  const { locale } = useIntl();
  const t = useT();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const maxSlots = Math.max(1, ...weeks.map((w) => Math.max(w.offeredSlots, w.bookedSlots)));
  const offeredLabel = t('insights.utilisation.offeredSlots', 'Offered slots');
  const bookedLabel = t('insights.utilisation.bookedSlots', 'Booked slots');

  return (
    <section className={styles.card} aria-labelledby="utilisation-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="utilisation-heading">{t('insights.utilisation.title', 'Slot utilisation by week')}</h2>
          <p className={styles.cardSubtitle}>
            {t('insights.utilisation.subtitle', 'How efficiently your appointment calendar slots were booked across weeks.')}
          </p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label={t('insights.utilisation.displayMode', 'Utilisation view display mode')}>
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

      {sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>{t('insights.common.smallSampleCaveat', 'Small sample caveat')}</span>
          <span>
            {t('insights.utilisation.smallSample', 'Only {count, plural, one {# slot} other {# slots}} offered in this period. Percentage utilisation figures can fluctuate significantly with limited data points.', {
              count: overallOfferedSlots,
            })}
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{offeredLabel}</span>
          <span className={styles.statValue}>{formatNumber(overallOfferedSlots)}</span>
          <span className={styles.statHint}>{t('insights.utilisation.totalAvailability', 'Total availability')}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{bookedLabel}</span>
          <span className={styles.statValue}>{formatNumber(overallBookedSlots)}</span>
          <span className={styles.statHint}>{t('insights.utilisation.patientReservations', 'Patient reservations')}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.utilisation.rateLabel', 'Utilisation rate')}</span>
          <span className={styles.statValue}>{formatPercent(overallUtilisationRate)}</span>
          <span className={styles.statHint}>{t('insights.utilisation.rateHint', 'Booked / Offered')}</span>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className={styles.chartContainer}>
          <svg
            className={styles.svgChart}
            viewBox="0 0 600 240"
            role="img"
            aria-label={t('insights.utilisation.chartLabel', 'Bar chart showing weekly offered vs booked slots')}
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

              // The chart has one accessible name; the adjacent table is
              // the keyboard/screen-reader source of detail. Individual bars
              // must not be focusable.
              return (
                <g key={w.weekLabel} aria-hidden="true">
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
                    {formatPercent(w.utilisationRate, 0)}
                  </text>
                  {/* X axis week label — week labels are data supplied by the API */}
                  <text
                    x={xCenter}
                    y="210"
                    fontSize="11"
                    fill="var(--color-text-muted)"
                    textAnchor="middle"
                  >
                    {formatWeekLabel(w, locale)}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
              <span>{offeredLabel}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
              <span>{bookedLabel}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Accessible Table alternative (rendered when table view is active, and also available for screen readers) */}
      <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
        <table className={styles.dataTable} aria-label={t('insights.utilisation.tableLabel', 'Weekly slot utilisation data table')}>
          <caption>{t('insights.utilisation.tableCaption', 'Weekly breakdown of offered vs booked slots and utilisation percentage')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('insights.utilisation.colWeek', 'Week')}</th>
              <th scope="col">{t('insights.utilisation.colDateRange', 'Date Range')}</th>
              <th scope="col" className="num">{t('insights.utilisation.colOffered', 'Offered')}</th>
              <th scope="col" className="num">{t('insights.utilisation.colBooked', 'Booked')}</th>
              <th scope="col" className="num">{t('insights.utilisation.colCompleted', 'Completed')}</th>
              <th scope="col" className="num">{t('insights.utilisation.colUtilisation', 'Utilisation')}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekLabel}>
                <th scope="row">{formatWeekLabel(w, locale)}</th>
                <td>
                  {formatDate(w.startDate)} – {formatDate(w.endDate)}
                </td>
                <td className="num">{formatNumber(w.offeredSlots)}</td>
                <td className="num">{formatNumber(w.bookedSlots)}</td>
                <td className="num">{formatNumber(w.completedSlots)}</td>
                <td className="num">{formatPercent(w.utilisationRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
