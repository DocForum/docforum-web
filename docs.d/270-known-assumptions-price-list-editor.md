---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Price list editor against `/facilities/me/prices` (issue #270)

- **Endpoint shape:** Calls `GET /facilities/me/prices` and `POST /facilities/me/prices` — the `/me` variant resolves the facility from the authenticated user's session rather than accepting a `facilityId` parameter. The previous `/facilities/:facilityId/prices` shape is still supported for backward compatibility but the `/me` endpoint is the canonical path going forward.

- **Amount conversion:** Entered amounts are decimal strings (e.g. `"27.5"`). The `parseAssetAmount` helper in `src/features/facility-settings/validation.ts` converts these to raw stroops integers using `BigInt` arithmetic, respecting per-asset decimal precision (XLM and USDC both support 7 decimal places = 10_000_000 stroops per whole unit). Exponent notation (e.g. `1e-5`) and decimals beyond the asset's precision limit are rejected with a `400` error, matching the backend's validation.

- **Versioned writes:** Creating a price version via `POST` does not edit an existing record; it adds a new entry to the version history. The frontend presents history as three states: **current** (effective now), **scheduled** (effectiveFrom in the future), and **superseded** (older versions). A duplicate `effectiveFrom` returns `409` from the backend, which the UI handles by keeping the earlier snapshot and explaining the conflict.

- **Verified email requirement:** Write mutations (`createFacilityPrice`) require the user's email to be verified. If the session has an unverified email, the save is rejected with a clear error — the backend enforces this guard.

- **BigInt-safe throughout:** The shared `validation.ts` `parseAssetAmount` and `formatAmountFromStroops` functions use `BigInt` internally and never pass through `Number()`, preserving exact stroop values for all asset amounts.