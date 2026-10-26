# @docforum/api-client

Generated schema types plus a thin, typed client for `docforum-core`'s HTTP
API. This is the package `docforum-web`'s `src/services/` layer talks to —
no service constructs URLs or response types by hand.

## Why this lives here (for now)

`docforum-core#113` tracks publishing this as a versioned release tarball
generated from the backend's `openapi.json`. Until that lands, the package
is vendored as an npm workspace (`packages/api-client`) so the frontend can
adopt the generated-client contract now, rather than hand-copying backend
shapes in `src/types/models.ts`.

When the published tarball exists, replace the workspace dependency in the
root `package.json` with the release URL — the public surface
(`createApiClient`, `Schemas`, `paths`) is designed to stay the same.

## Layout

```
openapi/docforum-core.openapi.yaml   contract fixture — the only hand-maintained API description
scripts/generate.mjs                 spec → src/generated/schema.ts
scripts/check-version.mjs            installed version vs live backend spec (warn-only)
src/generated/schema.ts              GENERATED — never edit
src/client.ts                        typed client bound to a transport
```

## Regenerating

```bash
npm run generate:api
```

`pretypecheck` and `prebuild` run this automatically, so editing the
fixture and running `npm run typecheck` is enough to see contract changes
as compile errors where the affected field is used.

`info.version` in the fixture and `version` in `package.json` must match —
the generator refuses to run otherwise, so a release can't claim a contract
version it wasn't generated from.

## Transport ownership

This package never decides the base URL, credentials mode, auth headers, or
how error envelopes are parsed. `docforum-web`'s `src/services/api-client.ts`
implements `ApiTransport` and owns those details (see
`ARCHITECTURE_ESSENTIALS.md`); this package only encodes paths and shapes.

## BigInt fields

`PaymentIntent.amountStroops` is a string in the spec on purpose — Stellar
amounts are 64-bit integers and `amountStroops` must never round-trip
through a JS `number`. Keep the string in the UI layer, same as before this
package existed.
