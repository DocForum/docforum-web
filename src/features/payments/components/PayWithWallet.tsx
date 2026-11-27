import { Button } from '../../../components/Button';
import { usePayWithWallet } from '../hooks/usePayWithWallet';
import { stepperIndex, type WalletPayPhase } from '../wallet-pay';
import { transactionUrl } from '../explorer';
import { formatStroops } from '../../../services/payments-service';
import type { PaymentIntent } from '../../../types/models';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import styles from './PayWithWallet.module.css';

interface PayWithWalletProps {
  orderId: string;
  intent: PaymentIntent;
  /** Injectable for tests; detected from the page when omitted. */
  wallet?: Parameters<typeof usePayWithWallet>[0]['wallet'];
}

function Stepper({ phase }: { phase: WalletPayPhase }) {
  const t = useT();
  const stepLabels = [
    t('payments.wallet.step.prepare', 'Prepare'),
    t('payments.wallet.step.wallet', 'Your wallet'),
    t('payments.wallet.step.submit', 'Submit'),
    t('payments.wallet.step.confirm', 'Confirm'),
  ];
  const active = stepperIndex(phase);
  const settled = phase === 'confirmed' || phase === 'expired' || phase === 'failed';

  return (
    <ol className={styles.steps} aria-label={t('payments.wallet.progress', 'Payment progress')}>
      {stepLabels.map((label, index) => {
        const state = settled || index < active ? 'done' : index === active ? 'active' : 'todo';
        return (
          <li
            key={label}
            className={styles.step}
            data-state={state}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className={styles.stepIndex} aria-hidden="true">
              {index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The patient-facing wallet payment flow (issue #59): prepare → sign →
 * submit → confirm, as a stepper. The browser never builds, simulates or
 * submits anything — it relays XDR between docforum-core and the patient's
 * wallet (hard rule 1). An expired preparation and a wallet refusal are
 * normal branches, not errors: re-prepare keeps this panel and its intent,
 * and a refusal lands back at the start without error styling.
 */
export function PayWithWallet({ orderId, intent, wallet }: PayWithWalletProps) {
  const t = useT();
  const { dateTime: formatDateTime } = useFormatters();
  const { state, start, reset, busy, confirmedTxHash } = usePayWithWallet({ orderId, intent, wallet });
  const explorer = transactionUrl(confirmedTxHash);

  return (
    <section className={styles.panel} aria-labelledby={`wallet-pay-${intent.id}`}>
      <h3 className={styles.heading} id={`wallet-pay-${intent.id}`}>
        {t('payments.wallet.title', 'Pay with your wallet')}
      </h3>
      <p className={styles.amount}>
        {t('payments.wallet.amountHeld', '{amount} XLM held in escrow until the order is fulfilled.', {
          amount: formatStroops(intent.amountStroops),
        })}
      </p>

      <Stepper phase={state.phase} />

      {state.phase === 'idle' ? (
        <div className={styles.state}>
          <p>
            {t('payments.wallet.intro', 'docforum-core prepares the transaction, your wallet signs it, and docforum-core submits it. Nothing is built, simulated or sent from your browser, and your keys never leave your wallet.')}
          </p>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>{t('payments.wallet.pay', 'Pay with wallet')}</Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'preparing' ? (
        <p className={`${styles.state} ${styles.working}`} role="status">
          {t('payments.wallet.preparing', 'Preparing the transaction with docforum-core…')}
        </p>
      ) : null}

      {state.phase === 'awaiting_wallet' ? (
        <div className={styles.state} role="status">
          <p>
            <strong>{t('payments.wallet.confirmWallet', 'Confirm in your wallet.')}</strong>{' '}
            {t('payments.wallet.reviewAndApprove', 'Review the transaction and approve it to sign.')}
          </p>
          {state.expiresAt ? (
            <p className={styles.hint}>
              {t('payments.wallet.expiresAt', 'It expires at {date} — expiring is normal, and preparing a new one costs nothing.', {
                date: formatDateTime(state.expiresAt),
              })}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={reset}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'submitting' ? (
        <p className={`${styles.state} ${styles.working}`} role="status">
          {t('payments.wallet.submitting', 'Submitting your signed transaction to docforum-core…')}
        </p>
      ) : null}

      {state.phase === 'confirming' ? (
        <p className={`${styles.state} ${styles.working}`} role="status">
          {t('payments.wallet.confirming', 'Waiting for confirmation on the network…')}
        </p>
      ) : null}

      {state.phase === 'confirmed' ? (
        <div className={styles.success} role="status">
          <p className={styles.successTitle}>{t('payments.wallet.confirmed', 'Payment confirmed')}</p>
          <p>
            {t('payments.wallet.successBody', 'Your {amount} XLM is held in escrow — the facility is only paid when the order is fulfilled.', {
              amount: formatStroops(intent.amountStroops),
            })}
          </p>
          {explorer ? (
            <p>
              <a className={styles.explorerLink} href={explorer} target="_blank" rel="noopener noreferrer">
                {t('payments.wallet.viewTransaction', 'View transaction on the Stellar explorer')}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'expired' ? (
        <div className={styles.expired} role="status">
          <p>
            <strong>{t('payments.wallet.expiredTitle', 'This transaction expired.')}</strong>{' '}
            {t('payments.wallet.expiredBody', 'Prepared transactions are only valid for a short time — nothing was sent and nothing left your wallet. Preparing a new one keeps you right here.')}
          </p>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>{t('payments.wallet.prepareAgain', 'Prepare a new transaction')}</Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'declined' ? (
        <div className={styles.declined} role="status">
          <p>{t('payments.wallet.declined', 'You declined in your wallet. Nothing was sent and nothing changed.')}</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={reset}>
              {t('payments.wallet.backToPayment', 'Back to payment')}
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'failed' ? (
        <div className={styles.state}>
          <div className={styles.error} role="alert">
            <p>
              {state.reason || t('payments.wallet.failed', 'The payment could not be completed. Try again shortly.')}
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>{t('common.tryAgain', 'Try again')}</Button>
            <Button variant="secondary" onClick={reset}>
              {t('payments.wallet.backToPayment', 'Back to payment')}
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'wallet_unavailable' ? (
        <div className={styles.state}>
          <div className={styles.info} role="status">
            <p>
              <strong>{t('payments.wallet.noWallet', 'No wallet detected.')}</strong>{' '}
              {t('payments.wallet.installWallet', 'Install and unlock a Stellar wallet extension, then try again — your keys stay in the wallet.')}
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>{t('payments.wallet.checkAgain', 'Check again')}</Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'wallet_not_linked' ? (
        <div className={styles.state}>
          <div className={styles.info} role="status">
            <p>
              <strong>{t('payments.wallet.noLinkedWallet', 'No linked wallet yet.')}</strong>{' '}
              {t('payments.wallet.walletLinkPending', 'Patient wallet linking depends on docforum-core’s SEP-10 work. This payment can be prepared once your wallet is linked.')}
            </p>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => void start()}>
              {t('common.tryAgain', 'Try again')}
            </Button>
          </div>
        </div>
      ) : null}

      {busy ? <p className={styles.hint}>{t('payments.wallet.keepTabOpen', 'Keep this tab open until the payment finishes.')}</p> : null}
    </section>
  );
}
