import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-client';
import {
  classifyPrepareFailure,
  classifySignFailure,
  classifySubmitFailure,
  initialWalletPayState,
  isBusyPhase,
  isPreparedExpired,
  stepperIndex,
  walletPayReducer,
  type WalletPayState,
} from './wallet-pay';

function run(...events: Parameters<typeof walletPayReducer>[1][]): WalletPayState {
  return events.reduce(walletPayReducer, initialWalletPayState());
}

describe('walletPayReducer — success path', () => {
  it('walks prepare → sign → submit → confirm', () => {
    let state = run({ type: 'START' });
    expect(state.phase).toBe('preparing');

    state = walletPayReducer(state, { type: 'PREPARED', xdr: 'UNSIGNED', expiresAt: '2100-01-01T00:00:00Z' });
    expect(state.phase).toBe('awaiting_wallet');
    expect(state.xdr).toBe('UNSIGNED');

    state = walletPayReducer(state, { type: 'SIGNED', signedXdr: 'SIGNED' });
    expect(state.phase).toBe('submitting');
    expect(state.signedXdr).toBe('SIGNED');

    state = walletPayReducer(state, { type: 'SUBMITTED' });
    expect(state.phase).toBe('confirming');

    state = walletPayReducer(state, { type: 'CONFIRMED' });
    expect(state.phase).toBe('confirmed');
    expect(state.reason).toBeNull();
  });

  it('ignores out-of-order events instead of corrupting the flow', () => {
    const idle = initialWalletPayState();
    expect(walletPayReducer(idle, { type: 'CONFIRMED' })).toBe(idle);
    const preparing = run({ type: 'START' });
    expect(walletPayReducer(preparing, { type: 'SIGNED', signedXdr: 'x' })).toBe(preparing);
    const busy = run({ type: 'START' });
    expect(walletPayReducer(busy, { type: 'START' })).toBe(busy);
  });
});

describe('walletPayReducer — expiry is a normal outcome', () => {
  it('expired prepare lands on `expired` with the attempt cleared', () => {
    const state = run(
      { type: 'START' },
      { type: 'PREPARE_FAILED', kind: 'expired', reason: 'expired copy' },
    );
    expect(state.phase).toBe('expired');
    expect(state.reason).toBe('expired copy');
    expect(state.xdr).toBeNull();
  });

  it('expiry detected while waiting for the wallet lands on `expired`', () => {
    const state = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2020-01-01T00:00:00Z' },
      { type: 'SIGN_FAILED', kind: 'expired', reason: '' },
    );
    expect(state.phase).toBe('expired');
  });

  it('expiry after signing never reaches confirming', () => {
    const state = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2020-01-01T00:00:00Z' },
      { type: 'SIGNED', signedXdr: 'S' },
      { type: 'SUBMIT_FAILED', kind: 'expired', reason: '' },
    );
    expect(state.phase).toBe('expired');
  });

  it('re-preparing from `expired` starts a fresh attempt on the same panel', () => {
    const expired = run(
      { type: 'START' },
      { type: 'PREPARE_FAILED', kind: 'expired', reason: 'expired copy' },
    );
    const restarted = walletPayReducer(expired, { type: 'START' });
    expect(restarted.phase).toBe('preparing');
    expect(restarted.reason).toBeNull();
  });

  it('detects expiry from expiresAt', () => {
    expect(isPreparedExpired('2020-01-01T00:00:00Z')).toBe(true);
    expect(isPreparedExpired('2100-01-01T00:00:00Z')).toBe(false);
    expect(isPreparedExpired(null)).toBe(false);
    expect(isPreparedExpired('not-a-date')).toBe(false);
  });
});

describe('walletPayReducer — wallet refusal is not an error', () => {
  it('a decline lands on the neutral `declined` state without a reason', () => {
    const state = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2100-01-01T00:00:00Z' },
      { type: 'SIGN_FAILED', kind: 'declined', reason: '' },
    );
    expect(state.phase).toBe('declined');
    expect(state.reason).toBeNull();
    expect(state.xdr).toBeNull();
  });

  it('back to payment returns to idle', () => {
    const declined = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2100-01-01T00:00:00Z' },
      { type: 'SIGN_FAILED', kind: 'declined', reason: '' },
    );
    expect(walletPayReducer(declined, { type: 'RESET' }).phase).toBe('idle');
  });
});

describe('walletPayReducer — failures and confirmations', () => {
  it('a prepare failure keeps the server reason', () => {
    const state = run({ type: 'START' }, { type: 'PREPARE_FAILED', kind: 'error', reason: 'boom' });
    expect(state.phase).toBe('failed');
    expect(state.reason).toBe('boom');
  });

  it('a wallet without a link explains itself instead of failing opaquely', () => {
    const state = run({ type: 'START' }, { type: 'NO_WALLET' });
    expect(state.phase).toBe('wallet_unavailable');
    const notLinked = run({ type: 'START' }, { type: 'PREPARE_FAILED', kind: 'wallet_not_linked', reason: 'link' });
    expect(notLinked.phase).toBe('wallet_not_linked');
    expect(notLinked.reason).toBe('link');
  });

  it('a poll timeout says so instead of spinning forever', () => {
    const state = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2100-01-01T00:00:00Z' },
      { type: 'SIGNED', signedXdr: 'S' },
      { type: 'SUBMITTED' },
      { type: 'CONFIRM_TIMEOUT' },
    );
    expect(state.phase).toBe('failed');
    expect(state.reason).toMatch(/has not confirmed/i);
  });

  it('a confirmed state refuses later failures and vice versa', () => {
    const confirmed = run(
      { type: 'START' },
      { type: 'PREPARED', xdr: 'U', expiresAt: '2100-01-01T00:00:00Z' },
      { type: 'SIGNED', signedXdr: 'S' },
      { type: 'SUBMITTED' },
      { type: 'CONFIRMED' },
    );
    expect(walletPayReducer(confirmed, { type: 'NOT_CONFIRMED', reason: 'x' })).toBe(confirmed);
  });
});

describe('classify helpers', () => {
  it('names WALLET_NOT_LINKED from the error envelope', () => {
    const failure = classifyPrepareFailure(
      Object.assign(new ApiError('No wallet linked.', 409, { code: 'WALLET_NOT_LINKED' })),
    );
    expect(failure.kind).toBe('wallet_not_linked');
  });

  it('treats 410 as an expired preparation', () => {
    expect(classifyPrepareFailure(new ApiError('Gone', 410)).kind).toBe('expired');
    expect(classifySubmitFailure(new ApiError('prepared transaction expired', 400)).kind).toBe('expired');
  });

  it('keeps real submit failures as errors with their message', () => {
    const failure = classifySubmitFailure(new ApiError('Signature does not match the linked account.', 422));
    expect(failure.kind).toBe('error');
    expect(failure.reason).toMatch(/Signature does not match/);
  });

  it('classifies a wallet refusal as declined', () => {
    expect(classifySignFailure(new Error('User rejected the request')).kind).toBe('declined');
    expect(classifySignFailure(new Error('Vault locked')).kind).toBe('error');
  });
});

describe('phase helpers', () => {
  it('marks waiting phases busy and resting phases not', () => {
    expect(isBusyPhase('preparing')).toBe(true);
    expect(isBusyPhase('confirming')).toBe(true);
    expect(isBusyPhase('expired')).toBe(false);
    expect(isBusyPhase('declined')).toBe(false);
  });

  it('points the stepper at the step that produced a terminal state', () => {
    expect(stepperIndex('idle')).toBe(0);
    expect(stepperIndex('awaiting_wallet')).toBe(1);
    expect(stepperIndex('declined')).toBe(1);
    expect(stepperIndex('submitting')).toBe(2);
    expect(stepperIndex('expired')).toBe(2);
    expect(stepperIndex('confirming')).toBe(3);
    expect(stepperIndex('confirmed')).toBe(3);
  });
});
