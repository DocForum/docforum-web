// --- Phase W7 — Evaluated feature flags for the signed-in user (issue #111) --
// Assumed shape pending docforum-core#132: `GET /me/flags` returns the
// server-evaluated boolean for every flag that applies to this user. The
// frontend never evaluates rollout rules itself. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W7".

export interface EvaluatedFlags {
  /** Flag key → evaluated boolean. Unknown keys are ignored by typed UI. */
  flags: Record<string, boolean>;
  /** When docforum-core evaluated the flags, if it reports it. */
  evaluatedAt?: string | null;
}
