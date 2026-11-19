// --- Phase W6 — Per-specialty verification review (issue #65) ----------------
// Assumed shapes: docforum-core#51 (per-specialty credential verification,
// PRD §8.1.5) hasn't landed. #51 names the two admin endpoints but not
// their payloads; the credential attachment, the filter parameters and the
// specialty catalog are this repo's assumption. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".

/** The document a doctor attached to back one specialty claim. */
export interface SpecialtyClaimCredential {
  id: string;
  fileName: string;
  /** `application/pdf` and images today; anything else is offered as a
   * download rather than previewed. */
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}
