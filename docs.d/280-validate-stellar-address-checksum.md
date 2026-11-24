---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W5 — Pay with wallet (issue #59)
---
### Wallet link address validation (issue #280)

`WalletLinkForm` validates the payout address offline before POSTing it:
StrKey base32 decoding plus the CRC16-XModem checksum embedded in every
Stellar address, implemented in `src/features/payments/strkey.ts` with no
Stellar SDK and no network call. Muxed (`M...`) addresses are rejected — only
ed25519 `G...` keys are accepted for payouts. Lowercase input is rejected
with a hint rather than silently uppercased, and surrounding whitespace is
trimmed. docforum-core remains the authority and re-validates the key.