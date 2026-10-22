import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsService from '../../../services/payments-service';
import { invalidateFor } from '../../../invalidations';
import { paymentKeys } from '../../../query-keys';
import { useAuthStore } from '../../../store/auth-store';
import { detectWallet, type WalletBridge } from '../wallet';
import {
  classifyPrepareFailure,
  classifySignFailure,
  classifySubmitFailure,
  initialWalletPayState,
  isPreparedExpired,
  walletPayReducer,
} from '../wallet-pay';
import type { PaymentIntent } from '../../../types/models';

/** Poll cadence while docforum-core tracks the submitted transaction to
 * finality (its #81 contract polls server-side too — this only bridges the
 * request that outlived its response). */
const CONFIRM_POLL_MS = 1_000;
/** Give up asking after this long and say so honestly (nothing here can make
 * the chain faster, and the patient deserves a state, not a spinner). */
const CONFIRM_TIMEOUT_MS = 30_000;

export interface UsePayWithWalletOptions {
  orderId: string;
  intent: PaymentIntent;
  /** Injectable for tests; detected from the page when omitted. */
  wallet?: WalletBridge | null;
}

/**
 * Orchestrates one payment attempt: prepare (API) → wallet sign → submit
 * (API) → poll status. Every network call goes through docforum-core; the
 * wallet only ever sees the XDR docforum-core prepared (hard rule 1).
 */
export function usePayWithWallet({ orderId, intent, wallet: optionsWallet }: UsePayWithWalletOptions) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(walletPayReducer, undefined, initialWalletPayState);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmedRef = useRef(false);
  // Cached intent data from an earlier attempt must not be mistaken for a
  // fresh poll result — only statuses read after entering `confirming` count.
  const confirmEnteredAtRef = useRef(0);
  // A provided wallet (tests, future wallet kit) wins; otherwise detect at
  // the moment the patient starts, so installing an extension needs no reload.
  const wallet = optionsWallet;

  const activeWallet = (): WalletBridge | null => (wallet !== undefined ? wallet : detectWallet());

  /** Status polling — only alive while `confirming`. */
  const intentQuery = useQuery({
    queryKey: paymentKeys.intent(intent.id),
    queryFn: () => paymentsService.getPaymentIntent(intent.id, accessToken!),
    enabled: state.phase === 'confirming' && Boolean(accessToken),
    refetchInterval: state.phase === 'confirming' ? CONFIRM_POLL_MS : false,
    retry: false,
  });

  const refreshPaymentViews = useCallback(
    () => invalidateFor(queryClient, 'payments.wallet-pay', orderId, intent.id),
    [queryClient, orderId, intent.id],
  );

  const start = useCallback(async () => {
    dispatch({ type: 'START' });
    const active = activeWallet();
    if (!active) {
      dispatch({ type: 'NO_WALLET' });
      return;
    }

    // 1. Prepare — docforum-core builds and simulates the transaction.
    let prepared;
    try {
      prepared = await paymentsService.preparePaymentIntent(intent.id, accessToken!);
    } catch (error) {
      dispatch({ type: 'PREPARE_FAILED', ...classifyPrepareFailure(error) });
      return;
    }
    void refreshPaymentViews(); // intent moved to awaiting_signature
    dispatch({ type: 'PREPARED', xdr: prepared.xdr, expiresAt: prepared.expiresAt });

    if (isPreparedExpired(prepared.expiresAt)) {
      dispatch({ type: 'SIGN_FAILED', kind: 'expired', reason: '' });
      return;
    }

    // 2. Sign — the wallet is the only thing that touches the XDR now.
    let signedXdr: string;
    try {
      signedXdr = await active.signTransaction(prepared.xdr);
    } catch (error) {
      dispatch({ type: 'SIGN_FAILED', ...classifySignFailure(error) });
      return;
    }
    dispatch({ type: 'SIGNED', signedXdr });

    // The wallet can hold the prompt open past the expiry — check before
    // bothering docforum-core with a dead transaction.
    if (isPreparedExpired(prepared.expiresAt)) {
      dispatch({ type: 'SUBMIT_FAILED', kind: 'expired', reason: '' });
      return;
    }

    // 3. Submit — docforum-core verifies, fee-bumps and tracks to finality.
    try {
      const updated = await paymentsService.submitPaymentIntent(intent.id, signedXdr, accessToken!);
      // Write the settled row straight through so the confirmed view (and its
      // explorer link) renders from this response without waiting on a refetch.
      queryClient.setQueryData(paymentKeys.intent(intent.id), updated);
      dispatch({ type: 'SUBMITTED' });
      void refreshPaymentViews();
      if (updated.status === 'escrowed') dispatch({ type: 'CONFIRMED' });
    } catch (error) {
      const failure = classifySubmitFailure(error);
      dispatch({ type: 'SUBMIT_FAILED', kind: failure.kind, reason: failure.reason });
      return;
    }
  }, [accessToken, intent.id, refreshPaymentViews, queryClient]);

  // 4. Poll the intent to a terminal state, with a bounded wait.
  useEffect(() => {
    if (state.phase !== 'confirming') return undefined;
    confirmEnteredAtRef.current = Date.now();
    confirmTimeoutRef.current = setTimeout(() => dispatch({ type: 'CONFIRM_TIMEOUT' }), CONFIRM_TIMEOUT_MS);
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'confirming') return;
    const data = intentQuery.data;
    if (!data) return;
    // Only a fetch that landed after we began confirming counts — a cached
    // status from a previous attempt would otherwise resolve this one.
    if (intentQuery.dataUpdatedAt < confirmEnteredAtRef.current) return;
    const status = data.status;
    if (status === 'escrowed') {
      dispatch({ type: 'CONFIRMED' });
    } else if (status === 'failed') {
      dispatch({ type: 'NOT_CONFIRMED', reason: 'docforum-core reported this payment as failed. Nothing was held in escrow.' });
    } else if (status === 'created') {
      // #81's failure path returns the intent to `created` with a reason.
      dispatch({
        type: 'NOT_CONFIRMED',
        reason: 'The transaction did not go through — docforum-core returned this payment to its start. Nothing was held.',
      });
    }
  }, [state.phase, intentQuery.data, intentQuery.dataUpdatedAt]);

  useEffect(() => {
    if (state.phase === 'confirmed' && !confirmedRef.current) {
      confirmedRef.current = true;
      void refreshPaymentViews();
    }
    if (state.phase !== 'confirmed') confirmedRef.current = false;
  }, [state.phase, refreshPaymentViews]);

  return {
    state,
    start,
    reset: () => dispatch({ type: 'RESET' }),
    /** On-chain hash once confirmed — for the explorer link (helper from #10). */
    confirmedTxHash:
      state.phase === 'confirmed' ? intentQuery.data?.stellarTxHash ?? intent.stellarTxHash ?? null : null,
    /** True while the attempt can be started or restarted. */
    canStart: state.phase === 'idle' || state.phase === 'expired' || state.phase === 'declined' || state.phase === 'failed' || state.phase === 'wallet_unavailable' || state.phase === 'wallet_not_linked',
    busy:
      state.phase === 'preparing' ||
      state.phase === 'awaiting_wallet' ||
      state.phase === 'submitting' ||
      state.phase === 'confirming',
  };
}
