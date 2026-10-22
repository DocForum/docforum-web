// Pay-with-wallet state machine (issue #59).
//
// ADR 0005: prepare → sign → submit, where an expired prepared transaction is
// a *normal* outcome (re-prepare, keep the patient's place), and a wallet
// refusal is a normal outcome too (back to the start, no error styling).
// Making that explicit in a pure reducer keeps the component declarative and
// the four paths (success, rejection, expiry, failure) unit-testable without
// a DOM or a wallet.
import { ApiError } from '../../services/api-client';
import { apiErrorCode } from '../../services/payments-service';
import { isWalletDecline } from './wallet';

export type WalletPayPhase =
  | 'idle'
  | 'preparing'
  | 'awaiting_wallet'
  | 'submitting'
  | 'confirming'
  | 'confirmed'
  | 'expired'
  | 'declined'
  | 'failed'
  | 'wallet_unavailable'
  | 'wallet_not_linked';

export interface WalletPayState {
  phase: WalletPayPhase;
  /** Unsigned XDR from prepare — held only for the lifetime of one attempt. */
  xdr: string | null;
  expiresAt: string | null;
  /** The wallet's signature — passed straight to submit, never inspected. */
  signedXdr: string | null;
  /** Plain-language explanation shown in failed / expired / not-linked views. */
  reason: string | null;
}

export type WalletPayEvent =
  | { type: 'START' }
  | { type: 'NO_WALLET' }
  | { type: 'PREPARED'; xdr: string; expiresAt: string }
  | { type: 'PREPARE_FAILED'; kind: 'wallet_not_linked' | 'expired' | 'error'; reason: string }
  | { type: 'SIGNED'; signedXdr: string }
  | { type: 'SIGN_FAILED'; kind: 'declined' | 'expired' | 'error'; reason: string }
  | { type: 'SUBMITTED' }
  | { type: 'SUBMIT_FAILED'; kind: 'expired' | 'error'; reason: string }
  | { type: 'CONFIRMED' }
  | { type: 'NOT_CONFIRMED'; reason: string }
  | { type: 'CONFIRM_TIMEOUT' }
  | { type: 'RESET' };

export function initialWalletPayState(): WalletPayState {
  return { phase: 'idle', xdr: null, expiresAt: null, signedXdr: null, reason: null };
}

/** Phases where the patient is waiting on us or a wallet — start is locked. */
export function isBusyPhase(phase: WalletPayPhase): boolean {
  return phase === 'preparing' || phase === 'awaiting_wallet' || phase === 'submitting' || phase === 'confirming';
}

const EXPIRED_COPY =
  'This prepared transaction expired before it was submitted. Transactions are only valid for a short time — ' +
  'nothing was sent and nothing left your wallet. Preparing a new one takes one tap.';

export function walletPayReducer(state: WalletPayState, event: WalletPayEvent): WalletPayState {
  switch (event.type) {
    case 'START':
      if (isBusyPhase(state.phase)) return state;
      // Starting again from any resting state clears the previous attempt —
      // same intent, same place in the UI, a fresh transaction to sign.
      return { ...initialWalletPayState(), phase: 'preparing' };
    case 'NO_WALLET':
      if (state.phase !== 'preparing') return state;
      return {
        ...initialWalletPayState(),
        phase: 'wallet_unavailable',
        reason: 'No Stellar wallet was detected in this browser.',
      };
    case 'PREPARED':
      if (state.phase !== 'preparing') return state;
      return { ...state, phase: 'awaiting_wallet', xdr: event.xdr, expiresAt: event.expiresAt, reason: null };
    case 'PREPARE_FAILED': {
      if (state.phase !== 'preparing') return state;
      const phase = event.kind === 'wallet_not_linked' ? 'wallet_not_linked' : event.kind === 'expired' ? 'expired' : 'failed';
      return { ...initialWalletPayState(), phase, reason: event.reason };
    }
    case 'SIGNED':
      if (state.phase !== 'awaiting_wallet') return state;
      return { ...state, phase: 'submitting', signedXdr: event.signedXdr };
    case 'SIGN_FAILED': {
      if (state.phase !== 'awaiting_wallet') return state;
      if (event.kind === 'declined') {
        // A refusal is not an error: neutral state, no error styling, and the
        // xdr/expiresAt are kept so "Back to payment" lands where it was.
        return { ...state, phase: 'declined', xdr: null, signedXdr: null, reason: null };
      }
      const phase = event.kind === 'expired' ? 'expired' : 'failed';
      return { ...initialWalletPayState(), phase, reason: event.reason };
    }
    case 'SUBMITTED':
      if (state.phase !== 'submitting') return state;
      return { ...state, phase: 'confirming', reason: null };
    case 'SUBMIT_FAILED': {
      if (state.phase !== 'submitting') return state;
      const phase = event.kind === 'expired' ? 'expired' : 'failed';
      return { ...initialWalletPayState(), phase, reason: event.reason };
    }
    case 'CONFIRMED':
      if (state.phase !== 'confirming') return state;
      return { ...state, phase: 'confirmed', reason: null };
    case 'NOT_CONFIRMED':
      if (state.phase !== 'confirming') return state;
      return { ...initialWalletPayState(), phase: 'failed', reason: event.reason };
    case 'CONFIRM_TIMEOUT':
      if (state.phase !== 'confirming') return state;
      return {
        ...initialWalletPayState(),
        phase: 'failed',
        reason:
          'The network has not confirmed this transaction yet. Check your payment status before trying again — ' +
          'preparing a new transaction while one may still land would be rejected by docforum-core anyway.',
      };
    case 'RESET':
      if (isBusyPhase(state.phase)) return state;
      return initialWalletPayState();
    default:
      return state;
  }
}

/** The prepared transaction is unusable once this passes. */
export function isPreparedExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return false;
  return now >= expiry;
}

export interface ClassifiedFailure {
  kind: 'wallet_not_linked' | 'expired' | 'error';
  reason: string;
}

/** Prepare failed: `409 WALLET_NOT_LINKED` and an expired preparation are
 * named outcomes (per docforum-core#80's contract), everything else is a
 * plain failure with the server's message. */
export function classifyPrepareFailure(error: unknown): ClassifiedFailure {
  const code = apiErrorCode(error);
  const message = error instanceof Error ? error.message : '';
  if (code === 'WALLET_NOT_LINKED' || (error instanceof ApiError && error.status === 409 && /wallet/i.test(message))) {
    return {
      kind: 'wallet_not_linked',
      reason: 'docforum-core has no verified wallet linked to your account, so it cannot prepare a transaction yet.',
    };
  }
  if (code === 'PREPARED_TRANSACTION_EXPIRED' || (error instanceof ApiError && error.status === 410) || /expired/i.test(message)) {
    return { kind: 'expired', reason: EXPIRED_COPY };
  }
  return { kind: 'error', reason: message || 'The transaction could not be prepared. Try again in a moment.' };
}

/** Submit failed: an expired/ superseded preparation is a normal outcome the
 * UI must offer to re-prepare; anything else is a failure to show verbatim. */
export function classifySubmitFailure(error: unknown): { kind: 'expired' | 'error'; reason: string } {
  const code = apiErrorCode(error);
  const message = error instanceof Error ? error.message : '';
  if (code === 'PREPARED_TRANSACTION_EXPIRED' || code === 'TRANSACTION_EXPIRED' || (error instanceof ApiError && error.status === 410) || /expired/i.test(message)) {
    return { kind: 'expired', reason: EXPIRED_COPY };
  }
  return { kind: 'error', reason: message || 'The signed transaction could not be submitted.' };
}

/** Signing failed: a refusal is `declined` (neutral), a locally-expired
 * preparation is `expired`, anything else is a failure. */
export function classifySignFailure(error: unknown): { kind: 'declined' | 'expired' | 'error'; reason: string } {
  if (isWalletDecline(error)) {
    return { kind: 'declined', reason: '' };
  }
  const message = error instanceof Error ? error.message : '';
  if (/expired/i.test(message)) return { kind: 'expired', reason: EXPIRED_COPY };
  return { kind: 'error', reason: message || 'Your wallet could not sign this transaction.' };
}

/** Stepper position: 0 prepare, 1 wallet, 2 submit, 3 confirm. Terminal
 * states map to the step that produced them so the UI marks where it stopped. */
export function stepperIndex(phase: WalletPayPhase): number {
  switch (phase) {
    case 'idle':
    case 'preparing':
    case 'wallet_unavailable':
    case 'wallet_not_linked':
      return 0;
    case 'awaiting_wallet':
    case 'declined':
      return 1;
    case 'submitting':
      return 2;
    case 'confirming':
    case 'confirmed':
      return 3;
    case 'expired':
    case 'failed':
      return 2;
    default:
      return 0;
  }
}
