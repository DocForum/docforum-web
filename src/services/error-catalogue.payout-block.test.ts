import { describe, expect, it } from 'vitest';
import { ApiError } from './api-client';
import {
  FACILITY_WALLET_NOT_LINKED,
  PAYEE_TRUSTLINE_MISSING,
  PAYOUT_BLOCK_CODES,
  describeError,
  getPayoutBlockCode,
  isPayoutBlockCode,
} from './error-catalogue';

describe('payout-block codes (issue #279)', () => {
  it('recognises FACILITY_WALLET_NOT_LINKED from the typed error code', () => {
    const error = new ApiError('payouts are blocked', 400, undefined, {
      code: FACILITY_WALLET_NOT_LINKED,
    });

    expect(getPayoutBlockCode(error)).toBe(FACILITY_WALLET_NOT_LINKED);
  });

  it('recognises PAYEE_TRUSTLINE_MISSING, including from a raw body code', () => {
    const typed = new ApiError('payouts are blocked', 400, undefined, {
      code: PAYEE_TRUSTLINE_MISSING,
    });
    const bodyOnly = new ApiError('payouts are blocked', 400, { code: PAYEE_TRUSTLINE_MISSING });

    expect(getPayoutBlockCode(typed)).toBe(PAYEE_TRUSTLINE_MISSING);
    expect(getPayoutBlockCode(bodyOnly)).toBe(PAYEE_TRUSTLINE_MISSING);
  });

  it('ignores unrelated codes, non-API errors and code-like message text', () => {
    expect(getPayoutBlockCode(new ApiError('conflict', 409, undefined, { code: 'SLOT_TAKEN' }))).toBeNull();
    expect(getPayoutBlockCode(new Error(`boom ${FACILITY_WALLET_NOT_LINKED}`))).toBeNull();
    expect(getPayoutBlockCode(undefined)).toBeNull();
    expect(isPayoutBlockCode('SOMETHING_ELSE')).toBe(false);
    expect(isPayoutBlockCode(null)).toBe(false);
  });

  it('explains both codes in the shared catalogue and exports them for the banner', () => {
    const wallet = describeError(
      new ApiError('blocked', 400, undefined, { code: FACILITY_WALLET_NOT_LINKED }),
    );
    const trustline = describeError(
      new ApiError('blocked', 400, undefined, { code: PAYEE_TRUSTLINE_MISSING }),
    );

    expect(wallet.messageId).toBe('errors.facilityWalletNotLinked');
    expect(wallet.defaultMessage).toMatch(/no payout wallet linked/i);
    expect(trustline.messageId).toBe('errors.payeeTrustlineMissing');
    expect(trustline.defaultMessage).toMatch(/cannot hold this payment type/i);
    expect([...PAYOUT_BLOCK_CODES]).toEqual([FACILITY_WALLET_NOT_LINKED, PAYEE_TRUSTLINE_MISSING]);
  });
});
