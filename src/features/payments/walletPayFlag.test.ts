import { describe, expect, it } from 'vitest';
import { isWalletPayEnabled, walletPayEnabled } from './walletPayFlag';

describe('wallet pay feature flag (ADR 0005: option, not default)', () => {
  it('is off unless the build sets VITE_PAY_WITH_WALLET to exactly "true"', () => {
    expect(isWalletPayEnabled(undefined)).toBe(false);
    expect(isWalletPayEnabled('')).toBe(false);
    expect(isWalletPayEnabled('false')).toBe(false);
    expect(isWalletPayEnabled('1')).toBe(false);
    expect(isWalletPayEnabled('TRUE')).toBe(false);
    expect(isWalletPayEnabled('true')).toBe(true);
  });

  it('defaults off in this test/preview environment', () => {
    expect(walletPayEnabled).toBe(false);
  });
});
