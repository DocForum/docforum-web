import { useState } from 'react';
import type { FacilityVolumeDay } from '../../../types/models';
import { useLocaleStore } from '../../../store/locale-store';
import { useT } from '../../../i18n/useT';
import styles from './FacilityInsights.module.css';

interface FacilityVolumeChartProps {
  days: FacilityVolumeDay[];
}

const BAR_COLORS = {
  received: 'var(--color-accent)',
  fulfilled: '#2f855a',
  rejected: '#b45309',
} as const;

/** Month/day names come from Intl, never from a translated string table. */
function formatDayLabel(iso: string, locale?: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function FacilityVolumeChart({ days }: FacilityVolumeChartProps) {
  const t = useT();
  const locale = useLocaleStore((state) => state.formattingLocale);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const seriesLabels = {
    received: t('insights.volume.seriesReceived', 'Received'),
    fulfilled: t('insights.volume.seriesFulfilled', 'Fulfilled'),
    rejected: t('insights.volume.seriesRejected', 'Rejected'),
  };

  const maxValue = Math.max(1, ...days.flatMap((d) => [d.received, d.fulfilled, d.rejected]));

  return (
    <section className={styles.card} aria-labelledby="facility-volume-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-volume-heading">{t('insights.volume.title', 'Order volume by day')}</h2>
          <p>{t('insights.volume.description', 'Orders received, fulfilled and rejected on each day in the period.')}</p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label={t('insights.volume.displayMode', 'Volume display mode')}>
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

      {days.length === 0 ? (
        <p className={styles.statHint}>{t('insights.volume.empty', 'No order volume recorded in this period.')}</p>
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
                  aria-label={t('insights.volume.chartLabel', 'Order volume by day')}
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
                                {t('insights.volume.barTitle', '{day} — {series}: {value}', {
                                  day: formatDayLabel(day.date, locale),
                                  series: seriesLabels[bar.key],
                                  value: bar.value,
                                })}
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
                          {formatDayLabel(day.date, locale)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className={styles.volumeLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.received }} />
                  <span>{seriesLabels.received}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.fulfilled }} />
                  <span>{seriesLabels.fulfilled}</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: BAR_COLORS.rejected }} />
                  <span>{seriesLabels.rejected}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className={viewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
            <table className={styles.dataTable} aria-label={t('insights.volume.tableLabel', 'Order volume by day table')}>
              <caption>{t('insights.volume.tableCaption', 'Daily order volume for the selected period')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('insights.volume.colDate', 'Date')}</th>
                  <th scope="col" className="num">
                    {seriesLabels.received}
                  </th>
                  <th scope="col" className="num">
                    {seriesLabels.fulfilled}
                  </th>
                  <th scope="col" className="num">
                    {seriesLabels.rejected}
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{formatDayLabel(day.date, locale)}</th>
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
