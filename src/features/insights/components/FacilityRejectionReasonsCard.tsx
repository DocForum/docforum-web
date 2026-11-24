import { useState } from 'react';
import type { FacilityRejectionReason } from '../../../types/models';
import { rejectionReasonLabel } from '../facility-insights';
import { useT } from '../../../i18n/useT';
import styles from './FacilityInsights.module.css';

interface FacilityRejectionReasonsCardProps {
  reasons: FacilityRejectionReason[];
}

const REASON_COLORS = ['var(--color-accent)', '#b87b28', '#d9a94a', '#8c5b00', '#6b4423', '#4a2f18'];

export function FacilityRejectionReasonsCard({ reasons }: FacilityRejectionReasonsCardProps) {
  const t = useT();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const totalRejections = reasons.reduce((sum, reason) => sum + reason.count, 0);
  const maxCount = Math.max(1, ...reasons.map((reason) => reason.count));

  return (
    <section className={styles.card} aria-labelledby="facility-rejections-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-rejections-heading">{t('insights.rejections.title', 'Rejection reasons')}</h2>
          <p>{t('insights.rejections.description', 'Why orders assigned to this facility were rejected in the period.')}</p>
        </div>
        <div className={styles.viewToggle} role="group" aria-label={t('insights.rejections.displayMode', 'Rejection reasons display mode')}>
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

      {reasons.length === 0 ? (
        <p className={styles.statHint}>{t('insights.rejections.empty', 'No rejections in this period.')}</p>
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
                    aria-label={t('insights.rejections.barLabel', '{reason}: {count, plural, one {# reject} other {# rejects}}', {
                      reason: rejectionReasonLabel(reason.code, reason.label),
                      count: reason.count,
                    })}
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
            <table className={styles.dataTable} aria-label={t('insights.rejections.tableLabel', 'Rejection reasons table')}>
              <caption>{t('insights.rejections.tableCaption', 'Rejection reasons for the selected period')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('insights.rejections.colReason', 'Reason')}</th>
                  <th scope="col">{t('insights.rejections.colCode', 'Code')}</th>
                  <th scope="col" className="num">
                    {t('insights.common.count', 'Count')}
                  </th>
                  <th scope="col" className="num">
                    {t('insights.common.percentage', 'Percentage')}
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
                  <th scope="row">{t('insights.rejections.total', 'Total rejections')}</th>
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
