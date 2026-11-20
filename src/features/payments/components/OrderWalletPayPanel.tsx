// The order's payment panel (issue #59's mount point on the order card;
// issue #61's status panel lives on the order detail page). Renders nothing
// unless:
// - the `VITE_PAY_WITH_WALLET` feature flag is on (ADR 0005: an option, not
//   the default — off in every build that doesn't set it), and
// - docforum-core returns an intent for this order (no intent → no payment
//   to make; the assumed lookup maps a 404 to null).
//
// Payable intents (`created` / `awaiting_signature`) get the wallet flow;
// settled intents show their status and nothing else.
import { useOrderPaymentIntent } from '../hooks/useOrderPaymentIntent';
import { walletPayEnabled } from '../walletPayFlag';
import { PayWithWallet } from './PayWithWallet';
import { statusLabel } from '../status';
import type { PatientOrder } from '../../../types/models';
import styles from './PayWithWallet.module.css';

export function OrderWalletPayPanel({ order }: { order: PatientOrder }) {
  // Flag off ⇒ never even ask for the order's intent (ADR 0005).
  const intentQuery = useOrderPaymentIntent(walletPayEnabled ? order.id : undefined);

  if (!walletPayEnabled) return null;

  const intent = intentQuery.data;
  if (!intent) return null;

  if (intent.status === 'created' || intent.status === 'awaiting_signature') {
    return <PayWithWallet orderId={order.id} intent={intent} />;
  }

  return (
    <div className={styles.orderPayment} data-testid={`payment-status-${order.id}`}>
      <p className={styles.amount}>
        Payment: <strong>{statusLabel(intent.status)}</strong>
      </p>
    </div>
  );
}
