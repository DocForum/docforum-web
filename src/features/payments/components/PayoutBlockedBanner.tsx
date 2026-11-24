import { Link } from 'react-router-dom';
import { useT } from '../../../i18n/useT';
import type { PayoutBlockCode } from '../../../services/error-catalogue';
import { usePayoutBlockStatus } from '../hooks/usePayoutBlockStatus';
import styles from './PayoutBlockedBanner.module.css';

interface PayoutBlockedBannerProps {
  /** Where the wallet setup form lives. The form is on the facility
   * dashboard; the payouts page links across to it. */
  walletSetupTo?: string;
}

interface BlockCopy {
  title: string;
  summary: string;
  impact: string;
  steps: string[];
}

/**
 * Staff-facing copy (issue #279): written for non-technical facility staff,
 * so "trustline" is always glossed and nobody is told to use a Stellar tool
 * themselves. Kept next to the component (rather than in
 * `error-catalogue.ts`) because this is page copy, while the catalogue
 * explains an API failure wherever it surfaces.
 */
function useBlockCopy(reason: PayoutBlockCode): BlockCopy {
  const t = useT();

  if (reason === 'FACILITY_WALLET_NOT_LINKED') {
    return {
      title: t(
        'facility.payoutBlocked.walletNotLinked.title',
        'Payouts are blocked: no payout wallet is linked',
      ),
      summary: t(
        'facility.payoutBlocked.walletNotLinked.summary',
        "DocForum has nowhere to send your facility's money yet.",
      ),
      impact: t(
        'facility.payoutBlocked.walletNotLinked.impact',
        'Payments for your facility cannot be created or settled until a wallet is linked. Patients may see their payment fail, and completed orders cannot be paid out.',
      ),
      steps: [
        t(
          'facility.payoutBlocked.walletNotLinked.step1',
          "Ask your finance team or wallet provider for the facility's Stellar address — a 56-character code starting with G.",
        ),
        t(
          'facility.payoutBlocked.walletNotLinked.step2',
          'Paste it into the "Payout wallet" box below and choose "Link wallet".',
        ),
        t(
          'facility.payoutBlocked.walletNotLinked.step3',
          'The warning disappears as soon as DocForum confirms the link.',
        ),
      ],
    };
  }

  return {
    title: t(
      'facility.payoutBlocked.trustlineMissing.title',
      'Payouts are blocked: your wallet cannot receive this payment type yet',
    ),
    summary: t(
      'facility.payoutBlocked.trustlineMissing.summary',
      'Your payout wallet is linked, but it is not set up to hold the currency DocForum pays in.',
    ),
    impact: t(
      'facility.payoutBlocked.trustlineMissing.impact',
      'DocForum will not create or settle payments until the wallet can hold that currency. No money is lost — payments simply cannot complete and payouts stay on hold.',
    ),
    steps: [
      t(
        'facility.payoutBlocked.trustlineMissing.step1',
        'Contact whoever manages the wallet — your finance team or your wallet provider.',
      ),
      t(
        'facility.payoutBlocked.trustlineMissing.step2',
        'Ask them to "add a USDC trustline": allow this wallet to hold US Dollar Coin. It is a one-time wallet setting, not a payment.',
      ),
      t(
        'facility.payoutBlocked.trustlineMissing.step3',
        'Once they confirm, save the same address again below so DocForum re-checks it. If the warning stays, contact DocForum support.',
      ),
    ],
  };
}

/**
 * Persistent, actionable warning shown on the facility dashboard and payouts
 * page while docforum-core is refusing payments for this facility (issue
 * #279). Renders nothing once the payout setup is confirmed.
 */
export function PayoutBlockedBanner({ walletSetupTo = '/facility' }: PayoutBlockedBannerProps) {
  const { reason } = usePayoutBlockStatus();
  const t = useT();
  const copy = useBlockCopy(reason ?? 'FACILITY_WALLET_NOT_LINKED');

  if (!reason) return null;

  return (
    <section
      className={styles.banner}
      role="alert"
      aria-labelledby="payout-blocked-title"
      data-testid="payout-blocked-banner"
    >
      <div className={styles.content}>
        <h2 id="payout-blocked-title" className={styles.title}>
          {copy.title}
        </h2>
        <p className={styles.summary}>{copy.summary}</p>
        <p className={styles.impact}>{copy.impact}</p>
        <ol className={styles.steps}>
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <Link className={styles.action} to={walletSetupTo}>
        {t('facility.payoutBlocked.setupLink', 'Open wallet setup')}
      </Link>
    </section>
  );
}
