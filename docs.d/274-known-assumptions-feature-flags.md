### Feature flags console against `/admin/feature-flags` (issue #274)

- **List endpoint:** `GET /admin/feature-flags` — returns an unpaginated array of `FeatureFlag` items in the current environment. There are typically dozens of flags, not thousands. Each flag has `key`, `description`, `enabled`, `kind` (`boolean` or `percentage`), `rolloutPercentage` (optional), and `targeting` (`roles: Role[]`, `userIds: string[]`).

- **Update endpoint:** `PATCH /admin/feature-flags/:key` — partial update with `{ expectedUpdatedAt, enabled?, rolloutPercentage?, targeting? }`. The `:key` path parameter is validated by the backend as a lowercase dotted segment of up to 64 characters; a `400` is returned for malformed keys (e.g. uppercase, spaces, exceeding 64 chars). The `expectedUpdatedAt` field enables conflict detection: if the flag has been modified since the admin loaded it, the server returns `409`.

- **Key format:** New keys must conform to the pattern `lowercase.dotted.segments` with a maximum of 64 characters total. The UI validates this on save and shows a `400` error message if the key is invalid. Existing keys are preserved; only the admin can create new keys via the edit dialog.

- **Audit trail:** Every save creates an audit event with `entityType: 'FeatureFlag'` and `action: 'feature_flag.updated'`. The `updatedAt` timestamp and `actorUserId`/`actorRole` are stored. The console shows "Changed X ago by Y" per flag and provides a "View in audit trail" link to `/admin/audit?entityType=FeatureFlag&entityId=<flagKey>`.

- **State & rollout:** Three states: `on` (enabled, rolloutPercentage = 100 or absent), `rollout` (enabled, rolloutPercentage < 100), `off` (enabled = false). The rollout percentage must be a whole number 0–100. Role targeting is a multi-select; the allowlist is a free‑form list of user UUIDs (one per line, comma-, or space-separated). Duplicate or invalid UUIDs are rejected before the save request is sent.

- **Conflict handling:** If another admin saves the same flag between the time the current admin opens the edit dialog and confirms, the save receives `409`. The UI shows "was changed by someone else after you opened it" and offers "Start again from the latest" to refetch the flag and reset the draft. The save is not silently applied; only the flag that failed is rolled back, never another in-flight save.

- **Permission model:** Admin accounts are seeded/invited (PRD OQ-2), not self-registered. The console is only accessible to users with the `admin` role.