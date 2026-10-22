// Feature flag for pay-with-wallet (issue #59).
//
// ADR 0005 calls patient-wallet payment "an option, not the default", so the
// flow is flagged **off by default**: the button and its panel render only
// when `VITE_PAY_WITH_WALLET=true` is set at build time (local dev, or a
// preview build that deliberately stages the option). A build without the
// variable — including the GitHub Pages preview — ships without any way to
// reach the flow, which is what "default off" means for a frontend flag
// until docforum-core's real flag service (core#132) lands.
//
// Pure function for tests; the const is what components read.
export function isWalletPayEnabled(raw: string | undefined): boolean {
  return raw === 'true';
}

export const walletPayEnabled: boolean = isWalletPayEnabled(import.meta.env.VITE_PAY_WITH_WALLET);
