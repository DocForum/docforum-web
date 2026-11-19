import { Button } from '../../../components/Button';
import { useT } from '../../../i18n/useT';
import { usePayWithWallet } from '../hooks/usePayWithWallet';
import { stepperIndex, type WalletPayPhase } from '../wallet-pay';
import { transactionUrl } from '../explorer';
import { formatStroops } from '../../../services/payments-service';
import type { PaymentIntent } from '../../../types/models';
import styles from './PayWithWallet.module.css';

interface PayWithWalletProps {
  orderId: string;
  intent: PaymentIntent;
  /** Injectable for tests; detected from the page when omitted. */
  wallet?: Parameters<typeof usePayWithWallet>[0]['wallet'];
}

function Stepper({ phase }: { phase: WalletPayPhase }) {
  const t = useT();
  const steps = [
    { key: 'prepare', label: t('payments.wallet.stepPrepare', 'Prepare') },
    { key: 'wallet', label: t('payments.wallet.stepWallet', 'Your wallet') },
    { key: 'submit', label: t('payments.wallet.stepSubmit', 'Submit') },
    { key: 'confirm', label: t('payments.wallet.stepConfirm', 'Confirm') },
  ];
  const active = stepperIndex(phase);
  const settled = phase === 'confirmed' || phase === 'expired' || phase === 'failed';

  return (
    <ol className={styles.steps} aria-label={t('payments.wallet.progressAria', 'Payment progress')}>
      {steps.map((step, index) => {
        const state = settled || index < active ? 'done' : index === active ? 'active' : 'todo';
        return (
          <li
            key={step.key}
            className={styles.step}
            data-state={state}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className={styles.stepIndex} aria-hidden="true">
              {index + 1}
            </span>
            {step.label}
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
  const { state, start, reset, busy, confirmedTxHash } = usePayWithWallet({ orderId, intent, wallet });
  const explorer = transactionUrl(confirmedTxHash);
  const amount = formatStroops(intent.amountStroops);

  return (
    <section className={styles.panel} aria-labelledby={`wallet-pay-${intent.id}`}>
      <h3 className={styles.heading} id={`wallet-pay-${intent.id}`}>
        {t('payments.wallet.heading', 'Pay with your wallet')}
      </h3>
      <p className={styles.amount}>
        {t(
          'payments.wallet.amount',
          '{amount} XLM held in escrow until the order is fulfilled.',
          { amount },
        )}
      </p>

      <Stepper phase={state.phase} />

      {state.phase === 'idle' ? (
        <div className={styles.state}>
          <p>
            {t(
              'payments.wallet.idleBody',
              'docforum-core prepares the transaction, your wallet signs it, and docforum-core submits it. Nothing is built, simulated or sent from your browser, and your keys never leave your wallet.',
            )}
          </p>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>
              {t('payments.wallet.payButton', 'Pay with wallet')}
            </Button>
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
            <strong>{t('payments.wallet.confirmStrong', 'Confirm in your wallet.')}</strong>{' '}
            {t(
              'payments.wallet.confirmBody',
              'Review the transaction and approve it to sign.',
            )}
          </p>
          {state.expiresAt ? (
            <p className={styles.hint}>
              {t(
                'payments.wallet.expiresAt',
                'It expires at {time} — expiring is normal, and preparing a new one costs nothing.',
                { time: new Date(state.expiresAt).toLocaleTimeString() },
              )}
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
          {t(
            'payments.wallet.submitting',
            'Submitting your signed transaction to docforum-core…',
          )}
        </p>
      ) : null}

      {state.phase === 'confirming' ? (
        <p className={`${styles.state} ${styles.working}`} role="status">
          {t('payments.wallet.confirming', 'Waiting for confirmation on the network…')}
        </p>
      ) : null}

      {state.phase === 'confirmed' ? (
        <div className={styles.success} role="status">
          <p className={styles.successTitle}>
            {t('payments.wallet.confirmedTitle', 'Payment confirmed')}
          </p>
          <p>
            {t(
              'payments.wallet.confirmedBody',
              'Your {amount} XLM is held in escrow — the facility is only paid when the order is fulfilled.',
              { amount },
            )}
          </p>
          {explorer ? (
            <p>
              <a className={styles.explorerLink} href={explorer} target="_blank" rel="noopener noreferrer">
                {t('payments.wallet.explorer', 'View transaction on the Stellar explorer')}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {state.phase === 'expired' ? (
        <div className={styles.expired} role="status">
          <p>
            <strong>{t('payments.wallet.expiredStrong', 'This transaction expired.')}</strong>{' '}
            {t(
              'payments.wallet.expiredBody',
              'Prepared transactions are only valid for a short time — nothing was sent and nothing left your wallet. Preparing a new one keeps you right here.',
            )}
          </p>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>
              {t('payments.wallet.prepareNew', 'Prepare a new transaction')}
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'declined' ? (
        <div className={styles.declined} role="status">
          <p>
            {t(
              'payments.wallet.declined',
              'You declined in your wallet. Nothing was sent and nothing changed.',
            )}
          </p>
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
              {state.reason ?? t('payments.wallet.failed', 'The payment could not be completed.')}
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>
              {t('common.tryAgain', 'Try again')}
            </Button>
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
              <strong>
                {t('payments.wallet.walletUnavailableStrong', 'No wallet detected.')}
              </strong>{' '}
              {state.reason}{' '}
              {t(
                'payments.wallet.walletUnavailableBody',
                'Install a Stellar wallet extension (such as Freighter) and unlock it, then try again — your keys stay in the wallet.',
              )}
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={() => void start()}>
              {t('payments.wallet.checkAgain', 'Check again')}
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === 'wallet_not_linked' ? (
        <div className={styles.state}>
          <div className={styles.info} role="status">
            <p>
              <strong>{t('payments.wallet.walletNotLinkedStrong', 'No linked wallet yet.')}</strong>{' '}
              {state.reason}{' '}
              {t(
                'payments.wallet.walletNotLinkedBody',
                "Wallet linking for patients is coming with docforum-core's SEP-10 work — this payment can be prepared once your wallet is linked.",
              )}
            </p>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => void start()}>
              {t('common.tryAgain', 'Try again')}
            </Button>
          </div>
        </div>
      ) : null}

      {busy ? (
        <p className={styles.hint}>
          {t('payments.wallet.keepOpen', 'Keep this tab open until the payment finishes.')}
        </p>
      ) : null}
    </section>
  );
}
