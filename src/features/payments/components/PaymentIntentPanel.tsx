import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useFormat } from '../../../i18n/useFormat';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { usePaymentIntent, useFundPaymentIntent, useReleasePaymentIntent, useRefundPaymentIntent } from '../hooks/usePaymentIntent';
import { contractUrl, transactionUrl } from '../explorer';
import type { PaymentIntentStatus } from '../../../types/models';

const NEXT_ACTION: Record<PaymentIntentStatus, string | null> = {
  created: 'fund',
  // Waiting on the patient's wallet signature (docforum-core#80) — nothing
  // an admin does here; if it expires, core returns it to `created`.
  awaiting_signature: null,
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
  const { formatAssetAmount } = useFormat();
  const intentQuery = usePaymentIntent(intentId);
  const fundMutation = useFundPaymentIntent();
  const releaseMutation = useReleasePaymentIntent();
  const refundMutation = useRefundPaymentIntent();
  const errorMessage = useErrorMessage();

  if (intentQuery.isLoading) return <Skeleton lines={3} label="Loading payment intent" />;
  if (intentQuery.isError) {
    return (
      <InlineError
        title="This payment intent couldn't be loaded"
        message={errorMessage(intentQuery.error) ?? 'Could not load this payment intent.'}
        onRetry={() => void intentQuery.refetch()}
      />
    );
  }

  const intent = intentQuery.data;
  if (!intent) return null;

  const txUrl = transactionUrl(intent.stellarTxHash);
  const contractLink = contractUrl(intent.sorobanContractId);

  const pendingError = fundMutation.error ?? releaseMutation.error ?? refundMutation.error;
  const actionError = errorMessage(pendingError);

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
        <dd>
          {formatAssetAmount(intent.amountStroops, 'XLM', { decimals: 7 })}{' '}
          <small>({intent.amountStroops} stroops)</small>
        </dd>
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
              {txUrl ? (
                <a href={txUrl} target="_blank" rel="noopener noreferrer">
                  <code>{intent.stellarTxHash}</code>
                </a>
              ) : (
                <code>{intent.stellarTxHash}</code>
              )}
            </dd>
          </>
        )}
        {intent.sorobanContractId && (
          <>
            <dt>Soroban contract</dt>
            <dd>
              {contractLink ? (
                <a href={contractLink} target="_blank" rel="noopener noreferrer">
                  <code>{intent.sorobanContractId}</code>
                </a>
              ) : (
                <code>{intent.sorobanContractId}</code>
              )}
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
