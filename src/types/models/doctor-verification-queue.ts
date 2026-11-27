import type { VerificationStatus } from './session-idle-timeout';

// --- Phase W6 — Doctor verification review queue (issue #64) ----------------
// The queue and detail endpoints are assumed — docforum-core only serves
// `PATCH /doctors/:id/verification` today (real), and credential document
// storage is tracked in docforum-core#52. `VerificationStatus` and
// `DoctorProfile` are real.

/** One pending doctor in the review queue. */
export interface VerificationQueueItem {
  doctorProfileId: string;
  fullName: string;
  specialties: string[];
  /** When the doctor went in line for review (assumed: profile creation). */
  submittedAt: string;
  /** How many credential documents were submitted with the application. */
  documentCount: number;
  verificationStatus: VerificationStatus;
}

/** Credential document metadata — never the bytes, and never a durable URL:
 * documents are opened only through a fresh short-lived signed URL. */
export interface CredentialDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface VerificationDetail {
  profile: {
    id: string;
    fullName: string;
    /** null when the backend doesn't expose the applicant's email to admins. */
    email: string | null;
    verificationStatus: VerificationStatus;
    specialties: string[];
    submittedAt: string;
    createdAt: string;
    /** Sent so decisions can carry `expectedUpdatedAt` for conflict detection. */
    updatedAt: string;
  };
  documents: CredentialDocument[];
}

export interface VerificationDecisionInput {
  status: Exclude<VerificationStatus, 'pending'>;
  /** Required for both approve and reject — it lands in the audit trail. */
  reason: string;
  /** The `updatedAt` the admin saw — a 409 means another admin decided first. */
  expectedUpdatedAt: string;
}

/** One entry of the per-doctor decision history, projected from docforum-core's
 * real audit trail (`GET /admin/audit-events?entityType=DoctorProfile&entityId=`). */
export interface VerificationDecision {
  id: string;
  at: string;
  from: VerificationStatus | null;
  to: VerificationStatus;
  actorUserId: string | null;
}

/** One-time, short-lived URL for a credential document — minted per click,
 * held in component state only, never cached on the document row. */
export interface CredentialDocumentUrl {
  url: string;
  expiresAt: string;
}
