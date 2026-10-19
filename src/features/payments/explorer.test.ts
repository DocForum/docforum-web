import { describe, expect, it } from 'vitest';
import { accountExplorerUrl, txExplorerUrl } from './explorer';

describe('txExplorerUrl', () => {
  it('builds a testnet transaction link', () => {
    expect(txExplorerUrl('abc123')).toBe(
      'https://stellar.expert/explorer/testnet/tx/abc123',
    );
  });

  it('returns null when there is no hash to link', () => {
    expect(txExplorerUrl(null)).toBeNull();
    expect(txExplorerUrl(undefined)).toBeNull();
    expect(txExplorerUrl('   ')).toBeNull();
  });
});

describe('accountExplorerUrl', () => {
  it('builds a testnet account link', () => {
    expect(accountExplorerUrl('GDEMOKEY')).toBe(
      'https://stellar.expert/explorer/testnet/account/GDEMOKEY',
    );
  });

  it('returns null when there is no key to link', () => {
    expect(accountExplorerUrl(null)).toBeNull();
    expect(accountExplorerUrl('')).toBeNull();
  });
});
