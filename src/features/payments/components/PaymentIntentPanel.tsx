import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { ApiError } from '../../../services/api-client';
import { usePaymentIntent, useFundPaymentIntent, useReleasePaymentIntent, useRefundPaymentIntent } from '../hooks/usePaymentIntent';
import type { PaymentIntentStatus } from '../../../types/models';

const NEXT_ACTION: Record<PaymentIntentStatus, string | null> = {
  created: 'fund',
  escrowed: 'release-or-refund',
  released: null,
  refunded: null,
  failed: null,
};

/** Shows one PaymentIntent's real status (docforum-core, Phase 5.5) and
 * the admin action(s) valid from its current state. Every action here
 * triggers a real Stellar contract call on docforum-core's side — this
 * repo never touches Stellar directly (hard rule 1). */
export function PaymentIntentPanel({ intentId }: { intentId: string }) {
  const intentQuery = usePaymentIntent(intentId);
  const fundMutation = useFundPaymentIntent();
  const releaseMutation = useReleasePaymentIntent();
  const refundMutation = useRefundPaymentIntent();

  if (intentQuery.isLoading) return <p>Loading…</p>;
  if (intentQuery.isError) {
    const message = intentQuery.error instanceof ApiError ? intentQuery.error.message : 'Could not load this payment intent.';
    return <FormError message={message} />;
  }

  const intent = intentQuery.data;
  if (!intent) return null;

  const pendingError = fundMutation.error ?? releaseMutation.error ?? refundMutation.error;
  const actionError =
    pendingError instanceof ApiError ? pendingError.message : pendingError ? 'Something went wrong. Please try again.' : null;

  return (
    <div className="card">
      <span className="statusPill" data-status={intent.status}>
        {intent.status}
      </span>
      <dl>
        <dt>Order</dt>
        <dd>
          {intent.orderType} · {intent.orderId}
        </dd>
        <dt>Amount</dt>
        <dd>{intent.amountStroops} stroops</dd>
        {intent.escrowId && (
          <>
            <dt>On-chain escrow id</dt>
            <dd>{intent.escrowId}</dd>
          </>
        )}
        {intent.stellarTxHash && (
          <>
            <dt>Last transaction</dt>
            <dd>
              <code>{intent.stellarTxHash}</code>
            </dd>
          </>
        )}
      </dl>

      <FormError message={actionError} />

      {NEXT_ACTION[intent.status] === 'fund' && (
        <Button onClick={() => fundMutation.mutate(intent.id)} loading={fundMutation.isPending}>
          {fundMutation.isPending ? 'Funding on testnet…' : 'Fund escrow'}
        </Button>
      )}
      {NEXT_ACTION[intent.status] === 'release-or-refund' && (
        <>
          <Button onClick={() => releaseMutation.mutate(intent.id)} loading={releaseMutation.isPending}>
            {releaseMutation.isPending ? 'Releasing…' : 'Release to facility'}
          </Button>
          <Button variant="secondary" onClick={() => refundMutation.mutate(intent.id)} loading={refundMutation.isPending}>
            {refundMutation.isPending ? 'Refunding…' : 'Refund to platform'}
          </Button>
        </>
      )}
    </div>
  );
}
