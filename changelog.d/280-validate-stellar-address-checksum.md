Phase W5: validate the Stellar address checksum before linking a payout wallet
([issue #280](https://github.com/DocForum/docforum-web/issues/280)).
`WalletLinkForm` now rejects payout addresses whose StrKey CRC16-XModem
checksum fails (offline base32 + CRC16-XModem in
`src/features/payments/strkey.ts`, no Stellar SDK) with "This address has a
typo", before anything is sent to docforum-core. Muxed (`M...`) addresses
are rejected, lowercase input is rejected with a hint instead of being
uppercased, and the server remains the authority.