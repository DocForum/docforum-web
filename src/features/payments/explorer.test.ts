import { describe, expect, it } from 'vitest';
import { contractUrl, transactionUrl } from './explorer';

describe('explorer links', () => {
  it('links a hash core returned', () => {
    expect(transactionUrl('5c2f4bHash')).toBe(
      'https://testnet.stellar.expert/explorer/public/transaction/5c2f4bHash',
    );
    expect(contractUrl('CONTRACTID')).toBe('https://testnet.stellar.expert/explorer/public/contract/CONTRACTID');
  });

  // A payment that has not been funded has no hash yet — linking to
  // `/transaction/null` would look like a real, broken transaction.
  it('produces no link for a null hash', () => {
    expect(transactionUrl(null)).toBeNull();
    expect(transactionUrl(undefined)).toBeNull();
    expect(contractUrl(null)).toBeNull();
  });
});
