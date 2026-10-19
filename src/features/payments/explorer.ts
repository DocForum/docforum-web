// Stellar testnet explorer links (issue #10). #10 is still open — this
// helper is its "helper", introduced here because issue #61 requires
// explorer links through it; the payout ledger was refactored onto the
// same function so every link in the app is built in one place.
//
// Testnet only: custodial v1 runs on Stellar testnet (docforum-core's
// docs/adr/0004-custodial-payments-v1.md). This repo never touches
// Stellar itself (hard rule 1) — these are plain links to a public
// explorer, not SDK calls.

const TESTNET_BASE = 'https://stellar.expert/explorer/testnet';

/** Explorer URL for a transaction hash, or null when there's no hash. */
export function txExplorerUrl(txHash: string | null | undefined): string | null {
  const hash = txHash?.trim();
  return hash ? `${TESTNET_BASE}/tx/${hash}` : null;
}

/** Explorer URL for a Stellar account (e.g. a facility's linked wallet). */
export function accountExplorerUrl(publicKey: string | null | undefined): string | null {
  const key = publicKey?.trim();
  return key ? `${TESTNET_BASE}/account/${key}` : null;
}
