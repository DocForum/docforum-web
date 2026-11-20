import type { FacilityDisputeMetrics } from '../../../types/models';
import styles from './FacilityInsights.module.css';

interface FacilityDisputeCardProps {
  metrics: FacilityDisputeMetrics;
}

export function FacilityDisputeCard({ metrics }: FacilityDisputeCardProps) {
  return (
    <section className={styles.card} aria-labelledby="facility-disputes-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-disputes-heading">Dispute rate</h2>
          <p>Share of this facility&apos;s orders that became payment disputes.</p>
        </div>
      </div>

      {metrics.sampleSizeWarning && (
        <div className={styles.caveatBanner} role="note">
          <span className={styles.caveatPill}>Small sample</span>
          <span>
            Only {metrics.totalOrders} orders in this period. Dispute rate may not be representative.
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Dispute rate</span>
          <span className={styles.statValue}>{metrics.disputeRate.toFixed(1)}%</span>
          <span className={styles.statHint}>
            {metrics.disputedOrders} of {metrics.totalOrders} orders
          </span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Open disputes</span>
          <span className={styles.statValue}>{metrics.openDisputes}</span>
          <span className={styles.statHint}>Still unresolved at period end</span>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.statLabel}>Avg resolution</span>
          <span className={styles.statValue}>
            {metrics.averageResolutionHours < 24
              ? `${metrics.averageResolutionHours.toFixed(1)}h`
              : `${(metrics.averageResolutionHours / 24).toFixed(1)}d`}
          </span>
          <span className={styles.statHint}>Time to close a dispute</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.dataTable} aria-label="Dispute outcome breakdown table">
          <caption>How disputes were resolved</caption>
          <thead>
            <tr>
              <th scope="col">Outcome</th>
              <th scope="col" className="num">
                Disputes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Resolved in facility&apos;s favour</th>
              <td className="num">{metrics.resolvedInFacilityFavour}</td>
            </tr>
            <tr>
              <th scope="row">Resolved in patient&apos;s favour</th>
              <td className="num">{metrics.resolvedInPatientFavour}</td>
            </tr>
            <tr>
              <th scope="row">Still open</th>
              <td className="num">{metrics.openDisputes}</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <th scope="row">Total disputes</th>
              <td className="num">{metrics.disputedOrders}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
