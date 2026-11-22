import type { FacilityDisputeMetrics } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './FacilityInsights.module.css';

interface FacilityDisputeCardProps {
  metrics: FacilityDisputeMetrics;
}

export function FacilityDisputeCard({ metrics }: FacilityDisputeCardProps) {
  const t = useT();

  return (
    <section className={styles.card} aria-labelledby="facility-disputes-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-disputes-heading">{t('insights.disputes.title', 'Dispute rate')}</h2>
          <p>{t('insights.disputes.description', 'Share of this facility\'s orders that became payment disputes.')}</p>
        </div>
      </div>

      {metrics.sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>{t('insights.common.smallSample', 'Small sample')}</span>
          <span>
            {t('insights.disputes.smallSample', 'Only {count, plural, one {# order} other {# orders}} in this period. Dispute rate may not be representative.', {
              count: metrics.totalOrders,
            })}
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.disputes.rateLabel', 'Dispute rate')}</span>
          <span className={styles.statValue}>{metrics.disputeRate.toFixed(1)}%</span>
          <span className={styles.statHint}>
            {t('insights.disputes.ofOrders', '{disputed} of {total, plural, one {# order} other {# orders}}', {
              disputed: metrics.disputedOrders,
              total: metrics.totalOrders,
            })}
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.disputes.openLabel', 'Open disputes')}</span>
          <span className={styles.statValue}>{metrics.openDisputes}</span>
          <span className={styles.statHint}>{t('insights.disputes.openHint', 'Still unresolved at period end')}</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>{t('insights.disputes.avgResolutionLabel', 'Avg resolution')}</span>
          <span className={styles.statValue}>
            {metrics.averageResolutionHours < 24
              ? t('insights.common.hoursShort', '{value}h', { value: metrics.averageResolutionHours.toFixed(1) })
              : t('insights.common.daysShort', '{value}d', { value: (metrics.averageResolutionHours / 24).toFixed(1) })}
          </span>
          <span className={styles.statHint}>{t('insights.disputes.avgResolutionHint', 'Time to close a dispute')}</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.dataTable} aria-label={t('insights.disputes.tableLabel', 'Dispute outcome breakdown table')}>
          <caption>{t('insights.disputes.tableCaption', 'How disputes were resolved')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('insights.disputes.colOutcome', 'Outcome')}</th>
              <th scope="col" className="num">
                {t('insights.disputes.colDisputes', 'Disputes')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t('insights.disputes.resolvedFacility', 'Resolved in facility\'s favour')}</th>
              <td className="num">{metrics.resolvedInFacilityFavour}</td>
            </tr>
            <tr>
              <th scope="row">{t('insights.disputes.resolvedPatient', 'Resolved in patient\'s favour')}</th>
              <td className="num">{metrics.resolvedInPatientFavour}</td>
            </tr>
            <tr>
              <th scope="row">{t('insights.disputes.stillOpen', 'Still open')}</th>
              <td className="num">{metrics.openDisputes}</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">{t('insights.disputes.totalDisputes', 'Total disputes')}</th>
              <td className="num">{metrics.disputedOrders}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
