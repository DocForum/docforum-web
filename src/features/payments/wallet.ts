// The patient wallet bridge (issue #59).
//
// Hard rule 1 allows exactly one Stellar interaction in this repo: ask the
// user's wallet to sign an XDR that docforum-core prepared, and hand the
// signed XDR back. This module does only that — it never builds, simulates or
// submits a transaction, never holds a private key, and talks to no network
// (no SDK imports, no RPC/Horizon URLs — enforced by
// scripts/check-stellar-boundary.mjs).
//
// Wallet *connection/linking* (SEP-10, privacy notice) is deliberately not
// implemented here — see ARCHITECTURE_ESSENTIALS.md "Known assumptions"
// (issue #58, pending docforum-core#77/#78). What this does instead is the
// smallest default: detect an already-installed wallet extension and ask it
// to sign. The proper wallet-kit integration replaces this detection later
// without touching the flow around it.

export interface WalletBridge {
  readonly id: string;
  readonly name: string;
  /** The wallet's address — used only to tell the patient who is signing. */
  getAddress(): Promise<string>;
  /** Ask the wallet to sign the XDR docforum-core prepared; resolves with the
   * signed XDR, which goes straight back to docforum-core. */
  signTransaction(xdr: string): Promise<string>;
}

/** Loose shapes an injected wallet may expose. Wallet extensions differ in
 * naming and return types, so every access is duck-typed and optional. */
interface InjectedWalletApi {
  getAddress?: () => Promise<unknown>;
  getPublicKey?: () => Promise<unknown>;
  signTransaction?: (xdr: string, options?: { address?: string }) => Promise<unknown>;
}

interface Candidate {
  id: string;
  name: string;
  key: string;
}

/** Detected in order; `freighterApi` is Freighter's documented global. */
const CANDIDATES: Candidate[] = [
  { id: 'freighter', name: 'Freighter', key: 'freighterApi' },
  // Generic extension convention: an injected `window.stellarWallet` exposing
  // { getAddress | getPublicKey, signTransaction }. Assumed — documented in
  // ARCHITECTURE_ESSENTIALS.md alongside this issue's other assumptions.
  { id: 'injected', name: 'Your Stellar wallet', key: 'stellarWallet' },
];

function asAddress(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const field of ['address', 'publicKey'] as const) {
      const candidate = record[field];
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    }
  }
  return null;
}

function asSignedXdr(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const field of ['signedTxXdr', 'signedXdr'] as const) {
      const candidate = record[field];
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    }
  }
  return null;
}

function wrap(candidate: Candidate, api: InjectedWalletApi): WalletBridge {
  return {
    id: candidate.id,
    name: candidate.name,
    async getAddress(): Promise<string> {
      if (typeof api.getAddress === 'function') {
        const address = asAddress(await api.getAddress());
        if (address) return address;
      }
      if (typeof api.getPublicKey === 'function') {
        const address = asAddress(await api.getPublicKey());
        if (address) return address;
      }
      throw new Error(`${candidate.name} did not provide an address.`);
    },
    async signTransaction(xdr: string): Promise<string> {
      if (typeof api.signTransaction !== 'function') {
        throw new Error(`${candidate.name} cannot sign transactions.`);
      }
      // Older wallet builds accept only the XDR; newer ones require the
      // signer's address. Passing both keeps either working.
      let address: string | null = null;
      try {
        address = await this.getAddress();
      } catch {
        // Signing without a known address is still attempted — the wallet
        // itself knows who is signing, and docforum-core verifies the result.
      }
      const signed = asSignedXdr(await api.signTransaction(xdr, address ? { address } : undefined));
      if (!signed) throw new Error(`${candidate.name} did not return a signed transaction.`);
      return signed;
    },
  };
}

/**
 * First detectable wallet in `scope`, or null when the browser has none
 * (the UI treats that as a normal, explanatory state — not an error).
 */
export function detectWallet(scope: Record<string, unknown> = globalThis as Record<string, unknown>): WalletBridge | null {
  for (const candidate of CANDIDATES) {
    const api = scope[candidate.key];
    if (typeof api !== 'object' || api === null) continue;
    const injected = api as InjectedWalletApi;
    if (typeof injected.signTransaction !== 'function') continue;
    return wrap(candidate, injected);
  }
  return null;
}

/** A wallet declining to sign is a normal outcome, not a failure — this is
 * the one heuristic the flow needs: any thrown value whose message reads as
 * a user refusal. */
export function isWalletDecline(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /reject|declin|denied|refus|cancel|abort/i.test(message);
}
