import { useState } from 'react';
import type { ReferralTurnaroundMetrics, MessageResponseMetrics } from '../../../types/models';
import { useFormat } from '../../../i18n/useFormat';
import styles from './PracticeInsights.module.css';

interface TurnaroundMetricsCardProps {
  referrals: ReferralTurnaroundMetrics;
  messages: MessageResponseMetrics;
}

export function TurnaroundMetricsCard({ referrals, messages }: TurnaroundMetricsCardProps) {
  const { formatDuration, formatNumber, formatPercent } = useFormat();
  const [refViewMode, setRefViewMode] = useState<'chart' | 'table'>('chart');
  const [msgViewMode, setMsgViewMode] = useState<'chart' | 'table'>('chart');

  const refTotal = Math.max(1, referrals.totalAccepted);
  const refUnder24Pct = (referrals.breakdownUnder24h / refTotal) * 100;
  const ref24to48Pct = (referrals.breakdown24to48h / refTotal) * 100;
  const refOver48Pct = (referrals.breakdownOver48h / refTotal) * 100;

  const msgTotal = Math.max(1, messages.totalThreads);
  const msgWithin2hPct = (messages.respondedWithin2hCount / msgTotal) * 100;
  const msg2to24hPct = ((messages.respondedWithin24hCount - messages.respondedWithin2hCount) / msgTotal) * 100;
  const msgOver24hPct = Math.max(0, 100 - msgWithin2hPct - msg2to24hPct);

  return (
    <div className={styles.gridTwoCols}>
      {/* Referral Turnaround Section */}
      <section className={styles.card} aria-labelledby="referrals-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="referrals-heading">Referral acceptance turnaround</h2>
            <p className={styles.cardSubtitle}>
              Time from when you issue a referral to when the receiving specialist/facility accepts it.
            </p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label="Referral display mode">
            <button
              type="button"
              className={`${styles.toggleButton} ${refViewMode === 'chart' ? styles.toggleButtonActive : ''}`}
              onClick={() => setRefViewMode('chart')}
              aria-pressed={refViewMode === 'chart'}
            >
              Chart view
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${refViewMode === 'table' ? styles.toggleButtonActive : ''}`}
              onClick={() => setRefViewMode('table')}
              aria-pressed={refViewMode === 'table'}
            >
              Table view
            </button>
          </div>
        </div>

        {referrals.sampleSizeWarning && (
          <div className={styles.caveatBanner} role="note">
            <span className={styles.caveatPill}>Small sample caveat</span>
            <span>
              Only {formatNumber(referrals.totalSent)} referrals issued in this period. Turnaround averages may be skewed by anomalous delays.
            </span>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>Median acceptance</span>
            <span className={styles.statValue}>
              {referrals.medianAcceptanceHours < 24
                ? formatDuration(referrals.medianAcceptanceHours, 'hour')
                : formatDuration(referrals.medianAcceptanceHours / 24, 'day')}
            </span>
            <span className={styles.statHint}>50% accepted faster than this</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>Average turnaround</span>
            <span className={styles.statValue}>
              {referrals.averageAcceptanceHours < 24
                ? formatDuration(referrals.averageAcceptanceHours, 'hour')
                : formatDuration(referrals.averageAcceptanceHours / 24, 'day')}
            </span>
            <span className={styles.statHint}>
              {formatNumber(referrals.totalAccepted)} of {formatNumber(referrals.totalSent)} accepted
            </span>
          </div>
        </div>

        {refViewMode === 'chart' ? (
          <div>
            <span className={styles.statLabel}>Turnaround distribution (accepted referrals)</span>
            <div className={styles.distributionBar} role="img" aria-label="Referral turnaround distribution">
              <div
                className={styles.distributionSegment}
                style={{ width: `${refUnder24Pct}%`, background: 'var(--color-accent)' }}
                title={`Under 24 hours: ${formatNumber(referrals.breakdownUnder24h)}`}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${ref24to48Pct}%`, background: '#b87b28' }}
                title={`24 to 48 hours: ${formatNumber(referrals.breakdown24to48h)}`}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${refOver48Pct}%`, background: '#8c5b00' }}
                title={`Over 48 hours: ${formatNumber(referrals.breakdownOver48h)}`}
              />
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
                <span>&lt;24h ({formatNumber(referrals.breakdownUnder24h)})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#b87b28' }} />
                <span>24–48h ({formatNumber(referrals.breakdown24to48h)})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#8c5b00' }} />
                <span>&gt;48h ({formatNumber(referrals.breakdownOver48h)})</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className={refViewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
          <table className={styles.dataTable} aria-label="Referral turnaround breakdown table">
            <caption>Referral acceptance time breakdown for period</caption>
            <thead>
              <tr>
                <th scope="col">Turnaround bucket</th>
                <th scope="col" className="num">Count</th>
                <th scope="col" className="num">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Under 24 hours</th>
                <td className="num">{formatNumber(referrals.breakdownUnder24h)}</td>
                <td className="num">{formatPercent(refUnder24Pct)}</td>
              </tr>
              <tr>
                <th scope="row">24 to 48 hours</th>
                <td className="num">{formatNumber(referrals.breakdown24to48h)}</td>
                <td className="num">{formatPercent(ref24to48Pct)}</td>
              </tr>
              <tr>
                <th scope="row">Over 48 hours</th>
                <td className="num">{formatNumber(referrals.breakdownOver48h)}</td>
                <td className="num">{formatPercent(refOver48Pct)}</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <th scope="row">Total Accepted</th>
                <td className="num">{formatNumber(referrals.totalAccepted)}</td>
                <td className="num">{formatPercent(100)}</td>
              </tr>
              <tr>
                <th scope="row">Pending Acceptance</th>
                <td className="num">{formatNumber(referrals.totalPending)}</td>
                <td className="num">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Messages Response Time Section */}
      <section className={styles.card} aria-labelledby="messages-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="messages-heading">Messages response time</h2>
            <p className={styles.cardSubtitle}>
              Speed of your initial reply to patient inquiry threads.
            </p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label="Message response display mode">
            <button
              type="button"
              className={`${styles.toggleButton} ${msgViewMode === 'chart' ? styles.toggleButtonActive : ''}`}
              onClick={() => setMsgViewMode('chart')}
              aria-pressed={msgViewMode === 'chart'}
            >
              Chart view
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${msgViewMode === 'table' ? styles.toggleButtonActive : ''}`}
              onClick={() => setMsgViewMode('table')}
              aria-pressed={msgViewMode === 'table'}
            >
              Table view
            </button>
          </div>
        </div>

        {messages.sampleSizeWarning && (
          <div className={styles.caveatBanner} role="note">
            <span className={styles.caveatPill}>Small sample caveat</span>
            <span>
              Only {formatNumber(messages.totalThreads)} message threads in this period. Response averages may reflect single isolated conversations.
            </span>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>Median response</span>
            <span className={styles.statValue}>
              {messages.medianFirstResponseMinutes < 60
                ? formatDuration(messages.medianFirstResponseMinutes, 'minute', 0)
                : formatDuration(messages.medianFirstResponseMinutes / 60, 'hour')}
            </span>
            <span className={styles.statHint}>50% replied faster</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>Within 2 hours</span>
            <span className={styles.statValue}>{formatPercent(messages.rateWithin2h, 0)}</span>
            <span className={styles.statHint}>
              {formatNumber(messages.respondedWithin2hCount)} of {formatNumber(messages.totalThreads)} threads
            </span>
          </div>
        </div>

        {msgViewMode === 'chart' ? (
          <div>
            <span className={styles.statLabel}>Initial reply speed distribution</span>
            <div className={styles.distributionBar} role="img" aria-label="Message response speed distribution">
              <div
                className={styles.distributionSegment}
                style={{ width: `${msgWithin2hPct}%`, background: 'var(--color-accent)' }}
                title={`Within 2 hours: ${formatNumber(messages.respondedWithin2hCount)}`}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${msg2to24hPct}%`, background: '#b87b28' }}
                title={`2 to 24 hours: ${formatNumber(messages.respondedWithin24hCount - messages.respondedWithin2hCount)}`}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${msgOver24hPct}%`, background: 'var(--color-surface-hover)' }}
                title={`Over 24 hours: ${formatNumber(msgTotal - messages.respondedWithin24hCount)}`}
              />
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
                <span>&lt;2h ({formatNumber(messages.respondedWithin2hCount)})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#b87b28' }} />
                <span>
                  2–24h ({formatNumber(Math.max(0, messages.respondedWithin24hCount - messages.respondedWithin2hCount))})
                </span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
                <span>&gt;24h ({formatNumber(Math.max(0, msgTotal - messages.respondedWithin24hCount))})</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className={msgViewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
          <table className={styles.dataTable} aria-label="Patient message response time table">
            <caption>Breakdown of time to initial response for incoming message threads</caption>
            <thead>
              <tr>
                <th scope="col">Response window</th>
                <th scope="col" className="num">Count</th>
                <th scope="col" className="num">Percentage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Within 2 hours</th>
                <td className="num">{formatNumber(messages.respondedWithin2hCount)}</td>
                <td className="num">{formatPercent(msgWithin2hPct)}</td>
              </tr>
              <tr>
                <th scope="row">2 to 24 hours</th>
                <td className="num">
                  {formatNumber(Math.max(0, messages.respondedWithin24hCount - messages.respondedWithin2hCount))}
                </td>
                <td className="num">{formatPercent(msg2to24hPct)}</td>
              </tr>
              <tr>
                <th scope="row">Over 24 hours</th>
                <td className="num">
                  {formatNumber(Math.max(0, msgTotal - messages.respondedWithin24hCount))}
                </td>
                <td className="num">{formatPercent(msgOver24hPct)}</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <th scope="row">Total Threads</th>
                <td className="num">{formatNumber(messages.totalThreads)}</td>
                <td className="num">{formatPercent(100)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
