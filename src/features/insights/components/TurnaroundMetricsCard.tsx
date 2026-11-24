import { useState } from 'react';
import type { ReferralTurnaroundMetrics, MessageResponseMetrics } from '../../../types/models';
import { useFormat } from '../../../i18n/useFormat';
import { useT } from '../../../i18n/useT';
import styles from './PracticeInsights.module.css';

interface TurnaroundMetricsCardProps {
  referrals: ReferralTurnaroundMetrics;
  messages: MessageResponseMetrics;
}

export function TurnaroundMetricsCard({ referrals, messages }: TurnaroundMetricsCardProps) {
  const { formatDuration, formatNumber, formatPercent } = useFormat();
  const t = useT();
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
            <h2 id="referrals-heading">{t('insights.referrals.title', 'Referral acceptance turnaround')}</h2>
            <p className={styles.cardSubtitle}>
              {t('insights.referrals.subtitle', 'Time from when you issue a referral to when the receiving specialist/facility accepts it.')}
            </p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label={t('insights.referrals.displayMode', 'Referral display mode')}>
            <button
              type="button"
              className={`${styles.toggleButton} ${refViewMode === 'chart' ? styles.toggleButtonActive : ''}`}
              onClick={() => setRefViewMode('chart')}
              aria-pressed={refViewMode === 'chart'}
            >
              {t('insights.common.chartView', 'Chart view')}
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${refViewMode === 'table' ? styles.toggleButtonActive : ''}`}
              onClick={() => setRefViewMode('table')}
              aria-pressed={refViewMode === 'table'}
            >
              {t('insights.common.tableView', 'Table view')}
            </button>
          </div>
        </div>

        {referrals.sampleSizeWarning && (
          <div className={styles.caveatBanner} role="note">
            <span className={styles.caveatPill}>{t('insights.common.smallSampleCaveat', 'Small sample caveat')}</span>
            <span>
              {t('insights.referrals.smallSample', 'Only {count, plural, one {# referral} other {# referrals}} issued in this period. Turnaround averages may be skewed by anomalous delays.', {
                count: referrals.totalSent,
              })}
            </span>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>{t('insights.referrals.medianLabel', 'Median acceptance')}</span>
            <span className={styles.statValue}>
              {referrals.medianAcceptanceHours < 24
                ? formatDuration(referrals.medianAcceptanceHours, 'hour')
                : formatDuration(referrals.medianAcceptanceHours / 24, 'day')}
            </span>
            <span className={styles.statHint}>{t('insights.referrals.medianHint', '50% accepted faster than this')}</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>{t('insights.referrals.avgLabel', 'Average turnaround')}</span>
            <span className={styles.statValue}>
              {referrals.averageAcceptanceHours < 24
                ? formatDuration(referrals.averageAcceptanceHours, 'hour')
                : formatDuration(referrals.averageAcceptanceHours / 24, 'day')}
            </span>
            <span className={styles.statHint}>
              {t('insights.referrals.acceptedOf', '{accepted} of {sent} accepted', {
                accepted: formatNumber(referrals.totalAccepted),
                sent: formatNumber(referrals.totalSent),
              })}
            </span>
          </div>
        </div>

        {refViewMode === 'chart' ? (
          <div>
            <span className={styles.statLabel}>{t('insights.referrals.distributionLabel', 'Turnaround distribution (accepted referrals)')}</span>
            <div className={styles.distributionBar} role="img" aria-label={t('insights.referrals.distributionAriaLabel', 'Referral turnaround distribution')}>
              <div
                className={styles.distributionSegment}
                style={{ width: `${refUnder24Pct}%`, background: 'var(--color-accent)' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.under24h', 'Under 24 hours'),
                  count: formatNumber(referrals.breakdownUnder24h),
                })}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${ref24to48Pct}%`, background: '#b87b28' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.from24to48h', '24 to 48 hours'),
                  count: formatNumber(referrals.breakdown24to48h),
                })}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${refOver48Pct}%`, background: '#8c5b00' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.over48h', 'Over 48 hours'),
                  count: formatNumber(referrals.breakdownOver48h),
                })}
              />
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.under24hShort', '<24h'),
                  count: formatNumber(referrals.breakdownUnder24h),
                })}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#b87b28' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.from24to48hShort', '24–48h'),
                  count: formatNumber(referrals.breakdown24to48h),
                })}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#8c5b00' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.over48hShort', '>48h'),
                  count: formatNumber(referrals.breakdownOver48h),
                })}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className={refViewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
          <table className={styles.dataTable} aria-label={t('insights.referrals.tableLabel', 'Referral turnaround breakdown table')}>
            <caption>{t('insights.referrals.tableCaption', 'Referral acceptance time breakdown for period')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('insights.referrals.colBucket', 'Turnaround bucket')}</th>
                <th scope="col" className="num">{t('insights.common.count', 'Count')}</th>
                <th scope="col" className="num">{t('insights.common.percentage', 'Percentage')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('insights.common.under24h', 'Under 24 hours')}</th>
                <td className="num">{formatNumber(referrals.breakdownUnder24h)}</td>
                <td className="num">{formatPercent(refUnder24Pct)}</td>
              </tr>
              <tr>
                <th scope="row">{t('insights.common.from24to48h', '24 to 48 hours')}</th>
                <td className="num">{formatNumber(referrals.breakdown24to48h)}</td>
                <td className="num">{formatPercent(ref24to48Pct)}</td>
              </tr>
              <tr>
                <th scope="row">{t('insights.common.over48h', 'Over 48 hours')}</th>
                <td className="num">{formatNumber(referrals.breakdownOver48h)}</td>
                <td className="num">{formatPercent(refOver48Pct)}</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <th scope="row">{t('insights.referrals.totalAccepted', 'Total Accepted')}</th>
                <td className="num">{formatNumber(referrals.totalAccepted)}</td>
                <td className="num">{formatPercent(100)}</td>
              </tr>
              <tr>
                <th scope="row">{t('insights.referrals.pendingAcceptance', 'Pending Acceptance')}</th>
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
            <h2 id="messages-heading">{t('insights.messages.title', 'Messages response time')}</h2>
            <p className={styles.cardSubtitle}>
              {t('insights.messages.subtitle', 'Speed of your initial reply to patient inquiry threads.')}
            </p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label={t('insights.messages.displayMode', 'Message response display mode')}>
            <button
              type="button"
              className={`${styles.toggleButton} ${msgViewMode === 'chart' ? styles.toggleButtonActive : ''}`}
              onClick={() => setMsgViewMode('chart')}
              aria-pressed={msgViewMode === 'chart'}
            >
              {t('insights.common.chartView', 'Chart view')}
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${msgViewMode === 'table' ? styles.toggleButtonActive : ''}`}
              onClick={() => setMsgViewMode('table')}
              aria-pressed={msgViewMode === 'table'}
            >
              {t('insights.common.tableView', 'Table view')}
            </button>
          </div>
        </div>

        {messages.sampleSizeWarning && (
          <div className={styles.caveatBanner} role="note">
            <span className={styles.caveatPill}>{t('insights.common.smallSampleCaveat', 'Small sample caveat')}</span>
            <span>
              {t('insights.messages.smallSample', 'Only {count, plural, one {# message thread} other {# message threads}} in this period. Response averages may reflect single isolated conversations.', {
                count: messages.totalThreads,
              })}
            </span>
          </div>
        )}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>{t('insights.messages.medianLabel', 'Median response')}</span>
            <span className={styles.statValue}>
              {messages.medianFirstResponseMinutes < 60
                ? formatDuration(messages.medianFirstResponseMinutes, 'minute', 0)
                : formatDuration(messages.medianFirstResponseMinutes / 60, 'hour')}
            </span>
            <span className={styles.statHint}>{t('insights.messages.medianHint', '50% replied faster')}</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.statLabel}>{t('insights.common.within2h', 'Within 2 hours')}</span>
            <span className={styles.statValue}>{formatPercent(messages.rateWithin2h, 0)}</span>
            <span className={styles.statHint}>
              {t('insights.messages.threadsOf', '{within} of {total} threads', {
                within: formatNumber(messages.respondedWithin2hCount),
                total: formatNumber(messages.totalThreads),
              })}
            </span>
          </div>
        </div>

        {msgViewMode === 'chart' ? (
          <div>
            <span className={styles.statLabel}>{t('insights.messages.distributionLabel', 'Initial reply speed distribution')}</span>
            <div className={styles.distributionBar} role="img" aria-label={t('insights.messages.distributionAriaLabel', 'Message response speed distribution')}>
              <div
                className={styles.distributionSegment}
                style={{ width: `${msgWithin2hPct}%`, background: 'var(--color-accent)' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.within2h', 'Within 2 hours'),
                  count: formatNumber(messages.respondedWithin2hCount),
                })}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${msg2to24hPct}%`, background: '#b87b28' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.from2to24h', '2 to 24 hours'),
                  count: formatNumber(messages.respondedWithin24hCount - messages.respondedWithin2hCount),
                })}
              />
              <div
                className={styles.distributionSegment}
                style={{ width: `${msgOver24hPct}%`, background: 'var(--color-surface-hover)' }}
                title={t('insights.common.labelCount', '{label}: {count}', {
                  label: t('insights.common.over24h', 'Over 24 hours'),
                  count: formatNumber(msgTotal - messages.respondedWithin24hCount),
                })}
              />
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-accent)' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.within2hShort', '<2h'),
                  count: formatNumber(messages.respondedWithin2hCount),
                })}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#b87b28' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.from2to24hShort', '2–24h'),
                  count: formatNumber(Math.max(0, messages.respondedWithin24hCount - messages.respondedWithin2hCount)),
                })}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }} />
                <span>{t('insights.common.labelWithCount', '{label} ({count})', {
                  label: t('insights.common.over24hShort', '>24h'),
                  count: formatNumber(Math.max(0, msgTotal - messages.respondedWithin24hCount)),
                })}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className={msgViewMode === 'table' ? styles.tableWrapper : styles.srOnly}>
          <table className={styles.dataTable} aria-label={t('insights.messages.tableLabel', 'Patient message response time table')}>
            <caption>{t('insights.messages.tableCaption', 'Breakdown of time to initial response for incoming message threads')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('insights.messages.colWindow', 'Response window')}</th>
                <th scope="col" className="num">{t('insights.common.count', 'Count')}</th>
                <th scope="col" className="num">{t('insights.common.percentage', 'Percentage')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('insights.common.within2h', 'Within 2 hours')}</th>
                <td className="num">{formatNumber(messages.respondedWithin2hCount)}</td>
                <td className="num">{formatPercent(msgWithin2hPct)}</td>
              </tr>
              <tr>
                <th scope="row">{t('insights.common.from2to24h', '2 to 24 hours')}</th>
                <td className="num">
                  {formatNumber(Math.max(0, messages.respondedWithin24hCount - messages.respondedWithin2hCount))}
                </td>
                <td className="num">{formatPercent(msg2to24hPct)}</td>
              </tr>
              <tr>
                <th scope="row">{t('insights.common.over24h', 'Over 24 hours')}</th>
                <td className="num">
                  {formatNumber(Math.max(0, msgTotal - messages.respondedWithin24hCount))}
                </td>
                <td className="num">{formatPercent(msgOver24hPct)}</td>
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <th scope="row">{t('insights.messages.totalThreads', 'Total Threads')}</th>
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
