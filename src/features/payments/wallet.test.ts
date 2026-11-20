import { describe, expect, it } from 'vitest';
import { detectWallet, isWalletDecline, type WalletBridge } from './wallet';

function scopeOf(...entries: Array<[string, unknown]>): Record<string, unknown> {
  return Object.fromEntries(entries);
}

describe('detectWallet', () => {
  it('returns null when the browser has no wallet extension', () => {
    expect(detectWallet({})).toBeNull();
    expect(detectWallet({ freighterApi: null })).toBeNull();
  });

  it('ignores an injected object that cannot sign', () => {
    expect(detectWallet(scopeOf(['freighterApi', { getAddress: () => Promise.resolve('GABC') }]))).toBeNull();
    expect(detectWallet(scopeOf(['freighterApi', 'not-an-object']))).toBeNull();
  });

  it('wraps a Freighter-shaped wallet and reads an object address', async () => {
    const wallet = detectWallet(
      scopeOf([
        'freighterApi',
        {
          getAddress: () => Promise.resolve({ address: 'GFREIGHTER' }),
          signTransaction: (xdr: string, options?: { address?: string }) => {
            expect(xdr).toBe('AAAA');
            expect(options?.address).toBe('GFREIGHTER');
            return Promise.resolve({ signedTxXdr: 'SIGNED' });
          },
        },
      ]),
    );
    expect(wallet).not.toBeNull();
    expect(wallet!.id).toBe('freighter');
    expect(await wallet!.getAddress()).toBe('GFREIGHTER');
    expect(await wallet!.signTransaction('AAAA')).toBe('SIGNED');
  });

  it('wraps the generic injected wallet shape with string results', async () => {
    const wallet = detectWallet(
      scopeOf([
        'stellarWallet',
        {
          getPublicKey: () => Promise.resolve('GGENERIC'),
          signTransaction: (xdr: string) => Promise.resolve(`signed:${xdr}`),
        },
      ]),
    );
    expect(wallet!.name).toBe('Your Stellar wallet');
    expect(await wallet!.getAddress()).toBe('GGENERIC');
    expect(await wallet!.signTransaction('X')).toBe('signed:X');
  });

  it('fails clearly when a wallet signs without returning anything usable', async () => {
    const wallet = detectWallet(
      scopeOf(['freighterApi', { getAddress: () => Promise.resolve('G1'), signTransaction: () => Promise.resolve({}) }]),
    );
    await expect(wallet!.signTransaction('X')).rejects.toThrow(/did not return/i);
  });
});

describe('isWalletDecline', () => {
  it('treats refusal wording as a normal decline', () => {
    expect(isWalletDecline(new Error('User rejected the request'))).toBe(true);
    expect(isWalletDecline('Access denied by user')).toBe(true);
    expect(isWalletDecline(new Error('Operation cancelled'))).toBe(true);
  });

  it('does not mistake a real failure for a decline', () => {
    expect(isWalletDecline(new Error('Network unreachable'))).toBe(false);
    expect(isWalletDecline(new Error('Transaction expired on chain'))).toBe(false);
    expect(isWalletDecline(undefined)).toBe(false);
  });
});

describe('bridge contract', () => {
  it('exposes exactly the two operations the flow uses', async () => {
    const wallet: WalletBridge = detectWallet(
      scopeOf(['freighterApi', { getAddress: () => Promise.resolve('G1'), signTransaction: () => Promise.resolve('S') }]),
    )!;
    expect(Object.keys(wallet).sort()).toEqual(['getAddress', 'id', 'name', 'signTransaction']);
  });
});
