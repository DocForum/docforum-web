// --- Patient lab results (Phase W2, issue #24) -------------------------------
// ASSUMED contract against docforum-core#72 ("Abnormal lab result escalation
// and doctor acknowledgement tracking"), which has not landed. The
// frontend never decides whether a result is abnormal or whether a critical
// result is held — it renders the backend's `flag` and `hold` values
// verbatim. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — patient lab
// results" (docs.d/24-lab-results-viewer.md).

/** Severity as decided by the lab/backend. Never inferred client-side. */
export type LabResultFlag = 'normal' | 'abnormal' | 'critical';

/**
 * Lifecycle as reported by the backend:
 * - pending:   collected, no result yet (no file, no summary)
 * - held:      a result exists but is withheld until a doctor reviews it
 * - available: the patient may read it now
 * - reviewed:  available and a doctor has acknowledged it
 */
export type LabResultStatus = 'pending' | 'held' | 'available' | 'reviewed';

/** Doctor acknowledgement of a flagged result ("your doctor has been notified"). */
export type LabResultAcknowledgementStatus = 'not_required' | 'pending' | 'acknowledged';

export interface LabResultAcknowledgement {
  status: LabResultAcknowledgementStatus;
  /** ISO timestamp of the doctor's acknowledgement, when it happened. */
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  /** Plain-language next step supplied by the backend, rendered as text. */
  nextStep?: string | null;
}

/** One measured value, with the reference range the lab supplied. */
export interface LabResultValue {
  name: string;
  value: string;
  unit?: string | null;
  referenceRange?: string | null;
  flag: LabResultFlag;
}

export interface LabResultSummary {
  id: string;
  orderId: string;
  testName: string;
  facilityName: string;
  /** ISO timestamp the result was released by the lab. */
  resultedAt: string;
  status: LabResultStatus;
  flag: LabResultFlag;
  /** One or two sentence plain-language summary from the backend. */
  summary: string;
  requiresDoctorReview: boolean;
}

export interface LabResultFile {
  kind: 'pdf' | 'image';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /**
   * Path (relative to the API base) that the authenticated blob fetch reads.
   * The browser never constructs a third-party URL, and the bearer token
   * never lands in an href.
   */
  contentPath: string;
}

export interface LabResultDetail extends LabResultSummary {
  patientProfileId: string;
  doctorName?: string | null;
  orderedAt: string;
  values: LabResultValue[];
  acknowledgement: LabResultAcknowledgement;
  /** Null while the result is pending or held. */
  file: LabResultFile | null;
}
