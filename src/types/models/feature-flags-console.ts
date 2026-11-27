// --- Phase W6 — Feature flags console (issue #74) -----------------------------
// Assumed: docforum-core#132 (DB-backed feature flags) hasn't landed. The shape
// follows what #132 asks for — boolean and percentage flags, targeting by role
// or user-id allowlist, admin list/toggle endpoints with every change written
// as an audit event. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

export type FeatureFlagKind = 'boolean' | 'percentage';
