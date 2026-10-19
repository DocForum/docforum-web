# ARCHITECTURE_ESSENTIALS.md — docforum-web

Frontend-only quick reference. Full product/system architecture lives in
`docforum-core`'s `ARCHITECTURE.md` and `ARCHITECTURE_ESSENTIALS.md` — read
those first if you're new to the org, not just this file.

## Stack

- React + TypeScript + Vite
- React Query for server state, Zustand for client-only UI state
- No localStorage/sessionStorage for anything server-derived — treat
  `docforum-core`'s API as the source of truth, always refetch/cache via
  React Query rather than hand-rolling persistence.

## Hard rules

1. **This repo never calls `docforum-escrow` or Stellar directly.** Wallet
   linking, payment status, escrow state — all of it comes from
   `docforum-core`'s API.
2. Mirror `docforum-core`'s data model shapes in `src/types/models.ts` —
   don't invent parallel frontend-only shapes for the same entities.
3. Structure: `pages/ components/ features/ hooks/ services/ store/ types/`
   — keep this shape.

## Where things live

- `src/services/` — API calls to `docforum-core`. `api-client.ts` is the only
  place fetch/base-URL/credentials/auth/error-envelope details live.
- `src/mocks/` — MSW mock API for `npm run dev:mock`. It is loaded only behind
  the development guard in `main.tsx`; CI checks that mock code is absent from
  production bundles.
- `src/features/` — flow-specific logic.
- `src/pages/` — route-level components.
- `src/store/` — Zustand stores. Auth and acting-for state are in memory.

## Deployment

- GitHub Pages deploys on every push to `main`.
- The router is `HashRouter`, which keeps deep links refreshable on Pages.
- `vite.config.ts` uses the Pages base path only when `GITHUB_PAGES=true`.

## Known gaps against the real API

`docforum-core`'s published API documentation remains authoritative. The
refresh cookie is sent with `credentials: 'include'`, but the app still does
not restore a session on a full page reload; this remains tracked as issue #9.

## Generated contract

All API routes covered by this repository's typed client are declared in
`packages/api-client/openapi/docforum-core.openapi.yaml`. The generated
`@docforum/api-client` package owns the paths, request payloads, response
schemas, error envelope shape, and BigInt-as-string payment fields. Run
`npm run generate:api` after changing the fixture; `npm run typecheck` and
`npm run build` run generation automatically.

The following contracts are generated and are no longer frontend assumptions:

- W2 dependents, health profile, data export, account deletion, care threads,
  and facility finder.
- W3 queue, messaging, consultation notes, and practice insights.
- W4 facility members, invitations, and fulfillment attribution.
- W5 custodial payment intents and wallet-link operations.

`src/types/models.ts` re-exports generated schema types for compatibility with
existing imports. Services call the generated client through
`src/services/api-client.ts`, which remains the only owner of transport details
and typed errors.

## Known assumptions

- Acting-for profile selection is frontend-only Zustand state. The selected
  patient profile id is included in patient query keys and API calls.
- The local OpenAPI fixture is vendored until docforum-core publishes the
  versioned package described by docforum-core#113. CI compares its version
  with the backend's published spec in warn-only mode.
- Error code meanings are sourced from docforum-core#115. Unknown codes use a
  generic localized message and request-id reference; raw server messages are
  retained only for diagnostics.
- W4 scan-to-verify and payout-ledger routes, plus W6 admin audit/access,
  referral, system-health, and feature-flag routes, still have compatibility
  types until their backend OpenAPI schemas are published. Their assumptions
  are isolated in `src/types/models.ts` and the relevant service modules.
- Theme preferences are stored under `docforum-theme` in local storage and
  fall back to system media queries when unset.

## Privacy and platform guarantees

- `src/pwa/sw.ts` precaches only the app shell and static assets. It has no
  runtime API caching route, so authenticated API responses never enter the
  service-worker cache.
- Logout clears app-owned caches while preserving static precache entries.
- Facility-search location is transient browser memory only and is never
  persisted to storage or URLs.

## Roadmap / status

See `ROADMAP.md` in this repo, and Phase 7 in docforum-core's `ROADMAP.md` for
the original frontend phase this was carved out of.
