Phase W5 pay with wallet ([issue #59](https://github.com/DocForum/docforum-web/issues/59)) and Phase W6 doctor
verification review queue ([issue #64](https://github.com/DocForum/docforum-web/issues/64)).
Pay with wallet: prepare (docforum-core) → sign (patient's wallet) → submit (docforum-core) → poll, as a stepper
on the order card behind a default-off `VITE_PAY_WITH_WALLET` flag; expired prepared transactions re-prepare in
one tap without losing the patient's place, wallet refusals land back at the start without error styling, and the
browser never builds/simulates/submits anything (Stellar boundary check green). New `wallet.ts` bridge
(injected-extension detection only), pure `wallet-pay.ts` reducer, `usePayWithWallet` poll, MSW
prepare/submit/order-intents handlers.
Verification queue: `/admin/verifications` pending queue (oldest first, submitted date, document count, 3-day/week
age escalation) and `/admin/verifications/:doctorProfileId` detail with credential documents opened only via
per-click short-lived signed URLs, decision history from the real audit trail, and approve/reject dialogs
requiring a 10–500 character reason with `expectedUpdatedAt` conflict handling (`409`/`404` close and reload,
`400`/`422` stay open). Decisions call the real `PATCH /doctors/:id/verification`; admin nav and dashboard link to
it; MSW fixtures/handlers cover queue, detail, documents, decisions and audit history.
Assumed contracts (core#80/#81 prepare/submit; queue/detail/signed-url endpoints, credential storage core#52)
recorded in `ARCHITECTURE_ESSENTIALS.md`.
