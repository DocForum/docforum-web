// Stellar testnet explorer links — the single place the explorer base URL
// lives, so mainnet later is a one-line change (or a build-time env). This
// is a display-only helper: nothing here queries Stellar (hard rule 1); it
// only turns a hash/contract id core already returned into a link.

const EXPLORER_BASE_URL = import.meta.env.VITE_STELLAR_EXPLORER_BASE_URL ?? 'https://testnet.stellar.expert/explorer/public';

/** A hash core hasn't produced yet (null before funding) gets no link. */
export function transactionUrl(txHash: string | null | undefined): string | null {
  return txHash ? `${EXPLORER_BASE_URL}/transaction/${encodeURIComponent(txHash)}` : null;
}

export function contractUrl(contractId: string | null | undefined): string | null {
  return contractId ? `${EXPLORER_BASE_URL}/contract/${encodeURIComponent(contractId)}` : null;
}
