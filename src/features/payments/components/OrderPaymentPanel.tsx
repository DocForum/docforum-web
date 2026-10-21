import { useQuery } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { ApiError } from '../../../services/api-client';
import { paymentKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import { walletPayEnabled } from '../walletPayFlag';
import { PayWithWallet } from './PayWithWallet';
import { statusLabel } from '../status';
import type { PatientOrder } from '../../../types/models';
import styles from './PayWithWallet.module.css';

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx won't fix itself on retry — only retry network/5xx failures.
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * The order's payment panel (issue #59's mount point; the fuller status
 * panel is issue #61's scope). Renders nothing unless:
 * - the `VITE_PAY_WITH_WALLET` feature flag is on (ADR 0005: an option, not
 *   the default — off in every build that doesn't set it), and
 * - docforum-core returns an intent for this order (no intent → no payment
 *   to make, and a 404 from the endpoint itself is simply "not served yet").
 *
 * Payable intents (`created` / `awaiting_signature`) get the wallet flow;
 * settled intents show their status and nothing else.
 */
export function OrderPaymentPanel({ order }: { order: PatientOrder }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  const intents = useQuery({
    queryKey: paymentKeys.orderIntent(order.id),
    queryFn: ({ signal }) => paymentsService.listOrderPaymentIntents(order.id, accessToken!, signal),
    enabled: walletPayEnabled && Boolean(accessToken),
    retry: shouldRetry,
  });

  if (!walletPayEnabled) return null;

  const intent = intents.data?.[0];
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
