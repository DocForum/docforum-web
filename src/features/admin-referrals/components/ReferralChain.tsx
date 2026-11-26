import { useOptionalT } from '../../../i18n/useOptionalT';
import { loopReturnIndexes } from '../queue';
import type { ReferralChainLink } from '../../../types/models';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate } from '../../../i18n/time-zone';
import styles from './StuckReferrals.module.css';

function shortDate(value: string, timeZone: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : formatDate(value, timeZone, { day: 'numeric', month: 'short' });
}

/** The hops a loop-flagged referral took, oldest first, with the hop that
 * closed the loop called out. */
export function ReferralChain({ chain, currentId }: { chain: ReferralChainLink[]; currentId: string }) {
  const t = useOptionalT().t;
  const { timeZone } = useTimeZone();
  const returns = loopReturnIndexes(chain);

  return (
    <div className={styles.chain}>
      <p className={styles.chainTitle}>
        {t('adminReferrals.chain.title', 'Referral chain ({count, plural, one {# hop} other {# hops}})', {
          count: chain.length,
        })}
      </p>
      <ol className={styles.chainList}>
        {chain.map((link, index) => {
          const isCurrent = link.referralId === currentId;
          return (
            <li
              key={link.referralId}
              className={`${styles.chainLink} ${returns.has(index) ? styles.chainReturn : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className={styles.chainHop}>
                {link.referringDoctor.fullName} → {link.targetSpecialty.name}
                {link.targetDoctor && ` (${link.targetDoctor.fullName})`}
              </span>
              <span className={styles.chainMeta}>
                {shortDate(link.createdAt, timeZone)} ·{' '}
                {isCurrent ? t('adminReferrals.chain.thisReferral', 'this referral') : link.status}
                {returns.has(index) && (
                  <strong className={styles.chainReturnLabel}>
                    {' '}
                    · {t('adminReferrals.chain.returns', 'returns to an earlier hop')}
                  </strong>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
